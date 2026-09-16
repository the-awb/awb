import { hashScoreDocument, serializeScoreDocument } from '@awb/score';
import {
  listScoreDirectory, loadBundledScore, readScoreFile, readScoreHandle
} from '../engine/scoreFiles.js';
import { assertScoreStudioHost } from './hostContract.js';

const SCORE_TYPES = [ {
  description: 'AWB score', accept: { 'application/json': [ '.score.json', '.json' ] }
} ];
const PROJECTION_TYPES = [ {
  description: 'SuperCollider score projection', accept: { 'text/plain': [ '.score.scd', '.scd' ] }
} ];

function downloadText( browserDocument, urlAPI, text, name, type ) {
  const url = urlAPI.createObjectURL( new Blob( [ text ], { type } ) );
  const anchor = browserDocument.createElement( 'a' );
  anchor.href = url;
  anchor.download = name;
  anchor.click();
  setTimeout( () => urlAPI.revokeObjectURL( url ), 0 );
}

async function writeText( handle, text ) {
  const writable = await handle.createWritable();
  await writable.write( text );
  await writable.close();
}

export function createBrowserHost( {
  browser = globalThis.window,
  browserDocument = browser?.document,
  storage = globalThis.localStorage,
  fetchImpl = globalThis.fetch,
  urlAPI = globalThis.URL,
  launch = {}
} = {} ) {
  const launchContext = Object.freeze( {
    endpoint: launch.endpoint ?? '',
    initialScoreURL: launch.initialScoreURL ?? '',
    initialScoreName: launch.initialScoreName ?? 'hosted.score.json',
    toolSessionID: launch.toolSessionID ?? ''
  } );
  const capabilities = Object.freeze( {
    filePicker: typeof browser?.showOpenFilePicker === 'function',
    fileInputFallback: true,
    directoryPicker: typeof browser?.showDirectoryPicker === 'function',
    canonicalSave: true,
    projectionSave: true,
    retainedFileHandles: typeof browser?.showSaveFilePicker === 'function',
    downloadFallback: true,
    recoveryStorage: Boolean( storage ),
    hostedLaunch: Boolean( launchContext.endpoint || launchContext.toolSessionID ),
    executionModes: Object.freeze( [ 'hosted', 'standalone' ] ),
    nativeWindowFocus: false,
    nativeWindowClose: false
  } );

  return assertScoreStudioHost( {
    kind: 'browser',
    capabilities,

    async initialScore() {
      if ( !launchContext.initialScoreURL ) return null;
      return loadBundledScore(
        launchContext.initialScoreURL, launchContext.initialScoreName, fetchImpl
      );
    },

    async openScore() {
      if ( !capabilities.filePicker ) return null;
      const [ handle ] = await browser.showOpenFilePicker( { multiple: false, types: SCORE_TYPES } );
      return readScoreHandle( handle );
    },

    readFallbackScore( file ) { return readScoreFile( file ); },

    loadBundledScore( url, name ) { return loadBundledScore( url, name, fetchImpl ); },

    async openScoreDirectory() {
      if ( !capabilities.directoryPicker ) return null;
      const handle = await browser.showDirectoryPicker( { mode: 'readwrite' } );
      return { handle, name: handle.name, files: await listScoreDirectory( handle ) };
    },

    async refreshScoreDirectory( directory ) {
      return { ...directory, files: await listScoreDirectory( directory.handle ) };
    },

    openDirectoryScore( item ) { return readScoreHandle( item.handle ); },

    async saveCanonical( document, { handle = null, expectedHash = null, saveAs = false } = {} ) {
      let target = saveAs ? null : handle;
      if ( !target && capabilities.retainedFileHandles ) target = await browser.showSaveFilePicker( {
        suggestedName: `${ document.scoreID }.score.json`, types: SCORE_TYPES
      } );
      if ( !target ) {
        downloadText( browserDocument, urlAPI, serializeScoreDocument( document ),
          `${ document.scoreID }.score.json`, 'application/json' );
        return { handle: null, hash: await hashScoreDocument( document ), downloaded: true };
      }
      if ( handle && target === handle && expectedHash ) {
        const current = await readScoreFile( await handle.getFile() );
        if ( current.hash !== expectedHash ) {
          throw new Error( 'The score changed on disk. Reload it or use Save as; it was not overwritten.' );
        }
      }
      await writeText( target, serializeScoreDocument( document ) );
      return { handle: target, hash: await hashScoreDocument( document ), downloaded: false };
    },

    async saveProjection( text, {
      scoreID, handle = null, expectedText = null, saveAs = false
    } ) {
      let target = saveAs ? null : handle;
      if ( !target && capabilities.retainedFileHandles ) target = await browser.showSaveFilePicker( {
        suggestedName: `${ scoreID }.score.scd`, types: PROJECTION_TYPES
      } );
      if ( !target ) {
        downloadText( browserDocument, urlAPI, text, `${ scoreID }.score.scd`, 'text/plain' );
        return { handle: null, text, downloaded: true };
      }
      if ( handle && target === handle ) {
        const current = await ( await handle.getFile() ).text();
        if ( expectedText === null || current !== expectedText ) {
          throw new Error( 'The SC projection changed on disk. It was not overwritten.' );
        }
      }
      await writeText( target, text );
      return { handle: target, text, downloaded: false };
    },

    storeRecovery( document ) {
      if ( !storage ) return false;
      storage.setItem( `awb.score.draft.${ document.scoreID }`, serializeScoreDocument( document ) );
      return true;
    },

    confirmDiscard( message ) { return browser.confirm( message ); },
    hostedLaunchContext() { return launchContext; },
    reportSessionState() {},
    shellState() {
      return Object.freeze( {
        kind: 'browser', processID: null, windowID: null,
        focused: null, visible: true, minimized: false, sessions: []
      } );
    },
    focusWindow() { return false; },
    closeWindow() { return false; }
  } );
}
