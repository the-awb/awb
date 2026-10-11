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
  toggleFullscreen: () => ipcRenderer.invoke( 'awb:toggle-fullscreen' ),
  fullscreenState: () => ipcRenderer.invoke( 'awb:fullscreen-state' ),
  shellState: () => ipcRenderer.invoke( 'awb:shell-state' )
} ) );

// One shared, isolated control for every NodeShell app using this preload.
window.addEventListener('DOMContentLoaded',()=>{
  if(window.top!==window)return;
  const host=document.createElement('div');host.id='awb-window-controls';
  Object.assign(host.style,{position:'fixed',right:'10px',bottom:'10px',zIndex:'2147483647'});
  const shadow=host.attachShadow({mode:'open'}),button=document.createElement('button');
  button.id='fullscreen';button.textContent='⛶';button.setAttribute('aria-label','Enter fullscreen');button.title='Enter fullscreen · F11';
  const style=document.createElement('style');style.textContent='button{width:30px;height:28px;border:1px solid #647889;background:#19232dec;color:#dce6ed;border-radius:5px;font:20px system-ui;cursor:pointer;opacity:.75}button:hover,button:focus-visible{opacity:1;background:#354956}button[aria-pressed=true]{color:#96d6c4}';
  const update=value=>{button.setAttribute('aria-pressed',String(value));button.setAttribute('aria-label',value?'Exit fullscreen':'Enter fullscreen');button.title=(value?'Exit fullscreen':'Enter fullscreen')+' · F11';};
  const toggle=()=>ipcRenderer.invoke('awb:toggle-fullscreen').then(update).catch(error=>{button.title=error.message;});
  button.onclick=toggle;shadow.append(style,button);document.body.append(host);
  ipcRenderer.on('awb:fullscreen-state',(_event,value)=>update(value));
  ipcRenderer.invoke('awb:fullscreen-state').then(update).catch(()=>{});
  window.addEventListener('keydown',event=>{if(event.key==='F11'){event.preventDefault();if(!event.repeat)toggle();}});
});
