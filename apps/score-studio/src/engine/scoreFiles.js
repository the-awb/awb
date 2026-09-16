import {
  createScoreDocument, hashScoreDocument, parseScoreDocument
} from '@awb/score';

export function parseScoreFileText( text ) {
  try { return { document: parseScoreDocument( text ), migrated: false }; }
  catch ( canonicalError ) {
    let value;
    try { value = JSON.parse( text ); }
    catch { throw canonicalError; }
    const legacyShape = value && typeof value === 'object' && !Array.isArray( value )
      && value.schema === undefined && value.meta === undefined
      && typeof value.scoreID === 'string' && Array.isArray( value.entries );
    if ( !legacyShape ) throw canonicalError;
    return {
      document: createScoreDocument( {
        scoreID: value.scoreID,
        revision: value.revision,
        meta: { title: value.scoreID, description: 'Imported from a pre-schema AWB score.', tags: [] },
        entries: value.entries
      } ),
      migrated: true
    };
  }
}

export async function readScoreFile( file ) {
  const text = await file.text();
  const { document, migrated } = parseScoreFileText( text );
  return { document, migrated, hash: await hashScoreDocument( document ), name: file.name };
}

export async function readScoreHandle( handle ) {
  return { ...await readScoreFile( await handle.getFile() ), handle };
}

export async function listScoreDirectory( handle ) {
  const files = [];
  for await ( const entry of handle.values() ) {
    if ( entry.kind === 'file' && entry.name.endsWith( '.score.json' ) ) files.push( {
      name: entry.name, handle: entry
    } );
  }
  files.sort( ( a, b ) => a.name.localeCompare( b.name ) );
  return files;
}

export async function loadBundledScore( url, name, fetchImpl = globalThis.fetch ) {
  const response = await fetchImpl( url );
  if ( !response.ok ) throw new Error( `Could not load bundled score (${ response.status }).` );
  const parsed = parseScoreFileText( await response.text() );
  return {
    ...parsed, name, handle: null, hash: await hashScoreDocument( parsed.document )
  };
}
