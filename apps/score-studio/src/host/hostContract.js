const REQUIRED_METHODS = Object.freeze( [
  'initialScore',
  'openScore',
  'readFallbackScore',
  'loadBundledScore',
  'openScoreDirectory',
  'refreshScoreDirectory',
  'openDirectoryScore',
  'saveCanonical',
  'saveProjection',
  'storeRecovery',
  'confirmDiscard',
  'hostedLaunchContext',
  'reportSessionState',
  'focusWindow',
  'closeWindow'
] );

export function assertScoreStudioHost( host ) {
  if ( !host || typeof host !== 'object' ) throw new TypeError( 'Score Studio requires a host adapter.' );
  if ( typeof host.kind !== 'string' || !host.kind ) throw new TypeError( 'Host kind must be a non-empty string.' );
  if ( !host.capabilities || typeof host.capabilities !== 'object' ) {
    throw new TypeError( 'Host capabilities must be reported explicitly.' );
  }
  for ( const method of REQUIRED_METHODS ) {
    if ( typeof host[ method ] !== 'function' ) throw new TypeError( `Host is missing ${ method }().` );
  }
  return host;
}

export { REQUIRED_METHODS };
