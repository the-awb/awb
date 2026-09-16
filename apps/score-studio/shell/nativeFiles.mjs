import path from 'node:path';
import { access, mkdir, readFile, rename, unlink, writeFile } from 'node:fs/promises';
import { constants } from 'node:fs';
import { hashScoreDocument, parseScoreDocument } from '@awb/score';

export async function pathExists( target ) {
  try { await access( target, constants.F_OK ); return true; }
  catch { return false; }
}

export async function canonicalFileHash( target ) {
  return hashScoreDocument( parseScoreDocument( await readFile( target, 'utf8' ) ) );
}

export async function atomicWriteText( target, text ) {
  await mkdir( path.dirname( target ), { recursive: true } );
  const temporary = path.join(
    path.dirname( target ), `.${ path.basename( target ) }.awb-${ process.pid }-${ Date.now() }.tmp`
  );
  try {
    await writeFile( temporary, text, 'utf8' );
    await rename( temporary, target );
  } catch ( error ) {
    await unlink( temporary ).catch( () => {} );
    throw error;
  }
}

export async function saveCanonicalPath( target, text, { expectedHash = null } = {} ) {
  if ( expectedHash && await pathExists( target ) ) {
    if ( await canonicalFileHash( target ) !== expectedHash ) {
      throw new Error( 'The score changed on disk. Reload it or use Save as; it was not overwritten.' );
    }
  }
  parseScoreDocument( text );
  await atomicWriteText( target, text );
  return target;
}

export async function saveProjectionPath( target, text, { expectedText = null } = {} ) {
  if ( await pathExists( target ) ) {
    const current = await readFile( target, 'utf8' );
    if ( expectedText === null || current !== expectedText ) {
      throw new Error( 'The SC projection changed on disk. It was not overwritten.' );
    }
  }
  await atomicWriteText( target, text );
  return target;
}
