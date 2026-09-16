import crypto from 'node:crypto';
import path from 'node:path';
import process from 'node:process';
import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { grantedCapabilities, publicManifest, SHELL_PROTOCOL } from '../src/contract.mjs';
import { LaunchRouter } from '../src/launchRouter.mjs';
import { loadToolArtifacts } from '../src/manifestLoader.mjs';
import { ViewRegistry } from '../src/viewRegistry.mjs';

const require = createRequire( import.meta.url );
const { app, BrowserWindow, ipcMain } = require( 'electron/main' );
const shellRoot = path.dirname( fileURLToPath( import.meta.url ) );
const appRoot = path.resolve( shellRoot, '..' );
const preloadPath = path.join( shellRoot, 'preload.cjs' );
const shellInstanceID = crypto.randomUUID();
const registry = new ViewRegistry();
const windows = new Map();
const senderRecords = new Map();
const ownerTimers = new Map();
let homeWindow = null;
let quitting = false;
let tools = new Map();
let manifestFailures = [];
let router;
const smokeHome = process.argv.includes( '--smoke-home' );

const SUPPORTED_CAPABILITIES = Object.freeze( {
  filesystem: [ 'open-file', 'open-directory', 'save-file' ],
  media: [], connections: [ 'hosted-timeline' ]
} );

function option( args, name, fallback = null ) {
  const inline = args.find( ( value ) => value.startsWith( `--${ name }=` ) );
  if ( inline ) return inline.slice( name.length + 3 );
  const index = args.indexOf( `--${ name }` );
  return index >= 0 ? args[ index + 1 ] : fallback;
}

function positivePID( value ) {
  const pid = Number( value );
  return Number.isInteger( pid ) && pid > 0 ? pid : null;
}

function launchRequestFromArgs( rawArgs ) {
  const args = rawArgs.slice( rawArgs[ 0 ]?.endsWith( '.mjs' ) ? 1 : 0 );
  const toolID = option( args, 'tool' );
  if ( !toolID ) return null;
  const score = option( args, 'score' );
  const endpoint = option( args, 'endpoint' );
  const oscPort = Number( option( args, 'osc-port', 0 ) ) || null;
  const ownerPID = positivePID( option( args, 'owner-pid' ) );
  return {
    toolID,
    toolSessionID: option( args, 'tool-session' ),
    profileID: option( args, 'profile', ownerPID || endpoint || oscPort ? 'attached' : 'standalone' ),
    launchOrigin: option( args, 'origin', 'supercollider' ),
    owner: ownerPID ? { kind: 'attached-process', pid: ownerPID } : { kind: 'none', pid: null },
    connections: { ...( endpoint ? { endpoint } : {} ), ...( oscPort ? { oscPort } : {} ) },
    payload: { ...( score ? { scorePath: path.resolve( score ) } : {} ) }
  };
}

function encodedContextArgument( context ) {
  return `--awb-launch-context=${ encodeURIComponent( JSON.stringify( context ) ) }`;
}

function secureWindowOptions( width, height, context ) {
  return { width, height, show: false, webPreferences: { preload: preloadPath,
    additionalArguments: [ encodedContextArgument( context ) ], contextIsolation: true,
    nodeIntegration: false, sandbox: true } };
}

function bindNavigationGuards( window, allowed ) {
  window.webContents.setWindowOpenHandler( () => ( { action: 'deny' } ) );
  window.webContents.on( 'will-navigate', ( event, url ) => { if ( !allowed( url ) ) event.preventDefault(); } );
}

function viewSnapshot( view ) {
  const tool = tools.get( view.toolID );
  return { viewID: view.viewID, toolID: view.toolID, toolName: tool?.name ?? view.toolID,
    toolSessionID: view.toolSessionID, launchOrigin: view.launchOrigin, lifecycle: view.lifecycle,
    owner: view.owner, sessionState: view.sessionState, lastError: view.lastError ?? null };
}

function shellSnapshot() {
  return { shellProtocol: SHELL_PROTOCOL, shellInstanceID, processID: process.pid,
    tools: [ ...tools.values() ].map( publicManifest ), views: registry.list().map( viewSnapshot ),
    failures: manifestFailures };
}

function notifyHome() {
  if ( homeWindow && !homeWindow.isDestroyed() ) homeWindow.webContents.send( 'awb:command', { type: 'shell-registry-changed' } );
}

