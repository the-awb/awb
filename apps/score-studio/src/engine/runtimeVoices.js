import { expandScEventParams } from './scEventSemantics.js';

const PITCH_CLASSES = Object.freeze( [ 'C', 'C♯', 'D', 'D♯', 'E', 'F', 'F♯', 'G', 'G♯', 'A', 'A♯', 'B' ] );

function compactNumber( value ) {
  if ( !Number.isFinite( Number( value ) ) ) return null;
  return `${ Number( Number( value ).toPrecision( 7 ) ) }`;
}

function midiName( value ) {
  const midi = Number( value );
  if ( !Number.isFinite( midi ) ) return null;
  const rounded = Math.round( midi );
  const pitch = PITCH_CLASSES[ ( ( rounded % 12 ) + 12 ) % 12 ];
  return `${ pitch }${ Math.floor( rounded / 12 ) - 1 }`;
}

function degreeName( degree, octave ) {
  const value = compactNumber( degree );
  if ( value === null ) return null;
  const register = Number( octave );
  if ( !Number.isInteger( register ) || register === 0 ) return value;
  return `${ value }${ register > 0 ? "'".repeat( register ) : ','.repeat( -register ) }`;
}

export function musicalVoiceLabel( params = {} ) {
  if ( params.note !== undefined ) {
    if ( typeof params.note === 'string' && params.note.length ) return params.note;
    if ( Number.isFinite( Number( params.note ) ) && Number.isFinite( Number( params.octave ) ) ) {
      return midiName( ( Number( params.octave ) * 12 ) + Number( params.note ) );
    }
    return compactNumber( params.note ) ?? `${ params.note }`;
  }
  if ( params.midinote !== undefined ) return midiName( params.midinote ) ?? `${ params.midinote }`;
  if ( params.degree !== undefined ) return degreeName( params.degree, params.octave ) ?? `${ params.degree }`;
  for ( const key of [ 'freq', 'freqA', 'frequency', 'freqL' ] ) {
    if ( params[ key ] !== undefined ) return compactNumber( params[ key ] ) ?? `${ params[ key ] }`;
  }
  return null;
}

export function voicesForRealization( realization, event = {} ) {
  const nodeIDs = realization.nodeIDs?.length ? realization.nodeIDs : realization.nodeID !== undefined
    ? [ realization.nodeID ] : [];
  let expanded = realization.voices ?? [];
  if ( !expanded.length ) {
    try { expanded = expandScEventParams( realization.params ?? event ); }
    catch { expanded = []; }
  }
  return nodeIDs.map( ( nodeID, index ) => {
    const stored = realization.voiceParams?.[ nodeID ] ?? realization.voiceParams?.[ `${ nodeID }` ];
    const params = Object.freeze( {
      ...( expanded[ index % Math.max( 1, expanded.length ) ] ?? realization.params ?? event ),
      ...( stored ?? {} )
    } );
    return Object.freeze( {
      nodeID: Number( nodeID ), voiceIndex: index, params,
      state: realization.voiceStates?.[ nodeID ] ?? realization.voiceStates?.[ `${ nodeID }` ] ?? realization.state,
      label: musicalVoiceLabel( params ) ?? `voice ${ index + 1 }`
    } );
  } );
}
