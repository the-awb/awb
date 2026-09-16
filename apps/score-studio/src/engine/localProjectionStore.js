const SCHEMA = 'awb.score.projection/1';
const PREFIX = 'awb.score.projection.';

function keyFor( scoreID, kind ) {
  return `${ PREFIX }${ encodeURIComponent( scoreID ) }.${ kind }`;
}

export function storeLocalProjection( document, kind, text, storage = globalThis.localStorage ) {
  if ( !storage ) throw new Error( 'Local app storage is unavailable.' );
  const record = Object.freeze( {
    schema: SCHEMA,
    scoreID: document.scoreID,
    revision: document.revision,
    kind,
    text,
    generatedAt: new Date().toISOString()
  } );
  storage.setItem( keyFor( document.scoreID, kind ), JSON.stringify( record ) );
  return record;
}

export function readLocalProjection( document, kind, storage = globalThis.localStorage ) {
  if ( !storage ) return null;
  const raw = storage.getItem( keyFor( document.scoreID, kind ) );
  if ( raw === null ) return null;
  try {
    const record = JSON.parse( raw );
    if ( record?.schema !== SCHEMA
      || record.scoreID !== document.scoreID
      || record.revision !== document.revision
      || record.kind !== kind
      || typeof record.text !== 'string' ) return null;
    return Object.freeze( record );
  } catch {
    return null;
  }
}