async function createHomeWindow() {
  if ( homeWindow && !homeWindow.isDestroyed() ) {
    if ( homeWindow.isMinimized() ) homeWindow.restore();
    homeWindow.show(); homeWindow.focus(); return homeWindow;
  }
  const context = Object.freeze( { shellProtocol: SHELL_PROTOCOL, shellInstanceID, viewID: 'toolkit-home',
    tool: { id: 'awb-toolkit-home', version: app.getVersion() }, toolSessionID: null,
    launchOrigin: 'desktop', owner: { kind: 'none', pid: null },
    grantedCapabilities: { filesystem: [], media: [], connections: [] }, connections: {}, payload: {} } );
  const window = new BrowserWindow( secureWindowOptions( 1080, 760, context ) );
  const senderID = window.webContents.id;
  homeWindow = window;
  senderRecords.set( senderID, { kind: 'home' } );
  bindNavigationGuards( window, ( url ) => url.startsWith( 'file:' ) );
  window.once( 'ready-to-show', () => window.show() );
  window.on( 'closed', () => { senderRecords.delete( senderID ); if ( homeWindow === window ) homeWindow = null; } );
  await window.loadFile( path.join( appRoot, 'home/index.html' ) );
  return window;
}

function launchContextFor( viewID, request, tool ) {
  return Object.freeze( { shellProtocol: SHELL_PROTOCOL, shellInstanceID, viewID,
    tool: { id: tool.id, version: tool.version }, toolSessionID: request.toolSessionID,
    launchOrigin: request.launchOrigin, owner: request.owner,
    grantedCapabilities: grantedCapabilities( tool.capabilities, SUPPORTED_CAPABILITIES ),
    connections: request.connections, payload: request.payload } );
}

async function createToolWindow( { viewID, request, tool } ) {
  registry.update( viewID, { lifecycle: 'loading' } );
  const context = launchContextFor( viewID, request, tool );
  const window = new BrowserWindow( secureWindowOptions( tool.view.defaultWidth, tool.view.defaultHeight, context ) );
  const senderID = window.webContents.id;
  windows.set( viewID, window ); senderRecords.set( senderID, { kind: 'tool', viewID } );
  bindNavigationGuards( window, ( url ) => url.startsWith( 'file:' ) );
  window.once( 'ready-to-show', () => window.show() );
  window.webContents.on( 'render-process-gone', ( event, details ) => {
    if ( registry.get( viewID ) ) registry.update( viewID, { lifecycle: 'failed', lastError: `renderer-${ details.reason }` } );
  } );
  window.on( 'closed', () => finalizeView( viewID, window, senderID ) );
  if ( request.owner.kind === 'attached-process' && request.owner.pid ) monitorOwner( viewID, request.owner.pid );
  await window.loadFile( tool.renderer.entryPath );
  notifyHome();
}

function monitorOwner( viewID, pid ) {
  const timer = setInterval( () => {
    try { process.kill( pid, 0 ); }
    catch {
      const view = registry.get( viewID );
      if ( view && ![ 'closing', 'closed' ].includes( view.lifecycle ) ) {
        registry.update( viewID, { lifecycle: 'closing', lastError: 'owner-lost' } );
        closeToolView( viewID );
      }
    }
  }, 750 );
  timer.unref(); ownerTimers.set( viewID, timer );
}

function finalizeView( viewID, window, senderID ) {
  senderRecords.delete( senderID ); windows.delete( viewID );
  clearInterval( ownerTimers.get( viewID ) ); ownerTimers.delete( viewID );
  if ( registry.get( viewID ) ) { registry.update( viewID, { lifecycle: 'closed' } ); registry.remove( viewID ); }
  notifyHome();
  if ( !quitting && windows.size === 0 ) createHomeWindow().catch( reportFatal );
}

async function focusToolView( viewID ) {
  const window = windows.get( viewID );
  if ( !window || window.isDestroyed() ) throw new Error( `View ${ viewID } is unavailable.` );
  if ( window.isMinimized() ) window.restore(); window.show(); window.focus();
}

async function closeToolView( viewID ) {
  const window = windows.get( viewID ); if ( !window || window.isDestroyed() ) return false;
  const view = registry.get( viewID );
  if ( view && view.lifecycle !== 'closing' ) registry.update( viewID, { lifecycle: 'closing' } );
  window.webContents.send( 'awb:command', { type: 'dispose', viewID } );
  setTimeout( () => { if ( !window.isDestroyed() ) window.close(); }, 150 ).unref();
  notifyHome(); return true;
}

function senderRecord( event ) {
  const record = senderRecords.get( event.sender.id );
  if ( !record || event.sender.isDestroyed() ) throw new Error( 'Rejected IPC from an unregistered renderer.' );
  return record;
}

