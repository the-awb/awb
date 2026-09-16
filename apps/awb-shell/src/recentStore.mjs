import crypto from 'node:crypto';
import path from 'node:path';
import { readFile } from 'node:fs/promises';
import { atomicWriteText } from './nativeFiles.mjs';

export function documentKindIDForPath( documentKinds, target ) {
  if ( !Array.isArray( documentKinds ) || typeof target !== 'string' ) return null;
  const lower = path.basename( target ).toLowerCase();
  return documentKinds.find( ( kind ) => kind.extensions?.some(
    ( extension ) => lower.endsWith( `.${ `${ extension }`.toLowerCase() }` )
  ) )?.id ?? null;
}

export class RecentStore {
  constructor( { filePath = null, limit = 20 } = {} ) {
    this.filePath = filePath; this.limit = Number.isInteger( limit ) && limit > 0 && limit <= 100 ? limit : 20; this.items = [];
  }
  async load() {
    if ( !this.filePath ) return;
    try {
      const parsed = JSON.parse( await readFile( this.filePath, 'utf8' ) );
      if ( Array.isArray( parsed ) ) this.items = parsed.filter( ( item ) => item && typeof item.recentID === 'string'
        && /^[0-9a-f]{24}$/.test( item.recentID ) && typeof item.toolID === 'string' && typeof item.documentKindID === 'string'
        && typeof item.name === 'string' && item.name.length <= 512 && typeof item.path === 'string' && path.isAbsolute( item.path )
        && Number.isFinite( item.usedAt ) ).slice( 0, this.limit ).map( Object.freeze );
    } catch {}
  }
  async add( { toolID, documentKindID, target } ) {
    const absolute = path.resolve( target );
    const item = Object.freeze( { recentID: crypto.createHash( 'sha256' ).update( `${ toolID }\0${ documentKindID }\0${ absolute }` ).digest( 'hex' ).slice( 0, 24 ),
      toolID, documentKindID, name: path.basename( absolute ), path: absolute, usedAt: Date.now() } );
    this.items = [ item, ...this.items.filter( ( candidate ) => candidate.recentID !== item.recentID ) ].slice( 0, this.limit );
    if ( this.filePath ) await atomicWriteText( this.filePath, `${ JSON.stringify( this.items, null, 2 ) }\n` );
    return item;
  }
  list( toolID, documentKindID ) { return this.items.filter( ( item ) => item.toolID === toolID && item.documentKindID === documentKindID ).map( ( item ) => ( {
    recentID: item.recentID, toolID: item.toolID, documentKindID: item.documentKindID, name: item.name, usedAt: item.usedAt
  } ) ); }
  resolve( recentID, toolID, documentKindID ) {
    const item = this.items.find( ( candidate ) => candidate.recentID === recentID && candidate.toolID === toolID && candidate.documentKindID === documentKindID );
    if ( !item ) throw new Error( 'Recent document reference is missing or belongs to another tool.' );
    return item.path;
  }
}
