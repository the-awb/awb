const { contextBridge, ipcRenderer } = require( 'electron' );

const encodedContext = process.argv.find( ( argument ) => argument.startsWith( '--awb-launch-context=' ) )
  ?.slice( '--awb-launch-context='.length );
const launchContext = encodedContext
  ? JSON.parse( decodeURIComponent( encodedContext ) )
  : { endpoint: '', toolInstanceID: '', scorePath: null, ownerPID: 0 };

contextBridge.exposeInMainWorld( 'awbDesktopHost', Object.freeze( {
  launchContext: () => launchContext,
  initialScore: () => ipcRenderer.invoke( 'awb:initial-score' ),
  openScore: () => ipcRenderer.invoke( 'awb:open-score' ),
  loadBundledScore: ( url, name ) => ipcRenderer.invoke( 'awb:bundled-score', { url, name } ),
  openScoreDirectory: () => ipcRenderer.invoke( 'awb:open-score-directory' ),
  refreshScoreDirectory: ( directory ) => ipcRenderer.invoke( 'awb:refresh-score-directory', directory ),
  openDirectoryScore: ( item ) => ipcRenderer.invoke( 'awb:open-directory-score', item ),
  saveCanonical: ( request ) => ipcRenderer.invoke( 'awb:save-canonical', request ),
  saveProjection: ( request ) => ipcRenderer.invoke( 'awb:save-projection', request ),
  reportSessionState: ( state ) => ipcRenderer.send( 'awb:session-state', state ),
  shellState: () => ipcRenderer.invoke( 'awb:shell-state' ),
  focusWindow: () => ipcRenderer.invoke( 'awb:focus-window' ),
  closeWindow: () => ipcRenderer.invoke( 'awb:close-window' )
} ) );
