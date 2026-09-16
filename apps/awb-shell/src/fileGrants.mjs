import crypto from 'node:crypto';
import path from 'node:path';
import { readFile, readdir } from 'node:fs/promises';

export class FileGrantStore {
  #views = new Map();

  #map( viewID ) {
    let map = this.#views.get( viewID );
    if ( !map ) { map = new Map(); this.#views.set( viewID, map ); }
    return map;
  }

  grant( viewID, target, kind ) {
    if ( ![ 'file', 'directory' ].includes( kind ) ) throw new Error( `Unknown grant kind: ${ kind }.` );
    const grantID = crypto.randomUUID();
    const record = Object.freeze( { grantID, kind, path: path.resolve( target ), name: path.basename( target ) } );
    this.#map( viewID ).set( grantID, record );
    return Object.freeze( { kind: `desktop-${ kind }`, grantID, name: record.name } );
  }

  resolve( viewID, handle, expectedKind = null ) {
    const record = this.#map( viewID ).get( handle?.grantID );
    if ( !record || ( expectedKind && record.kind !== expectedKind ) ) throw new Error( 'The file grant is invalid or belongs to another view.' );
    return record;
  }

  async fileRecord( viewID, target ) {
    const handle = this.grant( viewID, target, 'file' );
    return { handle, name: handle.name, text: await readFile( target, 'utf8' ) };
  }

  async listDirectory( viewID, handle, { suffix = '' } = {} ) {
    const directory = this.resolve( viewID, handle, 'directory' );
    if ( typeof suffix !== 'string' || suffix.length > 32 || suffix.includes( path.sep ) ) throw new Error( 'Invalid directory suffix filter.' );
    const entries = ( await readdir( directory.path, { withFileTypes: true } ) )
      .filter( ( entry ) => entry.isFile() && ( !suffix || entry.name.endsWith( suffix ) ) )
      .sort( ( a, b ) => a.name.localeCompare( b.name ) ).slice( 0, 4096 );
    return { handle, name: directory.name,
      files: entries.map( ( entry ) => ( { name: entry.name, handle: this.grant( viewID, path.join( directory.path, entry.name ), 'file' ) } ) ) };
  }

  releaseView( viewID ) { this.#views.delete( viewID ); }
}
