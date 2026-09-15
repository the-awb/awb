import { hashScoreDocument, parseScoreDocument, serializeScoreDocument } from '@awb/score';

export async function readScoreFile( file ) {
  const text = await file.text();
  const document = parseScoreDocument( text );
  return { document, hash: await hashScoreDocument( document ), name: file.name };
}

export async function openScoreFile() {
  if ( !window.showOpenFilePicker ) return null;
  const [ handle ] = await window.showOpenFilePicker( {
    multiple: false,
    types: [ { description: 'AWB score', accept: { 'application/json': [ '.score.json', '.json' ] } } ]
  } );
  const result = await readScoreFile( await handle.getFile() );
  return { ...result, handle };
}

async function chooseSaveHandle( suggestedName ) {
  if ( !window.showSaveFilePicker ) return null;
  return window.showSaveFilePicker( {
    suggestedName,
    types: [ { description: 'AWB score', accept: { 'application/json': [ '.score.json' ] } } ]
  } );
}

async function chooseProjectionHandle( suggestedName ) {
  if ( !window.showSaveFilePicker ) return null;
  return window.showSaveFilePicker( {
    suggestedName,
    types: [ { description: 'SuperCollider score projection', accept: { 'text/plain': [ '.score.scd', '.scd' ] } } ]
  } );
}

export async function saveScoreFile( document, {
  handle = null, expectedHash = null, saveAs = false
} = {} ) {
  let target = saveAs ? null : handle;
  if ( !target ) target = await chooseSaveHandle( `${ document.scoreID }.score.json` );
  if ( !target ) {
    downloadScoreFile( document );
    return { handle: null, hash: await hashScoreDocument( document ), downloaded: true };
  }

  if ( handle && target === handle && expectedHash ) {
    const current = await readScoreFile( await handle.getFile() );
    if ( current.hash !== expectedHash ) {
      throw new Error( 'The score changed on disk. Reload it or use Save as; it was not overwritten.' );
    }
  }

  const writable = await target.createWritable();
  await writable.write( serializeScoreDocument( document ) );
  await writable.close();
  return { handle: target, hash: await hashScoreDocument( document ), downloaded: false };
}

export function downloadScoreFile( scoreDocument ) {
  const blob = new Blob( [ serializeScoreDocument( scoreDocument ) ], { type: 'application/json' } );
  const url = URL.createObjectURL( blob );
  const anchor = window.document.createElement( 'a' );
  anchor.href = url;
  anchor.download = `${ scoreDocument.scoreID }.score.json`;
  anchor.click();
  setTimeout( () => URL.revokeObjectURL( url ), 0 );
}

export async function saveProjectionFile( text, {
  scoreID, handle = null, expectedText = null, saveAs = false
} ) {
  let target = saveAs ? null : handle;
  if ( !target ) target = await chooseProjectionHandle( `${ scoreID }.score.scd` );
  if ( !target ) {
    downloadTextFile( text, `${ scoreID }.score.scd`, 'text/plain' );
    return { handle: null, text, downloaded: true };
  }
  if ( handle && target === handle ) {
    const current = await ( await handle.getFile() ).text();
    if ( expectedText === null || current !== expectedText ) {
      throw new Error( 'The SC projection changed on disk. It was not overwritten.' );
    }
  }
  const writable = await target.createWritable();
  await writable.write( text );
  await writable.close();
  return { handle: target, text, downloaded: false };
}

export function downloadTextFile( text, name, type = 'text/plain' ) {
  const blob = new Blob( [ text ], { type } );
  const url = URL.createObjectURL( blob );
  const anchor = window.document.createElement( 'a' );
  anchor.href = url;
  anchor.download = name;
  anchor.click();
  setTimeout( () => URL.revokeObjectURL( url ), 0 );
}

export function storeRecoveryDraft( document ) {
  localStorage.setItem( `awb.score.draft.${ document.scoreID }`, serializeScoreDocument( document ) );
}