function boundedRendererState( state ) {
  if ( !state || typeof state !== 'object' || Array.isArray( state ) ) throw new Error( 'Renderer state must be an object.' );
  if ( Buffer.byteLength( JSON.stringify( state ) ) > 16 * 1024 ) throw new Error( 'Renderer state is too large.' );
  return structuredClone( state );
}

function registerIPC() {
  ipcMain.on( 'awb:report-ready', ( event, state ) => {
    const sender = senderRecord( event );
    if ( sender.kind === 'home' ) {
      console.log( 'AWB_SHELL_HOME_READY' );
      if ( smokeHome ) setTimeout( () => app.quit(), 50 );
      return;
    }
    const view = registry.get( sender.viewID ); const safe = boundedRendererState( state );
    if ( safe.toolID && safe.toolID !== view.toolID ) throw new Error( 'Renderer tool identity mismatch.' );
    if ( safe.viewID && safe.viewID !== view.viewID ) throw new Error( 'Renderer view identity mismatch.' );
    if ( safe.toolSessionID && safe.toolSessionID !== view.toolSessionID ) throw new Error( 'Renderer ToolSession mismatch.' );
    registry.update( sender.viewID, { lifecycle: 'ready' } ); notifyHome();
  } );
  ipcMain.on( 'awb:report-session-state', ( event, state ) => {
    const sender = senderRecord( event ); if ( sender.kind === 'tool' ) registry.update( sender.viewID, { sessionState: boundedRendererState( state ) } ); notifyHome();
  } );
  ipcMain.on( 'awb:report-detailed-state', ( event, state ) => {
    const sender = senderRecord( event ); if ( sender.kind === 'tool' ) registry.update( sender.viewID, { detailedState: boundedRendererState( state ) } );
  } );
  ipcMain.handle( 'awb:focus-view', async ( event ) => { const sender = senderRecord( event ); if ( sender.kind !== 'tool' ) return false; await focusToolView( sender.viewID ); return true; } );
  ipcMain.handle( 'awb:close-view', async ( event ) => { const sender = senderRecord( event ); return sender.kind === 'tool' && closeToolView( sender.viewID ); } );
  ipcMain.handle( 'awb:shell-state', ( event ) => { senderRecord( event ); return shellSnapshot(); } );
  ipcMain.handle( 'awb:request', async ( event, request ) => {
    const sender = senderRecord( event );
    if ( !request || typeof request.operation !== 'string' || request.operation.length > 128 ) throw new Error( 'Invalid shell operation.' );
    boundedRendererState( request.payload ?? {} );
    if ( sender.kind === 'home' ) {
      if ( request.operation === 'shell.snapshot' ) return shellSnapshot();
      if ( request.operation === 'shell.launch' ) return router.launch( request.payload );
      if ( request.operation === 'shell.focus' ) { await focusToolView( request.payload.viewID ); return true; }
      if ( request.operation === 'shell.close' ) return closeToolView( request.payload.viewID );
    }
    throw new Error( `Operation is not available: ${ request.operation }.` );
  } );
}

async function loadTools() {
  const config = JSON.parse( await readFile( path.join( appRoot, 'tools.json' ), 'utf8' ) );
  const roots = config.artifacts.map( ( item ) => path.resolve( appRoot, item ) );
  const loaded = await loadToolArtifacts( roots ); tools = loaded.tools; manifestFailures = loaded.failures;
}

function reportFatal( error ) { console.error( error?.stack ?? error ); app.exit( 1 ); }

app.setName( 'AWB Toolkit' );
const initialRequest = launchRequestFromArgs( process.argv.slice( 1 ) );
const gotLock = app.requestSingleInstanceLock( { launchRequest: initialRequest } );
if ( !gotLock ) app.quit();

if ( gotLock ) {
  app.on( 'second-instance', ( event, commandLine, workingDirectory, additionalData ) => {
    const request = additionalData?.launchRequest ?? launchRequestFromArgs( commandLine );
    if ( request ) router.launch( request ).catch( reportFatal ); else createHomeWindow().catch( reportFatal );
  } );
  app.whenReady().then( async () => {
    await loadTools(); registerIPC();
    router = new LaunchRouter( { tools, registry, createView: createToolWindow, focusView: focusToolView } );
    registry.subscribe( notifyHome );
    await createHomeWindow();
    if ( initialRequest ) await router.launch( initialRequest );
  } ).catch( reportFatal );
  app.on( 'activate', () => createHomeWindow().catch( reportFatal ) );
  app.on( 'window-all-closed', () => { if ( !quitting ) createHomeWindow().catch( reportFatal ); } );
  app.on( 'before-quit', () => { quitting = true; } );
}

export { launchRequestFromArgs };
