import path from 'node:path';
import process from 'node:process';
import { createRequire } from 'node:module';
import { readFile, readdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { atomicWriteText, saveCanonicalPath, saveProjectionPath } from './nativeFiles.mjs';
import { createHostedBridge } from '../server/hosted-bridge.mjs';

const require = createRequire( import.meta.url );
const { app, BrowserWindow, dialog, ipcMain } = require( 'electron/main' );

const shellRoot = path.dirname( fileURLToPath( import.meta.url ) );
const appRoot = path.resolve( shellRoot, '..' );
const distRoot = path.join( appRoot, 'dist' );
const args = process.argv.slice( 1 );
const option = ( name, fallback = null ) => {
  const prefix = `--${ name }=`;
  const inline = args.find( ( argument ) => argument.startsWith( prefix ) );
  if ( inline ) return inline.slice( prefix.length );
  const index = args.indexOf( `--${ name }` );
  return index >= 0 ? args[ index + 1 ] : fallback;
};
const flag = ( name ) => args.includes( `--${ name }` );

const scorePath = option( 'score' );
const oscPort = Number( option( 'osc-port', 0 ) );
const wsPort = Number( option( 'ws-port', 0 ) );
let launchContext = Object.freeze( {
  endpoint: option( 'endpoint', '' ),
  toolSessionID: option( 'tool-session', '' ),
  scorePath: scorePath ? path.resolve( scorePath ) : null,
  ownerPID: Number( option( 'owner-pid', 0 ) ) || 0
} );
function localDevelopmentURL( value ) {
  if ( !value ) return '';
  const url = new URL( value );
  if ( ![ 'http:', 'https:' ].includes( url.protocol )
    || ![ '127.0.0.1', 'localhost', '[::1]' ].includes( url.hostname ) ) {
    throw new Error( '--dev-url must use HTTP(S) on a loopback host.' );
  }
  return url.href;
}
const developmentURL = localDevelopmentURL(
  option( 'dev-url', process.env.SCORE_STUDIO_DEV_URL ?? '' )
);
const smokeSavePath = option( 'smoke-save' );
const smokeHosted = flag( 'smoke-hosted' );
const closeAfterFocus = flag( 'smoke-close-after-focus' );
const focusExisting = flag( 'focus-existing' );
const smoke = Boolean( smokeSavePath || smokeHosted || closeAfterFocus || focusExisting );
const sessionStates = new Map();
let mainWindow = null;
let hostedBridge = null;
let ownerTimer = null;

app.setName( 'AWB Score Studio' );
const gotLock = app.requestSingleInstanceLock( {
  action: focusExisting ? 'focus' : 'launch', launchContext
} );
if ( !gotLock ) app.quit();

function assertSender( event ) {
  if ( !mainWindow || event.sender.id !== mainWindow.webContents.id ) {
    throw new Error( 'Rejected Score Studio IPC from an unknown renderer.' );
  }
}

async function scoreRecord( target ) {
  if ( !target ) return null;
  return { path: target, name: path.basename( target ), text: await readFile( target, 'utf8' ) };
}

async function directoryRecord( target ) {
  const names = ( await readdir( target, { withFileTypes: true } ) )
    .filter( ( entry ) => entry.isFile() && entry.name.endsWith( '.score.json' ) )
    .map( ( entry ) => entry.name )
    .sort( ( a, b ) => a.localeCompare( b ) );
  return {
    handle: { kind: 'desktop-directory', name: path.basename( target ), path: target },
    name: path.basename( target ),
    files: names.map( ( name ) => ( {
      name, handle: { kind: 'desktop-file', name, path: path.join( target, name ) }
    } ) )
  };
}

function safeBundledPath( url ) {
  const relative = `${ url }`.replace( /^[./\\]+/, '' );
  const target = path.resolve( distRoot, relative );
  if ( target !== distRoot && !target.startsWith( `${ distRoot }${ path.sep }` ) ) {
    throw new Error( 'Bundled score path escaped the built application.' );
  }
  return target;
}

function registerIPC() {
  ipcMain.handle( 'awb:initial-score', async ( event ) => {
    assertSender( event );
    return scoreRecord( launchContext.scorePath );
  } );
  ipcMain.handle( 'awb:open-score', async ( event ) => {
    assertSender( event );
    const result = await dialog.showOpenDialog( mainWindow, {
      properties: [ 'openFile' ],
      filters: [ { name: 'AWB score', extensions: [ 'json' ] } ]
    } );
    return result.canceled ? null : scoreRecord( result.filePaths[ 0 ] );
  } );
  ipcMain.handle( 'awb:bundled-score', async ( event, { url, name } ) => {
    assertSender( event );
    const target = safeBundledPath( url );
    return { path: target, name, text: await readFile( target, 'utf8' ) };
  } );
  ipcMain.handle( 'awb:open-score-directory', async ( event ) => {
    assertSender( event );
    const result = await dialog.showOpenDialog( mainWindow, { properties: [ 'openDirectory' ] } );
    return result.canceled ? null : directoryRecord( result.filePaths[ 0 ] );
  } );
  ipcMain.handle( 'awb:refresh-score-directory', async ( event, directory ) => {
    assertSender( event );
    return directoryRecord( directory.handle.path );
  } );
  ipcMain.handle( 'awb:open-directory-score', async ( event, item ) => {
    assertSender( event );
    return scoreRecord( item.handle.path );
  } );
  ipcMain.handle( 'awb:save-canonical', async ( event, request ) => {
    assertSender( event );
    let target = request.saveAs ? null : request.path;
    if ( !target ) {
      const result = await dialog.showSaveDialog( mainWindow, {
        defaultPath: request.suggestedName,
        filters: [ { name: 'AWB score', extensions: [ 'json' ] } ]
      } );
      if ( result.canceled ) return null;
      target = result.filePath;
    }
    const guarded = !request.saveAs && request.path === target;
    await saveCanonicalPath( target, request.text, {
      expectedHash: guarded ? request.expectedHash : null
    } );
    return { path: target, name: path.basename( target ) };
  } );
  ipcMain.handle( 'awb:save-projection', async ( event, request ) => {
    assertSender( event );
    let target = request.saveAs ? null : request.path;
    if ( !target ) {
      const result = await dialog.showSaveDialog( mainWindow, {
        defaultPath: request.suggestedName,
        filters: [ { name: 'SuperCollider score projection', extensions: [ 'scd' ] } ]
      } );
      if ( result.canceled ) return null;
      target = result.filePath;
    }
    const guarded = !request.saveAs && request.path === target;
    if ( guarded ) await saveProjectionPath( target, request.text, { expectedText: request.expectedText } );
    else await atomicWriteText( target, request.text );
    return { path: target, name: path.basename( target ) };
  } );
  ipcMain.on( 'awb:session-state', ( event, state ) => {
    assertSender( event );
    if ( state?.scoreID ) sessionStates.set( state.scoreID, Object.freeze( {
      ...state, processID: process.pid, windowID: mainWindow.id
    } ) );
  } );
  ipcMain.handle( 'awb:focus-window', ( event ) => {
    assertSender( event );
    focusWindow();
    return true;
  } );
  ipcMain.handle( 'awb:shell-state', ( event ) => {
    assertSender( event );
    return {
      kind: 'desktop',
      processID: process.pid,
      windowID: mainWindow.id,
      focused: mainWindow.isFocused(),
      visible: mainWindow.isVisible(),
      minimized: mainWindow.isMinimized(),
      sessions: [ ...sessionStates.values() ]
    };
  } );
  ipcMain.handle( 'awb:close-window', ( event ) => {
    assertSender( event );
    mainWindow.close();
    return true;
  } );
}

function focusWindow() {
  if ( !mainWindow ) return;
  if ( mainWindow.isMinimized() ) mainWindow.restore();
  mainWindow.show();
  mainWindow.focus();
}

async function runSmokeChecks() {
  if ( smokeSavePath ) {
    const expectedName = launchContext.scorePath ? path.basename( launchContext.scorePath ) : 'not saved';
    const loadedName = await mainWindow.webContents.executeJavaScript( `new Promise((resolve, reject) => {
      const started = Date.now();
      const check = () => {
        const value = document.querySelector('.filePanel .identity dd')?.textContent;
        if (value === ${ JSON.stringify( expectedName ) }) resolve(value);
        else if (Date.now() - started > 10000) reject(new Error('renderer did not load the launch score'));
        else setTimeout(check, 25);
      };
      check();
    })` );
    const sourceText = await readFile( launchContext.scorePath, 'utf8' );
    await mainWindow.webContents.executeJavaScript( `window.awbDesktopHost.saveCanonical({
      path: ${ JSON.stringify( path.resolve( smokeSavePath ) ) },
      suggestedName: 'smoke.score.json',
      text: ${ JSON.stringify( sourceText ) },
      expectedHash: null,
      saveAs: false
    })` );
    console.log( `SCORE_STUDIO_SHELL_SMOKE_SAVED path=${ path.resolve( smokeSavePath ) }` );
    console.log( `SCORE_STUDIO_SHELL_READY score=${ loadedName } pid=${ process.pid }` );
  }
  if ( smokeHosted ) {
    await mainWindow.webContents.executeJavaScript( `new Promise((resolve, reject) => {
      const started = Date.now();
      const check = () => {
        if (document.body.innerText.includes('installed atomically.')) resolve(true);
        else if (Date.now() - started > 20000) reject(new Error('hosted revision was not installed'));
        else setTimeout(check, 25);
      };
      check();
    })` );
    console.log( 'SCORE_STUDIO_SHELL_HOSTED_INSTALLED' );
    setTimeout( () => mainWindow?.close(), 100 );
  }
}

async function prepareHostedBridge() {
  if ( launchContext.endpoint || !oscPort ) return;
  if ( !Number.isInteger( oscPort ) || oscPort <= 0 || oscPort > 65535 ) {
    throw new Error( `Invalid --osc-port: ${ oscPort }` );
  }
  if ( !Number.isInteger( wsPort ) || wsPort < 0 || wsPort > 65535 ) {
    throw new Error( `Invalid --ws-port: ${ wsPort }` );
  }
  hostedBridge = await createHostedBridge( { oscPort, port: wsPort } );
  launchContext = Object.freeze( { ...launchContext, endpoint: hostedBridge.endpoint } );
}

async function createWindow() {
  const contextArgument = `--awb-launch-context=${ encodeURIComponent( JSON.stringify( launchContext ) ) }`;
  mainWindow = new BrowserWindow( {
    width: 1440,
    height: 900,
    show: true,
    webPreferences: {
      preload: path.join( shellRoot, 'preload.cjs' ),
      additionalArguments: [ contextArgument ],
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true
    }
  } );
  mainWindow.on( 'closed', () => {
    mainWindow = null;
    if ( smoke ) console.log( 'SCORE_STUDIO_SHELL_CLOSED' );
    hostedBridge?.close().catch( () => {} );
  } );
  mainWindow.webContents.setWindowOpenHandler( () => ( { action: 'deny' } ) );
  mainWindow.webContents.on( 'will-navigate', ( event, url ) => {
    const allowed = developmentURL ? url.startsWith( developmentURL ) : url.startsWith( 'file:' );
    if ( !allowed ) event.preventDefault();
  } );
  if ( developmentURL ) await mainWindow.loadURL( developmentURL );
  else await mainWindow.loadFile( path.join( distRoot, 'index.html' ) );
  await runSmokeChecks();
}

if ( gotLock ) {
  app.on( 'second-instance', ( event, commandLine, workingDirectory, additionalData ) => {
    if ( additionalData?.launchContext?.scorePath
      && additionalData.launchContext.scorePath !== launchContext.scorePath ) {
      console.error( `Score Studio already owns ${ launchContext.scorePath ?? 'an unsaved score'}; the second score was not adopted.` );
    }
    focusWindow();
    if ( smoke ) console.log( 'SCORE_STUDIO_SHELL_FOCUSED' );
    if ( closeAfterFocus ) setTimeout( () => mainWindow?.close(), 100 );
  } );
  app.whenReady().then( async () => {
    await prepareHostedBridge();
    registerIPC();
    await createWindow();
    if ( launchContext.ownerPID > 0 ) ownerTimer = setInterval( () => {
      try { process.kill( launchContext.ownerPID, 0 ); }
      catch { mainWindow?.close(); }
    }, 1000 );
  } ).catch( ( error ) => {
    console.error( error );
    app.exit( 1 );
  } );
  app.on( 'activate', () => {
    if ( BrowserWindow.getAllWindows().length === 0 ) createWindow();
    else focusWindow();
  } );
  app.on( 'window-all-closed', () => {
    if ( ownerTimer ) clearInterval( ownerTimer );
    app.quit();
  } );
}
