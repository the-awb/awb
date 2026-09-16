const { contextBridge, ipcRenderer } = require( 'electron' );

const leaseListeners = new Set();
const commandListeners = new Set();
let outputPort = null;
let outputClosed = true;
let requestSequence = 0;
const pending = new Map();

const settle = ( message ) => {
  const request = pending.get( message.requestID );
  if ( !request ) return;
  pending.delete( message.requestID );
  if ( message.ok ) request.resolve();
  else request.reject( new Error( message.error || 'Render output write failed.' ) );
};

const outputRequest = ( type, chunk = null ) => {
  if ( type === 'abort' && outputClosed ) return Promise.resolve();
  if ( !outputPort ) return Promise.reject( new Error( 'No render output stream is open.' ) );
  const requestID = ++requestSequence;
  return new Promise( ( resolve, reject ) => {
    pending.set( requestID, {
      resolve: () => { if ( type === 'close' || type === 'abort' ) outputClosed = true; resolve(); },
      reject
    } );
    if ( chunk ) {
      if ( chunk.type !== 'write' || !Number.isSafeInteger( chunk.position ) || chunk.position < 0 ) {
        pending.delete( requestID );
        reject( new TypeError( 'Render output chunk is invalid.' ) );
        return;
      }
      const bytes = chunk.data instanceof Uint8Array ? chunk.data : new Uint8Array( chunk.data );
      const data = bytes.byteOffset === 0 && bytes.byteLength === bytes.buffer.byteLength
        ? bytes.buffer : bytes.buffer.slice( bytes.byteOffset, bytes.byteOffset + bytes.byteLength );
      // Do not transfer the buffer here. Electron's sandboxed renderer port can null the entire
      // payload when a context-bridged ArrayBuffer is also supplied in the transfer list.
      // The bounded, awaited copy keeps backpressure intact and never touches lifecycle IPC.
      outputPort.postMessage( { type, requestID, data, position: chunk.position } );
    } else outputPort.postMessage( { type, requestID } );
  } );
};

ipcRenderer.on( 'awb:render-lease', ( event, lease ) => {
  if ( event.ports.length !== 1 ) return;
  outputPort?.close();
  outputPort = event.ports[ 0 ];
  outputClosed = false;
  outputPort.onmessage = ( message ) => settle( message.data );
  outputPort.start();
  for ( const listener of leaseListeners ) listener( lease );
} );

ipcRenderer.on( 'awb:render-command', ( event, command ) => {
  for ( const listener of commandListeners ) listener( command );
} );

contextBridge.exposeInMainWorld( 'awbRenderExecutor', Object.freeze( {
  ready: () => ipcRenderer.send( 'awb:render-executor-ready' ),
  onLease: ( listener ) => { leaseListeners.add( listener ); return () => leaseListeners.delete( listener ); },
  onCommand: ( listener ) => { commandListeners.add( listener ); return () => commandListeners.delete( listener ); },
  progress: ( payload ) => ipcRenderer.invoke( 'awb:render-executor-control', { operation: 'progress', payload } ),
  complete: ( payload ) => ipcRenderer.invoke( 'awb:render-executor-control', { operation: 'complete', payload } ),
  fail: ( payload ) => ipcRenderer.invoke( 'awb:render-executor-control', { operation: 'fail', payload } ),
  cancelled: ( payload ) => ipcRenderer.invoke( 'awb:render-executor-control', { operation: 'cancelled', payload } ),
  write: ( chunk ) => outputRequest( 'chunk', chunk ),
  closeOutput: () => outputRequest( 'close' ),
  abortOutput: () => outputRequest( 'abort' )
} ) );
