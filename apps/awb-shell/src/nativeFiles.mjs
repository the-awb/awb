import path from 'node:path';
import { access, mkdir, readFile, rename, unlink, writeFile } from 'node:fs/promises';
import { constants } from 'node:fs';

export async function pathExists( target ) {
  try { await access( target, constants.F_OK ); return true; } catch { return false; }
}

export async function atomicWriteText( target, text ) {
  if ( typeof text !== 'string' || Buffer.byteLength( text ) > 16 * 1024 * 1024 ) throw new Error( 'Text payload is invalid or too large.' );
  await mkdir( path.dirname( target ), { recursive: true } );
  const temporary = path.join( path.dirname( target ), `.${ path.basename( target ) }.awb-${ process.pid }-${ Date.now() }.tmp` );
  try { await writeFile( temporary, text, 'utf8' ); await rename( temporary, target ); }
  catch ( error ) { await unlink( temporary ).catch( () => {} ); throw error; }
}

export async function guardedWriteText( target, text, { expectedText = null } = {} ) {
  if ( expectedText !== null && await pathExists( target ) ) {
    if ( await readFile( target, 'utf8' ) !== expectedText ) throw new Error( 'The file changed on disk. It was not overwritten.' );
  }
  await atomicWriteText( target, text );
}
