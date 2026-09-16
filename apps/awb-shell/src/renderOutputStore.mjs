import crypto from 'node:crypto';
import path from 'node:path';
import { mkdir, open, rename, unlink } from 'node:fs/promises';

const safeID = ( value, label ) => {
  if ( typeof value !== 'string' || !/^[a-zA-Z0-9._-]+$/.test( value ) ) {
    throw new TypeError( `${ label } is invalid.` );
  }
  return value;
};

export class RenderOutputStore {
  #targets = new Map();
  #sessions = new Map();

  constructor( { maxChunkBytes = 32 * 1024 * 1024, maxFileBytes = 256 * 1024 * 1024 * 1024 } = {} ) {
    this.maxChunkBytes = maxChunkBytes;
    this.maxFileBytes = maxFileBytes;
  }

  register( renderID, targetPath ) {
    safeID( renderID, 'Render id' );
    if ( typeof targetPath !== 'string' || !targetPath ) throw new TypeError( 'Render output path is required.' );
    if ( this.#targets.has( renderID ) ) throw new Error( 'Render output is already registered.' );
    const resolved = path.resolve( targetPath );
    const target = Object.freeze( {
      path: resolved,
      name: path.basename( resolved ),
      locator: `awb-render://${ renderID }/${ encodeURIComponent( path.basename( resolved ) ) }`
    } );
    this.#targets.set( renderID, target );
    return Object.freeze( { name: target.name, locator: target.locator } );
  }

  descriptor( renderID ) {
    const target = this.#targets.get( renderID );
    if ( !target ) throw new Error( `No output is registered for render ${ renderID }.` );
    return Object.freeze( { name: target.name, locator: target.locator } );
  }

  async open( renderID, leaseID, port ) {
    const target = this.#targets.get( renderID );
    if ( !target ) throw new Error( `No output is registered for render ${ renderID }.` );
    safeID( leaseID, 'Lease id' );
    if ( this.#sessions.has( renderID ) ) throw new Error( 'Render output is already open.' );
    await mkdir( path.dirname( target.path ), { recursive: true } );
    const temporary = path.join( path.dirname( target.path ),
      `.${ target.name }.awb-${ process.pid }-${ crypto.randomUUID() }.tmp` );
    const file = await open( temporary, 'wx' );
    const session = { renderID, leaseID, target, temporary, file, closed: false };
    this.#sessions.set( renderID, session );
    const reply = ( requestID, ok, error = null ) => port.postMessage( { requestID, ok, error } );
    port.on( 'message', async ( event ) => {
      // Electron's MessagePortMain has exposed both MessageEvent-like and direct payload shapes
      // across releases; accept either without weakening the message validation below.
      const message = event?.data?.type ? event.data : event;
      if ( !message ) return;
      if ( session.closed ) {
        reply( message.requestID, false, 'Render output stream is already closed.' );
        return;
      }
      try {
        if ( message.type === 'chunk' ) {
          if ( !( message.data instanceof ArrayBuffer ) ) throw new TypeError( 'Render chunk must be an ArrayBuffer.' );
          if ( !Number.isSafeInteger( message.position ) || message.position < 0 ) {
            throw new TypeError( 'Render chunk position must be a non-negative integer.' );
          }
          const buffer = Buffer.from( message.data );
          if ( buffer.length > this.maxChunkBytes || message.position + buffer.length > this.maxFileBytes ) {
            throw new RangeError( 'Render output write exceeds the local output limits.' );
          }
          await file.write( buffer, 0, buffer.length, message.position );
        } else if ( message.type === 'close' ) {
          session.closed = true;
          await file.sync();
          await file.close();
          await rename( temporary, target.path );
          this.#sessions.delete( renderID );
        } else if ( message.type === 'abort' ) {
          session.closed = true;
          await file.close().catch( () => {} );
          await unlink( temporary ).catch( () => {} );
          this.#sessions.delete( renderID );
        } else throw new Error( 'Unknown render output message.' );
        reply( message.requestID, true );
      } catch ( error ) {
        session.closed = true;
        await file.close().catch( () => {} );
        await unlink( temporary ).catch( () => {} );
        this.#sessions.delete( renderID );
        reply( message.requestID, false, error.message );
      }
    } );
    port.start();
  }

  async abort( renderID ) {
    const session = this.#sessions.get( renderID );
    if ( !session ) return false;
    session.closed = true;
    await session.file.close().catch( () => {} );
    await unlink( session.temporary ).catch( () => {} );
    this.#sessions.delete( renderID );
    return true;
  }

  release( renderID ) {
    this.#targets.delete( renderID );
  }
}
