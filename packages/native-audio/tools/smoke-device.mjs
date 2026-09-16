import { WebSocket } from 'ws';
import { createNativeAudioBroker, decodeAudioFrameHeader } from '../src/index.js';

const broker = createNativeAudioBroker();
let capture;
try {
  const devices = await broker.listDevices();
  const requestedName = process.argv[ 2 ] ?? '1248';
  const device = devices.find( ( candidate ) => candidate.name === requestedName || candidate.uid === requestedName );
  if ( !device ) throw new Error( `Core Audio input device not found: ${ requestedName }` );
  capture = await broker.acquire( { deviceUID: device.uid, framesPerChunk: 4096 } );
  const socket = new WebSocket( capture.endpoint );
  const header = await new Promise( ( resolve, reject ) => {
    const timeout = setTimeout( () => reject( new Error( 'Timed out waiting for a native PCM frame.' ) ), 5000 );
    socket.once( 'message', ( bytes ) => { clearTimeout( timeout ); resolve( decodeAudioFrameHeader( bytes ) ); } );
    socket.once( 'error', reject );
  } );
  socket.close();
  console.log( JSON.stringify( { device, frame: { ...header, sequence: String( header.sequence ), hostTime: String( header.hostTime ) } }, null, 2 ) );
} finally {
  await capture?.release();
  await broker.close();
}
