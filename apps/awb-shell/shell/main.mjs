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
import { FileGrantStore } from '../src/fileGrants.mjs';
import { atomicWriteText, guardedWriteText } from '../src/nativeFiles.mjs';
import { ServiceRegistry } from '../src/serviceRegistry.mjs';
import { documentKindIDForPath, RecentStore } from '../src/recentStore.mjs';
import { createOscWebSocketRelay } from '../services/oscWebSocketRelay.mjs';
import {
  permitsDisplayMediaRequest, permitsMediaCheck, permitsMediaRequest, responseHeadersForTool
} from '../src/rendererPolicy.mjs';

const require = createRequire( import.meta.url );
const { app, BrowserWindow, desktopCapturer, dialog, ipcMain, session, webContents } = require( 'electron/main' );
const shellRoot = path.dirname( fileURLToPath( import.meta.url ) );
const appRoot = path.resolve( shellRoot, '..' );
const preloadPath = path.join( shellRoot, 'preload.cjs' );
const shellInstanceID = crypto.randomUUID();
const registry = new ViewRegistry();
const windows = new Map();
const senderRecords = new Map();
const ownerTimers = new Map();
const serviceReleases = new Map();
const hostSubscriptions = new Map();
const fileGrants = new FileGrantStore();
const services = new ServiceRegistry( createOscWebSocketRelay );
let recentStore;
let homeWindow = null;
let quitting = false;
let servicesClosed = false;
let serviceShutdown = null;
let tools = new Map();
let manifestFailures = [];
let router;
const smokeHome = process.argv.includes( '--smoke-home' );
const smokeMultiview = process.argv.includes( '--smoke-multiview' );
const smokeHosted = process.argv.includes( '--smoke-hosted' );
const smokeOwnerLoss = process.argv.includes( '--smoke-owner-loss' );
const smokeExternalRouter = process.argv.includes( '--smoke-external-router' );
const smokeMultitool = process.argv.includes( '--smoke-multitool' );
let smokeRunning = false;
let homeReadyCount = 0;
const externalSmokeResults = [];

function loopbackDevelopmentURL( value ) {
  if ( !value ) return '';
  const url = new URL( value );
  if ( ![ 'http:', 'https:' ].includes( url.protocol )
    || ![ '127.0.0.1', 'localhost', '[::1]' ].includes( url.hostname ) ) {
    throw new Error( '--dev-url must use HTTP(S) on a loopback host.' );
  }
  return url.href;
}
const developmentURL = loopbackDevelopmentURL( option( process.argv, 'dev-url', '' ) );

