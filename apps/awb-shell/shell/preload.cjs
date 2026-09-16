const { contextBridge, ipcRenderer } = require( 'electron' );

const encoded = process.argv.find( ( value ) => value.startsWith( '--awb-launch-context=' ) )
  ?.slice( '--awb-launch-context='.length );
const deepFreeze = ( value ) => {
  if ( value && typeof value === 'object' && !Object.isFrozen( value ) ) {
    Object.values( value ).forEach( deepFreeze ); Object.freeze( value );
  }
  return value;
};
const context = deepFreeze( encoded ? JSON.parse( decodeURIComponent( encoded ) ) : {} );
const listeners = new Set();
ipcRenderer.on( 'awb:command', ( event, command ) => {
  for ( const listener of listeners ) listener( command );
} );

contextBridge.exposeInMainWorld( 'awbHost', Object.freeze( {
  kind: 'desktop',
  capabilities: () => context.grantedCapabilities ?? {},
  initialLaunchContext: () => context,
  reportReady: ( state = {} ) => ipcRenderer.send( 'awb:report-ready', state ),
  reportSessionState: ( state = {} ) => ipcRenderer.send( 'awb:report-session-state', state ),
  reportDetailedState: ( state = {} ) => ipcRenderer.send( 'awb:report-detailed-state', state ),
  onCommand: ( handler ) => {
    if ( typeof handler !== 'function' ) throw new TypeError( 'onCommand requires a function.' );
    listeners.add( handler );
    return () => listeners.delete( handler );
  },
  request: ( operation, payload = {} ) => ipcRenderer.invoke( 'awb:request', { operation, payload } ),
  focusView: () => ipcRenderer.invoke( 'awb:focus-view' ),
  closeView: () => ipcRenderer.invoke( 'awb:close-view' ),
  shellState: () => ipcRenderer.invoke( 'awb:shell-state' )
} ) );
