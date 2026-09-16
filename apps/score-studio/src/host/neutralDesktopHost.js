import { hashScoreDocument, serializeScoreDocument } from '@awb/score';
import { parseScoreFileText, readScoreFile } from '../engine/scoreFiles.js';
import { assertScoreStudioHost } from './hostContract.js';

function abort() {
  const error = new Error( 'The operation was cancelled.' ); error.name = 'AbortError'; throw error;
}

async function scoreResult( record ) {
  if ( !record ) return null;
  const parsed = parseScoreFileText( record.text );
  return { ...parsed, name: record.name, handle: record.handle,
    hash: await hashScoreDocument( parsed.document ) };
}

export function createNeutralDesktopHost( {
  bridge = globalThis.awbHost, storage = globalThis.localStorage, confirm = globalThis.confirm
} = {} ) {
  if ( !bridge ) throw new TypeError( 'Neutral desktop host bridge is unavailable.' );
  const launch = bridge.initialLaunchContext();
  if ( launch.shellProtocol !== 1 || launch.tool?.id !== 'score-studio' ) throw new Error( 'Score Studio received an incompatible AWB shell context.' );
  const grants = bridge.capabilities();
  const capabilities = Object.freeze( {
    filePicker: grants.filesystem?.includes( 'open-file' ) ?? false,
    fileInputFallback: false,
    directoryPicker: grants.filesystem?.includes( 'open-directory' ) ?? false,
    canonicalSave: grants.filesystem?.includes( 'save-file' ) ?? false,
    projectionSave: grants.filesystem?.includes( 'save-file' ) ?? false,
    retainedFileHandles: true, downloadFallback: false, recoveryStorage: Boolean( storage ),
    hostedLaunch: Boolean( launch.connections?.endpoint || launch.toolSessionID ),
    nativeWindowFocus: true, nativeWindowClose: true
  } );
  const request = ( operation, payload = {} ) => bridge.request( operation, payload );

  return assertScoreStudioHost( {
    kind: 'desktop', capabilities,
    async initialScore() { return scoreResult( await request( 'filesystem.initial-file' ) ); },
    async openScore() {
      const record = await request( 'filesystem.open-file', { filters: [ { name: 'AWB score', extensions: [ 'json' ] } ] } );
      if ( !record ) abort(); return scoreResult( record );
    },
    readFallbackScore( file ) { return readScoreFile( file ); },
    async loadBundledScore( url, name ) {
      const relative = `${ url }`.replace( /^[./\\]+/, '' );
      return scoreResult( await request( 'artifact.read-text', { path: `dist/${ relative }`, name } ) );
    },
    async openScoreDirectory() {
      const directory = await request( 'filesystem.open-directory', { suffix: '.score.json' } );
      if ( !directory ) abort(); return directory;
    },
    refreshScoreDirectory( directory ) {
      return request( 'filesystem.list-directory', { handle: directory.handle, suffix: '.score.json' } );
    },
    async openDirectoryScore( item ) {
      return scoreResult( await request( 'filesystem.read-file', { handle: item.handle } ) );
    },
    async saveCanonical( document, { handle = null, expectedHash = null, saveAs = false } = {} ) {
      let expectedText = null;
      if ( handle && expectedHash && !saveAs ) {
        const current = await request( 'filesystem.read-file', { handle } );
        if ( ( await scoreResult( current ) ).hash !== expectedHash ) {
          throw new Error( 'The score changed on disk. Reload it or use Save as; it was not overwritten.' );
        }
        expectedText = current.text;
      }
      const result = await request( 'filesystem.save-file', { handle, suggestedName: `${ document.scoreID }.score.json`,
        filters: [ { name: 'AWB score', extensions: [ 'json' ] } ], text: serializeScoreDocument( document ),
        expectedText, saveAs } );
      if ( !result ) abort();
      return { handle: result.handle, hash: await hashScoreDocument( document ), downloaded: false };
    },
    async saveProjection( text, { scoreID, handle = null, expectedText = null, saveAs = false } ) {
      const result = await request( 'filesystem.save-file', { handle, suggestedName: `${ scoreID }.score.scd`,
        filters: [ { name: 'SuperCollider score projection', extensions: [ 'scd' ] } ], text,
        expectedText: saveAs ? null : expectedText, saveAs } );
      if ( !result ) abort(); return { handle: result.handle, text, downloaded: false };
    },
    storeRecovery( document ) {
      if ( !storage ) return false;
      storage.setItem( `awb.score.draft.${ document.scoreID }`, serializeScoreDocument( document ) ); return true;
    },
    confirmDiscard( message ) { return confirm( message ); },
    hostedLaunchContext() { return { endpoint: launch.connections?.endpoint ?? '',
      toolSessionID: launch.toolSessionID ?? '', scorePath: null, ownerPID: launch.owner?.pid ?? 0 }; },
    reportSessionState( state ) { bridge.reportSessionState( state ); },
    shellState() { return bridge.shellState(); },
    focusWindow() { return bridge.focusView(); },
    closeWindow() { return bridge.closeView(); }
  } );
}
