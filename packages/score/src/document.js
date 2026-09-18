import { sortScore } from './score.js';

export const SCORE_SCHEMA = 'awb.score/1';

const isObject = ( value ) => value !== null && typeof value === 'object' && !Array.isArray( value );

function checkJsonValue( value, path, errors ) {
  if ( value === null || typeof value === 'string' || typeof value === 'boolean' ) return;
  if ( typeof value === 'number' ) {
    if ( !Number.isFinite( value ) ) errors.push( `${ path } must be a finite number` );
    return;
  }
  if ( Array.isArray( value ) ) {
    value.forEach( ( item, index ) => checkJsonValue( item, `${ path }[${ index }]`, errors ) );
    return;
  }
  if ( isObject( value ) ) {
    for ( const [ key, item ] of Object.entries( value ) ) {
      if ( item === undefined ) errors.push( `${ path }.${ key } must not be undefined` );
      else checkJsonValue( item, `${ path }.${ key }`, errors );
    }
    return;
  }
  errors.push( `${ path } is not JSON-safe` );
}

function freezeDeep( value ) {
  if ( value && typeof value === 'object' && !Object.isFrozen( value ) ) {
    Object.values( value ).forEach( freezeDeep );
    Object.freeze( value );
  }
  return value;
}

export function validateScoreDocument( value ) {
  const errors = [];
  if ( !isObject( value ) ) return { ok: false, errors: [ 'score document must be an object' ] };
  if ( value.schema !== SCORE_SCHEMA ) errors.push( `schema must be ${ SCORE_SCHEMA }` );
  if ( typeof value.scoreID !== 'string' || !value.scoreID.trim() ) {
    errors.push( 'scoreID must be a non-empty string' );
  }
  if ( !Number.isInteger( value.revision ) || value.revision < 0 ) {
    errors.push( 'revision must be a non-negative integer' );
  }
  if ( !isObject( value.meta ) ) errors.push( 'meta must be an object' );
  else checkJsonValue( value.meta, 'meta', errors );
  if ( !Array.isArray( value.entries ) ) {
    errors.push( 'entries must be an array' );
  } else {
    const ids = new Set();
    value.entries.forEach( ( entry, index ) => {
      const path = `entries[${ index }]`;
      if ( !isObject( entry ) ) {
        errors.push( `${ path } must be an object` );
        return;
      }
      if ( typeof entry.id !== 'string' || !entry.id ) errors.push( `${ path }.id must be a non-empty string` );
      else if ( ids.has( entry.id ) ) errors.push( `${ path }.id duplicates ${ entry.id }` );
      else ids.add( entry.id );
      if ( typeof entry.time !== 'number' || !Number.isFinite( entry.time ) || entry.time < 0 ) {
        errors.push( `${ path }.time must be a non-negative finite number` );
      }
      if ( !Array.isArray( entry.path ) || entry.path.some( ( segment ) => typeof segment !== 'string' ) ) {
        errors.push( `${ path }.path must be an array of strings` );
      }
      if ( !isObject( entry.event ) ) errors.push( `${ path }.event must be an object` );
      else {
        checkJsonValue( entry.event, `${ path }.event`, errors );
        if ( entry.event.type === 'note' ) {
          const noteDuration = entry.event.dur;
          if ( noteDuration === undefined ) {
            errors.push( `${ path }.event.dur must be a non-negative finite number or "inf"` );
          } else if ( noteDuration !== 'inf'
            && ( typeof noteDuration !== 'number' || !Number.isFinite( noteDuration ) || noteDuration < 0 ) ) {
            errors.push( `${ path }.event.dur must be a non-negative finite number or "inf"` );
          }
        }
      }
    } );
  }
  return { ok: errors.length === 0, errors };
}

export function assertScoreDocument( value ) {
  const result = validateScoreDocument( value );
  if ( !result.ok ) throw new Error( `Invalid score document: ${ result.errors.join( '; ' ) }` );
  return value;
}

export function createScoreDocument( {
  scoreID = 'untitled', revision = 0, meta = {}, entries = []
} = {} ) {
  const document = {
    schema: SCORE_SCHEMA,
    scoreID,
    revision,
    meta: canonicalValue( {
      title: 'Untitled score',
      description: '',
      tags: [],
      ...meta
    } ),
    entries: sortScore( entries ).map( ( entry ) => ( {
      ...entry,
      path: [ ...entry.path ],
      event: canonicalValue( entry.event )
    } ) )
  };
  return freezeDeep( assertScoreDocument( document ) );
}

export function reviseScoreDocument( document, entries, meta = document.meta ) {
  assertScoreDocument( document );
  return createScoreDocument( {
    scoreID: document.scoreID,
    revision: document.revision + 1,
    meta,
    entries
  } );
}

function canonicalValue( value ) {
  if ( Array.isArray( value ) ) return value.map( canonicalValue );
  if ( !isObject( value ) ) return value;
  return Object.fromEntries(
    Object.keys( value ).sort().map( ( key ) => [ key, canonicalValue( value[ key ] ) ] )
  );
}

// The canonical bytes are UTF-8 JSON with recursively sorted object keys, two-space indentation,
// and exactly one trailing LF. Array order is retained because same-time entry order is semantic.
export function serializeScoreDocument( document ) {
  assertScoreDocument( document );
  return `${ JSON.stringify( canonicalValue( document ), null, 2 ) }\n`;
}

export function parseScoreDocument( text ) {
  let value;
  try { value = JSON.parse( text ); }
  catch ( error ) { throw new Error( `Invalid score JSON: ${ error.message }` ); }
  return freezeDeep( assertScoreDocument( value ) );
}

export async function hashScoreDocument( document ) {
  const bytes = new TextEncoder().encode( serializeScoreDocument( document ) );
  const digest = await globalThis.crypto.subtle.digest( 'SHA-256', bytes );
  return [ ...new Uint8Array( digest ) ].map( ( byte ) => byte.toString( 16 ).padStart( 2, '0' ) ).join( '' );
}