const SUPPORTED_CAPABILITIES = Object.freeze( {
  filesystem: [ 'open-file', 'open-directory', 'save-file' ],
  media: [ 'audio-input', 'system-audio' ], connections: [ 'hosted-timeline' ]
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

function hostConfigurationFromRequest( request ) {
  const oscPort = Number( request?.connections?.oscPort );
  if ( !Number.isInteger( oscPort ) || oscPort < 1 || oscPort > 65535 ) return null;
  return Object.freeze( { oscHost: request.connections.oscHost ?? '127.0.0.1', oscPort } );
}

function hostConfigurationFromArgs( args ) {
  const oscPort = Number( option( args, 'osc-port', 0 ) );
  if ( !Number.isInteger( oscPort ) || oscPort < 1 || oscPort > 65535 ) return null;
  return Object.freeze( { oscHost: option( args, 'osc-host', '127.0.0.1' ), oscPort } );
}

async function ensureHost( configuration ) {
  if ( !configuration ) return null;
  const service = await services.ensure( configuration );
  if ( !hostSubscriptions.has( service ) ) hostSubscriptions.set( service, service.subscribeHost?.( notifyHome ) ?? ( () => {} ) );
  return service;
}

function launchRequestFromArgs( rawArgs ) {
  const args = rawArgs.slice( rawArgs[ 0 ]?.endsWith( '.mjs' ) ? 1 : 0 );
  const toolID = option( args, 'tool' );
  if ( !toolID ) return null;
  const score = option( args, 'score' );
  const endpoint = option( args, 'endpoint' );
  const oscPort = Number( option( args, 'osc-port', 0 ) ) || null;
  const oscHost = option( args, 'osc-host', '127.0.0.1' );
  const ownerPID = positivePID( option( args, 'owner-pid' ) );
  return {
    toolID,
    toolSessionID: option( args, 'tool-session' ),
    profileID: option( args, 'profile', ownerPID || endpoint || oscPort ? 'attached' : 'standalone' ),
    launchOrigin: option( args, 'origin', 'supercollider' ),
    owner: ownerPID ? { kind: 'attached-process', pid: ownerPID } : { kind: 'none', pid: null },
    connections: { ...( endpoint ? { endpoint } : {} ), ...( oscPort ? { oscPort, oscHost } : {} ) },
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
  const binding = tool?.hostBindings.nodeManager && view.toolSessionID ? {
    toolSource: tool.hostBindings.nodeManager.toolSource, toolInstance: view.toolSessionID
  } : null;
  return { viewID: view.viewID, toolID: view.toolID, toolName: tool?.name ?? view.toolID,
    toolSessionID: view.toolSessionID, launchOrigin: view.launchOrigin, lifecycle: view.lifecycle,
    owner: view.owner, sessionState: view.sessionState, lastError: view.lastError ?? null,
    liveRuntime: binding ? services.projectionForBinding( binding ) : { containers: [], entries: [] } };
}

function shellSnapshot() {
  const serviceSnapshots = services.snapshot();
  const serviceHost = serviceSnapshots.find( ( item ) => item.host )?.host ?? {
    sclang: { status: 'absent' }, scsynth: { status: 'unavailable' },
    synthDefs: { status: 'unavailable' }, nodeManager: { status: 'unavailable' }
  };
  const scsynthStates = registry.list().map( ( view ) => view.sessionState?.scsynthStatus ).filter( Boolean );
  const scsynthStatus = scsynthStates.includes( 'ready' ) ? 'ready'
    : scsynthStates.includes( 'booting' ) ? 'booting' : serviceHost.scsynth.status;
  const host = { ...serviceHost, scsynth: { status: scsynthStatus } };
  return { shellProtocol: SHELL_PROTOCOL, shellInstanceID, processID: process.pid,
    tools: [ ...tools.values() ].map( ( tool ) => ( { ...publicManifest( tool ),
      documentKinds: tool.documentKinds.map( ( kind ) => ( { ...kind,
        recentItems: recentStore?.list( tool.id, kind.id ) ?? [] } ) ) } ) ),
    views: registry.list().map( viewSnapshot ),
    host, failures: manifestFailures };
}

async function launchDocument( payload ) {
  const tool = tools.get( payload.toolID );
  const kind = tool?.documentKinds.find( ( item ) => item.id === payload.documentKindID );
  if ( !tool || !kind || !kind.actions.includes( payload.action ) ) throw new Error( 'Document action is not declared by this tool.' );
  let target = null; let documentPayload = { documentKindID: kind.id };
  if ( payload.action === 'browse' ) {
    const result = await dialog.showOpenDialog( homeWindow, { properties: [ 'openFile' ],
      filters: [ { name: kind.label, extensions: [ ...kind.extensions ] } ] } );
    if ( result.canceled ) return { status: 'cancelled' };
    target = result.filePaths[ 0 ]; documentPayload = { ...documentPayload, scorePath: target };
  } else if ( payload.action === 'recent' ) {
    target = recentStore.resolve( payload.recentID, tool.id, kind.id ); documentPayload = { ...documentPayload, scorePath: target };
  } else documentPayload = { ...documentPayload, newDocumentID: crypto.randomUUID() };
  const result = await router.launch( { toolID: tool.id, profileID: kind.profileID, launchOrigin: 'desktop', payload: documentPayload } );
  if ( target && result.viewID ) registry.update( result.viewID, { pendingRecentPath: target, pendingDocumentKindID: kind.id } );
  return result;
}

function notifyHome() {
  if ( homeWindow && !homeWindow.isDestroyed() ) homeWindow.webContents.send( 'awb:command', { type: 'shell-registry-changed' } );
}

async function waitFor( predicate, timeout = 15000 ) {
  const started = Date.now();
  while ( !predicate() ) {
    if ( Date.now() - started > timeout ) throw new Error( 'Timed out during AWB shell smoke check.' );
    await new Promise( ( resolve ) => setTimeout( resolve, 25 ) );
  }
}

async function runHomeSmoke() {
  const result = await homeWindow.webContents.executeJavaScript( `new Promise((resolve, reject) => {
    const started = Date.now();
    const check = () => {
      const scoreActions = document.querySelectorAll('[data-document-tool="score-studio"]').length;
      const lissajousActions = document.querySelectorAll('[data-document-tool="lissajous"]').length;
      const hostFacts = document.querySelectorAll('.host-fact').length;
      if (scoreActions === 2 && lissajousActions === 0 && hostFacts === 4) resolve({ scoreActions, hostFacts });
      else if (Date.now() - started > 5000) reject(new Error('Toolkit Home document and host facts did not render'));
      else setTimeout(check, 25);
    }; check();
  })` );
  console.log( `AWB_SHELL_HOME_PROJECTIONS documents=${ result.scoreActions } hostFacts=${ result.hostFacts }` ); app.quit();
}

async function runMultiviewSmoke() {
  smokeRunning = true;
  const scorePath = option( process.argv, 'smoke-score' );
  const payload = scorePath ? { scorePath: path.resolve( scorePath ) } : {};
  const results = await homeWindow.webContents.executeJavaScript( `(async () => {
    const payload = ${ JSON.stringify( payload ) };
    const first = await window.awbHost.request('shell.launch', { toolID: 'score-studio', profileID: 'standalone', toolSessionID: 'smoke-a', launchOrigin: 'desktop', payload });
    const repeated = await window.awbHost.request('shell.launch', { toolID: 'score-studio', profileID: 'standalone', toolSessionID: 'smoke-a', launchOrigin: 'desktop', payload });
    const second = await window.awbHost.request('shell.launch', { toolID: 'score-studio', profileID: 'standalone', toolSessionID: 'smoke-b', launchOrigin: 'desktop', payload });
    return { first, repeated, second };
  })()` );
  if ( results.first.status !== 'accepted' || results.repeated.status !== 'focused-existing'
    || results.second.status !== 'accepted' || results.first.viewID !== results.repeated.viewID ) throw new Error( 'Multiview routing contract failed.' );
  await waitFor( () => registry.list().length === 2 && registry.list().every( ( view ) => view.lifecycle === 'ready' ) );
  console.log( 'AWB_SHELL_MULTIVIEW_READY views=2 repeated=focused-existing' );
  homeWindow.close(); await waitFor( () => !homeWindow );
  if ( windows.size !== 2 ) throw new Error( 'Closing Home disturbed tool views.' );
  console.log( 'AWB_SHELL_HOME_CLOSED tools=2' );
  await closeToolView( results.first.viewID ); await waitFor( () => windows.size === 1 );
  if ( !windows.has( results.second.viewID ) ) throw new Error( 'Closing one view disturbed the other.' );
  console.log( 'AWB_SHELL_VIEW_ISOLATION pass' );
  await closeToolView( results.second.viewID ); await waitFor( () => windows.size === 0 && homeReadyCount >= 2 );
  console.log( 'AWB_SHELL_HOME_RETURNED' );
  setTimeout( () => app.quit(), 50 );
}

async function runMultitoolSmoke() {
  smokeRunning = true;
  const score = await router.launch( { toolID: 'score-studio', profileID: 'standalone',
    toolSessionID: 'multitool-score', launchOrigin: 'desktop' } );
  const lissajous = await router.launch( { toolID: 'lissajous', profileID: 'standalone',
    toolSessionID: 'multitool-lissajous', launchOrigin: 'desktop' } );
  if ( score.status !== 'accepted' || lissajous.status !== 'accepted' ) {
    throw new Error( `Multi-tool launch failed: score=${ JSON.stringify( score ) } lissajous=${ JSON.stringify( lissajous ) }` );
  }
  await waitFor( () => registry.list().length === 2 && registry.list().every( ( view ) => view.lifecycle === 'ready' ), 25000 );
  const lissajousView = registry.get( lissajous.viewID );
  if ( lissajousView?.sessionState?.audioRequestedChannels !== 16 ) {
    throw new Error( 'Lissajous did not request its default multichannel input.' );
  }
  const lissajousContract = await windows.get( lissajous.viewID ).webContents.executeJavaScript( `( {
    media: globalThis.awbHost.capabilities().media
  } )` );
  if ( !lissajousContract.media.includes( 'audio-input' ) ) {
    throw new Error( `Lissajous renderer policy was not installed: ${ JSON.stringify( lissajousContract ) }` );
  }
  if ( !lissajousContract.media.includes( 'system-audio' ) ) {
    throw new Error( `Lissajous system-audio policy was not installed: ${ JSON.stringify( lissajousContract ) }` );
  }
  console.log( 'AWB_SHELL_MULTITOOL_READY score-studio=ready lissajous=ready requestedChannels=16' );
  await closeToolView( score.viewID ); await waitFor( () => windows.size === 1 );
  if ( !windows.has( lissajous.viewID ) ) throw new Error( 'Closing Score Studio disturbed Lissajous.' );
  await closeToolView( lissajous.viewID ); await waitFor( () => windows.size === 0 );
  console.log( 'AWB_SHELL_MULTITOOL_ISOLATION pass' );
  app.quit();
}

async function runOwnerLossSmoke() {
  smokeRunning = true;
  const ownerA = positivePID( option( process.argv, 'owner-a' ) );
  const ownerB = positivePID( option( process.argv, 'owner-b' ) );
  if ( !ownerA || !ownerB ) throw new Error( 'Owner-loss smoke requires two owner PIDs.' );
  const scorePath = option( process.argv, 'smoke-score' );
  const first = await router.launch( { toolID: 'score-studio', profileID: 'attached', toolSessionID: 'owner-a',
    launchOrigin: 'supercollider', owner: { kind: 'attached-process', pid: ownerA }, payload: { scorePath } } );
  const second = await router.launch( { toolID: 'score-studio', profileID: 'attached', toolSessionID: 'owner-b',
    launchOrigin: 'supercollider', owner: { kind: 'attached-process', pid: ownerB }, payload: { scorePath } } );
  await waitFor( () => registry.list().length === 2 && registry.list().every( ( view ) => view.lifecycle === 'ready' ) );
  console.log( 'AWB_SHELL_OWNER_VIEWS_READY' );
  await waitFor( () => windows.size === 1, 12000 );
  if ( windows.has( first.viewID ) || !windows.has( second.viewID ) ) throw new Error( 'Owner loss affected the wrong view.' );
  try { process.kill( ownerB, 0 ); } catch { throw new Error( 'Shell terminated an attached owner process.' ); }
  console.log( 'AWB_SHELL_OWNER_ISOLATION pass' );
  await closeToolView( second.viewID ); await waitFor( () => windows.size === 0 ); app.quit();
}

async function runHostedSmoke( viewID ) {
  smokeRunning = true; const window = windows.get( viewID );
  const loadedName = path.basename( option( process.argv, 'score', '' ) );
  await window.webContents.executeJavaScript( `new Promise((resolve, reject) => {
    const started = Date.now();
    const check = () => {
      const text = document.body.innerText;
      const file = document.querySelector('.filePanel .identity dd')?.textContent;
      if (text.includes('installed atomically.') && text.includes('in desktop context')
        && file === ${ JSON.stringify( loadedName ) }) resolve(true);
      else if (Date.now() - started > 25000) reject(new Error('named hosted score or SynthDef context was not installed'));
      else setTimeout(check, 25);
    }; check();
  })` );
  const view = registry.get( viewID );
  await waitFor( () => recentStore.list( 'score-studio', 'score' ).some( ( item ) => item.name === loadedName ) );
  console.log( `AWB_SHELL_HOSTED_INSTALLED session=${ view.toolSessionID } score=${ loadedName } recent=recorded` );
  await closeToolView( viewID ); await waitFor( () => windows.size === 0 ); app.quit();
}

async function recordExternalSmokeResult( result ) {
  externalSmokeResults.push( result );
  if ( externalSmokeResults.length < 3 ) return;
  const [ first, repeated, second ] = externalSmokeResults;
  if ( first.status !== 'accepted' || repeated.status !== 'focused-existing' || second.status !== 'accepted'
    || first.viewID !== repeated.viewID || first.viewID === second.viewID || windows.size !== 2 ) {
    throw new Error( 'External single-instance launch routing failed.' );
  }
  console.log( 'AWB_SHELL_EXTERNAL_ROUTER views=2 repeated=focused-existing' );
  await closeToolView( first.viewID ); await closeToolView( second.viewID );
  await waitFor( () => windows.size === 0 ); app.quit();
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
  let effectiveRequest = request;
  if ( request.connections.oscPort ) {
    const policy = tool.connectionPolicies[ 'hosted-timeline' ];
    if ( !policy ) throw new Error( `${ tool.name } has no hosted-timeline relay policy.` );
    const configuration = hostConfigurationFromRequest( request ); await ensureHost( configuration );
    const acquired = await services.acquire( configuration, {
      allowedPrefixes: [ ...policy.allowedPrefixes ],
      clientIdentityAddresses: [ ...policy.clientIdentityAddresses ],
      disconnectAddresses: [ ...policy.disconnectAddresses ] } );
    serviceReleases.set( viewID, acquired.release );
    effectiveRequest = Object.freeze( { ...request, connections: Object.freeze( {
      ...request.connections, endpoint: acquired.endpoint
    } ) } );
  }
  const context = launchContextFor( viewID, effectiveRequest, tool );
  const window = new BrowserWindow( secureWindowOptions( tool.view.defaultWidth, tool.view.defaultHeight, context ) );
  const senderID = window.webContents.id;
  windows.set( viewID, window ); senderRecords.set( senderID, { kind: 'tool', viewID } );
  bindNavigationGuards( window, ( url ) => developmentURL ? url.startsWith( developmentURL ) : url.startsWith( 'file:' ) );
  window.once( 'ready-to-show', () => window.show() );
  window.webContents.on( 'render-process-gone', ( event, details ) => {
    if ( registry.get( viewID ) ) registry.update( viewID, { lifecycle: 'failed', lastError: `renderer-${ details.reason }` } );
  } );
  window.on( 'closed', () => finalizeView( viewID, window, senderID ) );
  if ( request.owner.kind === 'attached-process' && request.owner.pid ) monitorOwner( viewID, request.owner.pid );
  if ( developmentURL ) await window.loadURL( developmentURL );
  else await window.loadFile( tool.renderer.entryPath );
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
  fileGrants.releaseView( viewID );
  serviceReleases.get( viewID )?.().catch( ( error ) => console.error( error ) ); serviceReleases.delete( viewID );
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

function reportSenderRecord( event ) {
  if ( event.sender.isDestroyed() ) return null;
  return senderRecords.get( event.sender.id ) ?? null;
}

function boundedRendererState( state ) {
  if ( !state || typeof state !== 'object' || Array.isArray( state ) ) throw new Error( 'Renderer state must be an object.' );
  if ( Buffer.byteLength( JSON.stringify( state ) ) > 16 * 1024 ) throw new Error( 'Renderer state is too large.' );
  return structuredClone( state );
}

function boundedOperationPayload( payload ) {
  if ( !payload || typeof payload !== 'object' || Array.isArray( payload ) ) throw new Error( 'Operation payload must be an object.' );
  if ( Buffer.byteLength( JSON.stringify( payload ) ) > 20 * 1024 * 1024 ) throw new Error( 'Operation payload is too large.' );
  return payload;
}

function requireToolSender( sender ) {
  if ( sender.kind !== 'tool' ) throw new Error( 'Operation requires a tool view.' );
  const view = registry.get( sender.viewID ); const tool = tools.get( view?.toolID );
  if ( !view || !tool ) throw new Error( 'Tool view is unavailable.' );
  return { view, tool, window: windows.get( sender.viewID ) };
}

function requireCapability( tool, group, capability ) {
  if ( !tool.capabilities[ group ]?.includes( capability ) || !SUPPORTED_CAPABILITIES[ group ]?.includes( capability ) ) {
    throw new Error( `${ tool.id } was not granted ${ group }:${ capability }.` );
  }
}

function safeArtifactPath( tool, relative ) {
  if ( typeof relative !== 'string' || path.isAbsolute( relative ) ) throw new Error( 'Artifact path must be relative.' );
  const target = path.resolve( tool.artifactRoot, relative.replace( /^[./\\]+/, '' ) );
  if ( target !== tool.artifactRoot && !target.startsWith( `${ tool.artifactRoot }${ path.sep }` ) ) throw new Error( 'Artifact path escaped the tool artifact.' );
  return target;
}

async function handleToolOperation( sender, operation, payload ) {
  const { view, tool, window } = requireToolSender( sender );
  if ( operation === 'artifact.read-text' ) {
    const target = safeArtifactPath( tool, payload.path );
    return { name: payload.name ?? path.basename( target ), text: await readFile( target, 'utf8' ), handle: null };
  }
  if ( operation === 'filesystem.initial-file' ) {
    requireCapability( tool, 'filesystem', 'open-file' );
    if ( !view.requestPayload?.scorePath ) return null;
    registry.update( view.viewID, { pendingRecentPath: view.requestPayload.scorePath,
      pendingDocumentKindID: view.requestPayload.documentKindID
        ?? documentKindIDForPath( tool.documentKinds, view.requestPayload.scorePath ) } );
    return fileGrants.fileRecord( view.viewID, view.requestPayload.scorePath );
  }
  if ( operation === 'filesystem.open-file' ) {
    requireCapability( tool, 'filesystem', 'open-file' );
    const result = await dialog.showOpenDialog( window, { properties: [ 'openFile' ], filters: payload.filters ?? [] } );
    if ( result.canceled ) return null;
    registry.update( view.viewID, { pendingRecentPath: result.filePaths[ 0 ],
      pendingDocumentKindID: payload.documentKindID ?? null } );
    return fileGrants.fileRecord( view.viewID, result.filePaths[ 0 ] );
  }
  if ( operation === 'filesystem.open-directory' ) {
    requireCapability( tool, 'filesystem', 'open-directory' );
    const result = await dialog.showOpenDialog( window, { properties: [ 'openDirectory' ] } );
    if ( result.canceled ) return null;
    const handle = fileGrants.grant( view.viewID, result.filePaths[ 0 ], 'directory' );
    return fileGrants.listDirectory( view.viewID, handle, { suffix: payload.suffix ?? '' } );
  }
  if ( operation === 'filesystem.list-directory' ) {
    requireCapability( tool, 'filesystem', 'open-directory' );
    return fileGrants.listDirectory( view.viewID, payload.handle, { suffix: payload.suffix ?? '' } );
  }
  if ( operation === 'filesystem.read-file' ) {
    requireCapability( tool, 'filesystem', 'open-file' );
    const grant = fileGrants.resolve( view.viewID, payload.handle, 'file' );
    if ( payload.markRecent ) registry.update( view.viewID, { pendingRecentPath: grant.path,
      pendingDocumentKindID: payload.documentKindID ?? null } );
    return { handle: payload.handle, name: grant.name, text: await readFile( grant.path, 'utf8' ) };
  }
  if ( operation === 'filesystem.save-file' ) {
    requireCapability( tool, 'filesystem', 'save-file' );
    let target; let handle = payload.saveAs ? null : payload.handle;
    if ( handle ) target = fileGrants.resolve( view.viewID, handle, 'file' ).path;
    else {
      const result = await dialog.showSaveDialog( window, { defaultPath: payload.suggestedName, filters: payload.filters ?? [] } );
      if ( result.canceled ) return null;
      target = result.filePath; handle = fileGrants.grant( view.viewID, target, 'file' );
    }
    if ( payload.expectedText !== null && payload.expectedText !== undefined ) await guardedWriteText( target, payload.text, { expectedText: payload.expectedText } );
    else await atomicWriteText( target, payload.text );
    return { handle, name: path.basename( target ) };
  }
  throw new Error( `Operation is not available: ${ operation }.` );
}

function registerIPC() {
  ipcMain.on( 'awb:report-ready', ( event, state ) => {
    const sender = reportSenderRecord( event );
    if ( !sender ) return;
    if ( sender.kind === 'home' ) {
      homeReadyCount += 1;
      console.log( 'AWB_SHELL_HOME_READY' );
      if ( smokeHome ) runHomeSmoke().catch( reportFatal );
      else if ( smokeMultiview && !smokeRunning ) runMultiviewSmoke().catch( reportFatal );
      else if ( smokeMultitool && !smokeRunning ) runMultitoolSmoke().catch( reportFatal );
      else if ( smokeOwnerLoss && !smokeRunning ) runOwnerLossSmoke().catch( reportFatal );
      else if ( smokeExternalRouter ) smokeRunning = true;
      return;
    }
    const view = registry.get( sender.viewID ); const safe = boundedRendererState( state );
    if ( safe.toolID && safe.toolID !== view.toolID ) throw new Error( 'Renderer tool identity mismatch.' );
    if ( safe.viewID && safe.viewID !== view.viewID ) throw new Error( 'Renderer view identity mismatch.' );
    if ( safe.toolSessionID && safe.toolSessionID !== view.toolSessionID ) throw new Error( 'Renderer ToolSession mismatch.' );
    registry.update( sender.viewID, { lifecycle: 'ready' } ); notifyHome();
    if ( smokeHosted && !smokeRunning ) runHostedSmoke( sender.viewID ).catch( reportFatal );
  } );
  ipcMain.on( 'awb:report-session-state', ( event, state ) => {
    const sender = reportSenderRecord( event );
    if ( !sender ) return;
    if ( sender.kind === 'tool' ) registry.update( sender.viewID, { sessionState: boundedRendererState( state ) } ); notifyHome();
  } );
  ipcMain.on( 'awb:report-detailed-state', ( event, state ) => {
    const sender = reportSenderRecord( event );
    if ( !sender ) return;
    if ( sender.kind === 'tool' ) {
      const safe = boundedRendererState( state ); registry.update( sender.viewID, { detailedState: safe } );
      const view = registry.get( sender.viewID );
      if ( safe.validatedDocumentKindID && view?.pendingRecentPath
        && safe.validatedDocumentKindID === view.pendingDocumentKindID ) {
        recentStore.add( { toolID: view.toolID, documentKindID: safe.validatedDocumentKindID,
          target: view.pendingRecentPath } ).then( notifyHome ).catch( ( error ) => console.error( error ) );
        registry.update( sender.viewID, { pendingRecentPath: null } );
      }
      if ( safe.disposeAcknowledged && registry.get( sender.viewID )?.lifecycle === 'closing' ) windows.get( sender.viewID )?.close();
    }
  } );
  ipcMain.handle( 'awb:focus-view', async ( event ) => { const sender = senderRecord( event ); if ( sender.kind !== 'tool' ) return false; await focusToolView( sender.viewID ); return true; } );
  ipcMain.handle( 'awb:close-view', async ( event ) => { const sender = senderRecord( event ); return sender.kind === 'tool' && closeToolView( sender.viewID ); } );
  ipcMain.handle( 'awb:shell-state', ( event ) => { senderRecord( event ); return shellSnapshot(); } );
  ipcMain.handle( 'awb:request', async ( event, request ) => {
    const sender = senderRecord( event );
    if ( !request || typeof request.operation !== 'string' || request.operation.length > 128 ) throw new Error( 'Invalid shell operation.' );
    const payload = boundedOperationPayload( request.payload ?? {} );
    if ( sender.kind === 'home' ) {
      if ( request.operation === 'shell.snapshot' ) return shellSnapshot();
      if ( request.operation === 'shell.launch' ) return router.launch( payload );
      if ( request.operation === 'shell.launch-document' ) return launchDocument( payload );
      if ( request.operation === 'shell.focus' ) { await focusToolView( payload.viewID ); return true; }
      if ( request.operation === 'shell.close' ) return closeToolView( payload.viewID );
    }
    return handleToolOperation( sender, request.operation, payload );
  } );
}

async function loadTools() {
  const config = JSON.parse( await readFile( path.join( appRoot, 'tools.json' ), 'utf8' ) );
  const roots = config.artifacts.map( ( item ) => path.resolve( appRoot, item ) );
  const loaded = await loadToolArtifacts( roots ); tools = loaded.tools; manifestFailures = loaded.failures;
}

function toolForWebContents( webContents ) {
  const sender = senderRecords.get( webContents?.id );
  if ( sender?.kind !== 'tool' ) return null;
  const view = registry.get( sender.viewID );
  return tools.get( view?.toolID ) ?? null;
}

function registerRendererPolicies() {
  session.defaultSession.webRequest.onHeadersReceived( ( details, callback ) => {
    const sender = senderRecords.get( details.webContentsId );
    const view = sender?.kind === 'tool' ? registry.get( sender.viewID ) : null;
    callback( { responseHeaders: responseHeadersForTool( tools.get( view?.toolID ), details.responseHeaders ?? {} ) } );
  } );
  session.defaultSession.setPermissionRequestHandler( ( webContents, permission, callback, details ) => {
    callback( permitsMediaRequest( toolForWebContents( webContents ), permission, details ) );
  } );
  session.defaultSession.setPermissionCheckHandler( ( webContents, permission, _origin, details ) => (
    permitsMediaCheck( toolForWebContents( webContents ), permission, details )
  ) );
  session.defaultSession.setDisplayMediaRequestHandler( async ( request, callback ) => {
    const requestingContents = request.frame ? webContents.fromFrame( request.frame ) : null;
    if ( !permitsDisplayMediaRequest( toolForWebContents( requestingContents ), request ) ) {
      callback( {} ); return;
    }
    try {
      const sources = await desktopCapturer.getSources( {
        types: [ 'screen' ], thumbnailSize: { width: 0, height: 0 }
      } );
      if ( !sources.length ) callback( {} );
      else callback( { video: sources[ 0 ], audio: 'loopback' } );
    } catch ( error ) {
      console.error( `System audio capture failed: ${ error.message }` );
      callback( {} );
    }
  } );
}

function reportFatal( error ) { console.error( error?.stack ?? error ); quitting = true; app.exit( 1 ); }

app.setName( 'AWB Toolkit' );
const initialRequest = launchRequestFromArgs( process.argv.slice( 1 ) );
const gotLock = app.requestSingleInstanceLock( { launchRequest: initialRequest } );
if ( !gotLock ) app.quit();

if ( gotLock ) {
  app.on( 'second-instance', async ( event, commandLine, workingDirectory, additionalData ) => {
    const request = additionalData?.launchRequest ?? launchRequestFromArgs( commandLine );
    try {
      await ensureHost( hostConfigurationFromRequest( request ) ?? hostConfigurationFromArgs( commandLine ) );
      if ( request ) {
        const result = await router.launch( request );
        if ( smokeExternalRouter ) await recordExternalSmokeResult( result );
      } else await createHomeWindow();
    } catch ( error ) { reportFatal( error ); }
  } );
  app.whenReady().then( async () => {
    await loadTools();
    recentStore = new RecentStore( { filePath: path.join( app.getPath( 'userData' ), 'recent-documents.json' ) } );
    await recentStore.load(); registerIPC(); registerRendererPolicies();
    router = new LaunchRouter( { tools, registry, createView: createToolWindow, focusView: focusToolView } );
    registry.subscribe( notifyHome );
    await ensureHost( hostConfigurationFromRequest( initialRequest )
      ?? hostConfigurationFromArgs( process.argv.slice( 1 ) ) );
    await createHomeWindow();
    if ( initialRequest ) await router.launch( initialRequest );
  } ).catch( reportFatal );
  app.on( 'activate', () => createHomeWindow().catch( reportFatal ) );
  app.on( 'window-all-closed', () => { if ( !quitting ) createHomeWindow().catch( reportFatal ); } );
  app.on( 'before-quit', ( event ) => {
    quitting = true;
    if ( servicesClosed ) return;
    event.preventDefault();
    if ( !serviceShutdown ) serviceShutdown = ( async () => {
      for ( const unsubscribe of hostSubscriptions.values() ) unsubscribe();
      hostSubscriptions.clear(); await services.closeAll(); servicesClosed = true; app.quit();
    } )().catch( reportFatal );
  } );
}

export { launchRequestFromArgs };
