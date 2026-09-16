export const ENGINE_STATES = Object.freeze( [ 'offline', 'booting', 'ready', 'failed' ] );
export const AUDIO_STATES = Object.freeze( [ 'unknown', 'suspended', 'running', 'notApplicable' ] );
export const SCORE_STATES = Object.freeze( [ 'notLoaded', 'ready' ] );
export const DEFINITION_STATES = Object.freeze( [ 'unknown', 'loading', 'ready', 'missing', 'failed' ] );

const includes = ( values, value ) => values.includes( value );

function freezeStrings( values ) {
  return Object.freeze( [ ...new Set( ( values ?? [] ).map( String ) ) ] );
}

/**
 * Normalize host-specific evidence into the one question transports need answered: can this
 * runtime realize the currently loaded score? Handshakes deliberately remain in the host adapters.
 */
export function createPlaybackReadiness( {
  hostKind = 'unknown',
  engine = 'offline',
  audio = 'unknown',
  score = 'notLoaded',
  definitions = 'unknown',
  missingDefinitions = [],
  detail = ''
} = {} ) {
  if ( !includes( ENGINE_STATES, engine ) ) throw new Error( `Unknown SC engine state: ${ engine }` );
  if ( !includes( AUDIO_STATES, audio ) ) throw new Error( `Unknown audio state: ${ audio }` );
  if ( !includes( SCORE_STATES, score ) ) throw new Error( `Unknown score state: ${ score }` );
  if ( !includes( DEFINITION_STATES, definitions ) ) throw new Error( `Unknown SynthDef state: ${ definitions }` );

  const missing = freezeStrings( missingDefinitions );
  let reason = null;
  if ( engine === 'failed' ) reason = detail || 'The SuperCollider engine failed.';
  else if ( engine === 'booting' ) reason = 'The SuperCollider engine is starting.';
  else if ( engine !== 'ready' ) reason = 'The SuperCollider engine is offline.';
  else if ( audio === 'suspended' ) reason = 'The browser audio context is suspended.';
  else if ( audio !== 'running' && audio !== 'notApplicable' ) reason = 'Audio output readiness is unknown.';
  else if ( score !== 'ready' ) reason = 'The selected score revision is not loaded.';
  else if ( definitions === 'missing' ) reason = `Missing SynthDef${ missing.length === 1 ? '' : 's' }: ${ missing.join( ', ' ) || 'unknown' }.`;
  else if ( definitions === 'loading' ) reason = 'The score SynthDefs are loading.';
  else if ( definitions === 'failed' ) reason = detail || 'The score SynthDefs failed to load.';
  else if ( definitions !== 'ready' ) reason = 'SynthDef readiness is unknown.';

  return Object.freeze( {
    hostKind: String( hostKind ), engine, audio, score, definitions,
    missingDefinitions: missing, canPlay: reason === null, reason,
    detail: String( detail || '' )
  } );
}
