import { useCallback, useEffect, useRef, useState } from 'react';
import { instrumentType } from '@awb/instruments';
import { scaleFrequencies } from './engine/instrumentState.js';

const RESERVED_CONTROLS = new Set( [ 'out', 'gate' ] );

// Reconcile the authored Field instruments with synths owned by this Field ToolSession. The
// protocol remains semantic (instrument ID + controls); sclang owns lifecycle and NodeManager
// association, while the renderer reads this small live projection.
export function useHostedInstrumentVoices( {
  client, runtime, instruments, enabled, dispatch, timeFactor = 1
} ) {
  const voicesRef = useRef( new Map() );
  const sentRef = useRef( new Map() );
  const busyRef = useRef( false );
  const dirtyRef = useRef( false );
  const [ pass, setPass ] = useState( 0 );

  const controlsFor = useCallback( ( instrument, anySolo ) => {
    const descriptor = instrumentType( instrument.type );
    const scaled = scaleFrequencies( instrument.type, instrument.params, timeFactor );
    const controls = {};
    for ( const [ name, value ] of Object.entries( scaled ) ) {
      if ( RESERVED_CONTROLS.has( name ) || !( typeof value === 'number' || typeof value === 'boolean' ) ) continue;
      controls[ name ] = value;
    }
    const audible = !instrument.mute && ( !anySolo || instrument.solo );
    const gain = ( instrument.amp ?? 1 ) * ( audible ? 1 : 0 );
    if ( descriptor?.gainControl ) controls[ descriptor.gainControl ] = gain;
    else controls.amp = gain * ( typeof controls.amp === 'number' ? controls.amp : 1 );
    return controls;
  }, [ timeFactor ] );

  useEffect( () => {
    const live = runtime.liveInstruments ?? {};
    const now = performance.now() / 1000;
    const known = new Set( instruments.map( ( instrument ) => instrument.id ) );
    for ( const instrument of instruments ) {
      const remote = live[ instrument.id ]; const previous = voicesRef.current.get( instrument.id );
      if ( !remote ) {
        voicesRef.current.delete( instrument.id );
        if ( previous && [ 'connected', 'observing' ].includes( runtime.status )
          && instrument.playing !== false ) {
          dispatch?.( { type: 'SET_INSTRUMENT_PLAYING', id: instrument.id, playing: false } );
        }
        continue;
      }
      voicesRef.current.set( instrument.id, {
        nodeId: remote.nodeID,
        startedAt: previous?.nodeId === remote.nodeID ? previous.startedAt : now,
        releasedAt: remote.state === 'releasing' ? ( previous?.releasedAt ?? now ) : null
      } );
    }
    for ( const id of voicesRef.current.keys() ) if ( !known.has( id ) ) voicesRef.current.delete( id );
  }, [ dispatch, instruments, runtime.liveInstruments, runtime.status ] );

  useEffect( () => {
    if ( !enabled || ![ 'connected', 'observing' ].includes( runtime.status ) ) return;
    const reconcile = async () => {
      if ( busyRef.current ) { dirtyRef.current = true; return; }
      busyRef.current = true;
      try {
        const live = runtime.liveInstruments ?? {};
        const anySolo = instruments.some( ( instrument ) => instrument.solo && !instrument.mute );
        const currentIDs = new Set( instruments.map( ( instrument ) => instrument.id ) );
        for ( const instrument of instruments ) {
          const descriptor = instrumentType( instrument.type );
          if ( !descriptor?.synthDef ) continue;
          const remote = live[ instrument.id ]; const shouldRun = instrument.playing !== false;
          if ( !shouldRun && !remote ) sentRef.current.delete( instrument.id );
          if ( shouldRun && remote?.state === 'releasing' ) {
            await client.instrumentCommand( 'free', instrument.id );
            sentRef.current.delete( instrument.id );
          }
          if ( shouldRun && ( ( !remote && !sentRef.current.has( instrument.id ) )
            || remote?.state === 'releasing' ) ) {
            const controls = controlsFor( instrument, anySolo );
            await client.instrumentCommand( 'start', instrument.id, descriptor.synthDef, controls );
            sentRef.current.set( instrument.id, controls );
          } else if ( !shouldRun && remote && remote.state !== 'releasing' ) {
            await client.instrumentCommand( 'release', instrument.id );
          } else if ( shouldRun && remote && remote.state !== 'releasing' ) {
            const controls = controlsFor( instrument, anySolo ); const sent = sentRef.current.get( instrument.id ) ?? {};
            const changed = Object.fromEntries( Object.entries( controls ).filter( ( [ name, value ] ) => sent[ name ] !== value ) );
            if ( Object.keys( changed ).length ) await client.instrumentCommand( 'set', instrument.id, descriptor.synthDef, changed );
            sentRef.current.set( instrument.id, controls );
          }
        }
        for ( const id of Object.keys( live ) ) {
          if ( currentIDs.has( id ) ) continue;
          await client.instrumentCommand( 'free', id ); sentRef.current.delete( id );
        }
      } catch ( error ) {
        console.error( 'hosted Field instruments:', error );
      } finally {
        busyRef.current = false;
        if ( dirtyRef.current ) { dirtyRef.current = false; setPass( ( value ) => value + 1 ); }
      }
    };
    reconcile();
  }, [ client, controlsFor, enabled, instruments, pass, runtime.liveInstruments, runtime.status ] );

  useEffect( () => {
    if ( enabled ) return;
    voicesRef.current.clear(); sentRef.current.clear();
  }, [ enabled ] );

  return Object.freeze( {
    voicesRef,
    external: Object.freeze( [] ),
    isSounding: ( id ) => Boolean( runtime.liveInstruments?.[ id ] ),
    command: ( id, action ) => client.instrumentCommand( action, id ),
    setControl: ( id, name, value ) => client.instrumentCommand( 'set', id, '', { [ name ]: value } )
  } );
}
