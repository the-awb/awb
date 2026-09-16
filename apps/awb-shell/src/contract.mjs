export const SHELL_PROTOCOL = 1;
export const HOST_METHODS = Object.freeze( [
  'capabilities', 'initialLaunchContext', 'reportReady', 'reportSessionState',
  'reportDetailedState', 'onCommand', 'request', 'focusView', 'closeView', 'shellState'
] );

export function grantedCapabilities( requested, supported ) {
  return Object.freeze( Object.fromEntries( [ 'filesystem', 'media', 'connections' ].map( ( group ) => [
    group, Object.freeze( ( requested[ group ] ?? [] ).filter( ( item ) => supported[ group ]?.includes( item ) ) )
  ] ) ) );
}

export function publicManifest( manifest ) {
  return Object.freeze( {
    id: manifest.id, name: manifest.name, version: manifest.version,
    launchProfiles: manifest.launchProfiles,
    capabilities: manifest.capabilities,
    documentKinds: manifest.documentKinds
  } );
}
