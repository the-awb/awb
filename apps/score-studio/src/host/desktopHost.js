import { hashScoreDocument, serializeScoreDocument } from '@awb/score';
import { parseScoreFileText, readScoreFile } from '../engine/scoreFiles.js';
import { assertScoreStudioHost } from './hostContract.js';

function abort() {
  const error = new Error( 'The operation was cancelled.' );
  error.name = 'AbortError';
  throw error;
}

async function scoreResult( record, { retainHandle = true } = {} ) {
  if ( !record ) return null;
  const parsed = parseScoreFileText( record.text );
  return {
    ...parsed,
    name: record.name,
    handle: retainHandle
      ? Object.freeze( { kind: 'desktop-file', name: record.name, path: record.path } )
      : null,
    hash: await hashScoreDocument( parsed.document )
  };
}

export function createDesktopHost( {
  bridge = globalThis.awbDesktopHost,
  storage = globalThis.localStorage,
  confirm = globalThis.confirm,
  nodeRegistry = null
} = {} ) {
  if ( !bridge ) throw new TypeError( 'Desktop host bridge is unavailable.' );
  const capabilities = Object.freeze( {
    filePicker: true,
    fileInputFallback: false,
    directoryPicker: true,
    canonicalSave: true,
    projectionSave: true,
    retainedFileHandles: true,
    downloadFallback: false,
    recoveryStorage: Boolean( storage ),
    hostedLaunch: Boolean( bridge.launchContext().endpoint || bridge.launchContext().toolInstanceID ),
    documentIngress: Object.freeze( { new: true, open: true, demo: true, browse: true } ),
    executionModes: Object.freeze( [ 'hosted' ] ),
    nativeWindowFocus: true,
    nativeWindowClose: true
  } );

  return assertScoreStudioHost( {
    kind: 'desktop',
    capabilities,

    async initialScore() { return scoreResult( await bridge.initialScore() ); },

    async openScore() {
      const record = await bridge.openScore();
      if ( !record ) abort();
      return scoreResult( record );
    },

    readFallbackScore( file ) { return readScoreFile( file ); },

    async loadBundledScore( url, name ) {
      const record = await bridge.loadBundledScore( url, name );
      return scoreResult( record, { retainHandle: false } );
    },

    async openScoreDirectory() {
      const directory = await bridge.openScoreDirectory();
      if ( !directory ) abort();
      return directory;
    },

    refreshScoreDirectory( directory ) { return bridge.refreshScoreDirectory( directory ); },

    async openDirectoryScore( item ) { return scoreResult( await bridge.openDirectoryScore( item ) ); },

    async saveCanonical( document, { handle = null, expectedHash = null, saveAs = false } = {} ) {
      const result = await bridge.saveCanonical( {
        path: handle?.path ?? null,
        suggestedName: `${ document.scoreID }.score.json`,
        text: serializeScoreDocument( document ),
        expectedHash,
        saveAs
      } );
      if ( !result ) abort();
      return {
        handle: Object.freeze( { kind: 'desktop-file', name: result.name, path: result.path } ),
        hash: await hashScoreDocument( document ),
        downloaded: false
      };
    },

    async saveProjection( text, {
      scoreID, handle = null, canonicalHandle = null, expectedText = null, saveAs = false
    } ) {
      const derivedPath = !handle && !saveAs && canonicalHandle?.path
        ? canonicalHandle.path.replace( /\.score\.json$/i, '.score.scd' )
        : null;
      const result = await bridge.saveProjection( {
        path: handle?.path ?? derivedPath,
        suggestedName: `${ scoreID }.score.scd`,
        text,
        expectedText,
        saveAs
      } );
      if ( !result ) abort();
      return {
        handle: Object.freeze( { kind: 'desktop-file', name: result.name, path: result.path } ),
        text,
        downloaded: false
      };
    },

    storeRecovery( document ) {
      if ( !storage ) return false;
      storage.setItem( `awb.score.draft.${ document.scoreID }`, serializeScoreDocument( document ) );
      return true;
    },

    confirmDiscard( message ) { return confirm( message ); },
    engineNodeRegistry() { return nodeRegistry; },
    hostedLaunchContext() { return bridge.launchContext(); },
    reportSessionState( state ) { bridge.reportSessionState( state ); },
    shellState() { return bridge.shellState(); },
    focusWindow() { return bridge.focusWindow(); },
    closeWindow() { return bridge.closeWindow(); }
  } );
}
