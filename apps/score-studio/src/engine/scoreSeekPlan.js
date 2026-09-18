import { sortScore } from '@awb/score';
import {
  instrumentEnvelopes, instrumentNoteLifecycle, instrumentType, typeForSynthDef
} from '@awb/instruments';
import { expandScEventParams } from './scEventSemantics.js';

const COMMAND_KEYS = new Set( [ 'type', 'target', 'delta' ] );

function instrumentFor( definition ) {
  return typeForSynthDef( definition ) ?? ( instrumentType( definition )
    ? { key: definition }
    : null );
}

function targetsFor( target, active, byID ) {
  const requested = Array.isArray( target ) ? target : [ target ?? '@prev' ];
  const result = [];
  for ( const value of requested ) {
    if ( value === '@all' ) active.forEach( ( note ) => result.push( note ) );
    else if ( value === '@prev' ) {
      if ( active.length ) result.push( active.at( -1 ) );
    } else {
      const note = byID.get( String( value ) );
      if ( note?.active ) result.push( note );
    }
  }
  return [ ...new Set( result ) ];
}

function applySet( note, event ) {
  const controls = Object.entries( event ).filter( ( [ key ] ) => !COMMAND_KEYS.has( key ) );
  note.voices.forEach( ( voice, index ) => {
    for ( const [ key, value ] of controls ) {
      voice.params[ key ] = Array.isArray( value ) ? value[ index % value.length ] : value;
    }
  } );
}

function releaseVoice( voice, time, instrument ) {
  if ( voice.released ) return;
  const envelope = instrument ? instrumentEnvelopes( instrument.key, voice.params )
    .find( ( item ) => item.completionAction === 'freeNode' ) : null;
  voice.released = true;
  voice.releaseTime = time;
  voice.release = envelope?.release ?? null;
  voice.endTime = voice.release === null ? null : time + voice.release;
  voice.releaseControl = envelope?.releaseControl ?? null;
}

function advanceTo( notes, time ) {
  for ( const note of notes ) {
    for ( const voice of note.voices ) {
      if ( !voice.released && voice.gateTime !== null && voice.gateTime <= time ) {
        releaseVoice( voice, voice.gateTime, note.instrument );
      }
      if ( voice.endTime !== null && voice.endTime <= time ) voice.ended = true;
    }
    note.active = note.voices.some( ( voice ) => !voice.ended );
  }
}

function reconstructionFor( note, voice, voiceIndex, target ) {
  if ( voice.ended ) return null;
  const event = { ...voice.params, type: 'note', def: note.definition };
  const approximations = [];
  let phase;
  let remainingGate = null;
  let remainingRelease = null;

  if ( voice.released ) {
    if ( voice.endTime === null || !voice.releaseControl ) return null;
    phase = 'release';
    remainingRelease = Math.max( 0, voice.endTime - target );
    event[ voice.releaseControl ] = remainingRelease;
    event.dur = Math.max( remainingRelease, 0.001 );
    event.sustain = 0;
    approximations.push( 'release envelope restarts with its remaining lifetime' );
  } else {
    phase = 'sustain';
    if ( voice.gateTime !== null ) {
      remainingGate = Math.max( 0, voice.gateTime - target );
      event.sustain = remainingGate;
    } else event.dur = 'inf';
    approximations.push( 'attack and oscillator phase restart at the seek point' );
  }

  return Object.freeze( {
    entryID: note.entry.id,
    sourceTime: note.entry.time,
    voiceIndex,
    quality: 'lifecycleCorrect',
    phase,
    remainingGate,
    remainingRelease,
    approximations: Object.freeze( approximations ),
    event: Object.freeze( event )
  } );
}

export function buildSeekReconstructionPlan( document, targetTime ) {
  const target = Math.max( 0, Number( targetTime ) || 0 );
  const entries = sortScore( document.entries );
  const notes = [];
  const active = [];
  const byID = new Map();
  const skipped = [];

  for ( const entry of entries ) {
    if ( entry.time >= target ) break;
    advanceTo( active, entry.time );
    for ( let index = active.length - 1; index >= 0; index -= 1 ) {
      if ( !active[ index ].active ) active.splice( index, 1 );
    }
    const event = entry.event ?? {};
    if ( event.type === 'note' ) {
      const definition = event.def ?? event.instrument;
      const instrument = instrumentFor( definition );
      let expanded;
      try { expanded = expandScEventParams( event ); }
      catch ( error ) {
        skipped.push( Object.freeze( { entryID: entry.id, reason: error.message } ) );
        continue;
      }
      const voices = expanded.map( ( params ) => {
        const merged = { ...event, ...params };
        const lifecycle = event.dur === 'inf' ? null
          : instrument ? instrumentNoteLifecycle( instrument.key, merged ) : null;
        return {
          params: merged,
          gateTime: event.dur === 'inf' ? null
            : lifecycle ? entry.time + lifecycle.gateDuration : null,
          released: false, releaseTime: null, release: null, releaseControl: null,
          endTime: null, ended: false
        };
      } );
      const note = { entry, definition, instrument, voices, active: true };
      notes.push( note ); active.push( note ); byID.set( entry.id, note );
    } else if ( [ 'set', 'release', 'free' ].includes( event.type ) ) {
      const targets = targetsFor( event.target, active, byID );
      if ( event.type === 'set' ) targets.forEach( ( note ) => applySet( note, event ) );
      else if ( event.type === 'release' ) targets.forEach( ( note ) => note.voices
        .forEach( ( voice ) => releaseVoice( voice, entry.time, note.instrument ) ) );
      else targets.forEach( ( note ) => {
        note.voices.forEach( ( voice ) => { voice.ended = true; } );
        note.active = false;
      } );
    }
  }
  advanceTo( active, target );

  const reconstructions = [];
  for ( const note of notes ) {
    if ( !note.active ) continue;
    note.voices.forEach( ( voice, voiceIndex ) => {
      if ( note.entry.event.dur !== 'inf' && !voice.released && voice.gateTime === null ) {
        skipped.push( Object.freeze( {
          entryID: note.entry.id, voiceIndex, reason: 'unknown instrument lifecycle'
        } ) );
        return;
      }
      const reconstruction = reconstructionFor( note, voice, voiceIndex, target );
      if ( reconstruction ) reconstructions.push( reconstruction );
      else if ( !voice.ended ) skipped.push( Object.freeze( {
        entryID: note.entry.id, voiceIndex, reason: voice.released
          ? 'release tail cannot be reconstructed safely'
          : 'note lifetime cannot be reconstructed safely'
      } ) );
    } );
  }

  return Object.freeze( {
    version: 1,
    scoreID: document.scoreID,
    revision: document.revision,
    target,
    reconstructions: Object.freeze( reconstructions ),
    skipped: Object.freeze( skipped ),
    futureEntryIDs: Object.freeze( entries.filter( ( entry ) => entry.time >= target ).map( ( entry ) => entry.id ) )
  } );
}
