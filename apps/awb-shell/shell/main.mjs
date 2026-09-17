import crypto from 'node:crypto';
import path from 'node:path';
import process from 'node:process';
import { readFile, stat } from 'node:fs/promises';
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
import { createNativeAudioBroker } from '@awb/native-audio';
import { NativeAudioAccess } from '../src/nativeAudioAccess.mjs';
import { RenderJobBroker } from '../src/renderJobBroker.mjs';
import { resolveToolBindingFromProject } from '../src/scoreProjectResolver.mjs';
import { RenderOutputStore } from '../src/renderOutputStore.mjs';
import { NativeScHostSupervisor, openSuperColliderIDE } from '../src/nativeScHostSupervisor.mjs';
import {
  permitsDisplayMediaRequest, permitsMediaCheck, permitsMediaRequest, responseHeadersForTool
} from '../src/rendererPolicy.mjs';

const require = createRequire( import.meta.url );
const { app, BrowserWindow, desktopCapturer, dialog, ipcMain, MessageChannelMain, session, webContents } = require( 'electron/main' );
const shellRoot = path.dirname( fileURLToPath( import.meta.url ) );
const appRoot = path.resolve( shellRoot, '..' );
const preloadPath = path.join( shellRoot, 'preload.cjs' );
const shellInstanceID = crypto.randomUUID();
const shellHostToken = crypto.randomUUID();
const registry = new ViewRegistry();
const windows = new Map();
const senderRecords = new Map();
const ownerTimers = new Map();
const serviceReleases = new Map();
const nativeToolSessions = new Map();
const hostSubscriptions = new Map();
const fileGrants = new FileGrantStore();
const services = new ServiceRegistry( createOscWebSocketRelay );
const nativeAudio = new NativeAudioAccess( createNativeAudioBroker() );
const renderJobs = new RenderJobBroker();
const renderOutputs = new RenderOutputStore();
const nativeScHost = new NativeScHostSupervisor( { token: shellHostToken,
  bootstrapPath: path.join( appRoot, 'sc/AWBHeadlessHost.scd' ), onChange: () => notifyHome() } );
const renderExecutorID = `headless-local-${ crypto.randomUUID() }`;
let recentStore;
let homeWindow = null;
let quitting = false;
let servicesClosed = false;
let serviceShutdown = null;
let tools = new Map();
let manifestFailures = [];
let router;
let renderExecutorWindow = null;
let renderExecutorReady = false;
let renderExecutorLease = null;
const smokeHome = process.argv.includes( '--smoke-home' );
const smokeMultiview = process.argv.includes( '--smoke-multiview' );
const smokeHosted = process.argv.includes( '--smoke-hosted' );
const smokeOwnerLoss = process.argv.includes( '--smoke-owner-loss' );
const smokeExternalRouter = process.argv.includes( '--smoke-external-router' );
const smokeMultitool = process.argv.includes( '--smoke-multitool' );
const smokeRender = process.argv.includes( '--smoke-render' );
const smokeField = process.argv.includes( '--smoke-field' );
const smokeHeadlessSc = process.argv.includes( '--smoke-headless-sc' );
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
  media: [ 'audio-input', 'system-audio', 'native-audio' ],
  connections: [ 'hosted-timeline', 'hosted-field' ], rendering: [ 'local-render' ]
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
  return Object.freeze( { oscHost: request.connections.oscHost ?? '127.0.0.1', oscPort, hostToken: shellHostToken } );
}

function hostConfigurationFromArgs( args ) {
  const oscPort = Number( option( args, 'osc-port', process.env.AWB_SC_OSC_PORT ?? 57120 ) );
  if ( !Number.isInteger( oscPort ) || oscPort < 1 || oscPort > 65535 ) return null;
  return Object.freeze( { oscHost: option( args, 'osc-host', '127.0.0.1' ), oscPort, hostToken: shellHostToken } );
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
  const scoreSessionID = option( args, 'score-session' );
  const runID = option( args, 'run-id' );
  const projectPath = option( args, 'project' );
  const bindingID = option( args, 'binding' );
  return {
    toolID,
    toolSessionID: option( args, 'tool-session' ),
    profileID: option( args, 'profile', ownerPID || endpoint || oscPort ? 'attached' : 'headless' ),
    launchOrigin: option( args, 'origin', 'supercollider' ),
    owner: ownerPID ? { kind: 'attached-process', pid: ownerPID } : { kind: 'none', pid: null },
    connections: { ...( endpoint ? { endpoint } : {} ), ...( oscPort ? { oscPort, oscHost } : {} ) },
    payload: { ...( score ? { scorePath: path.resolve( score ) } : {} ),
      ...( projectPath ? { documentPath: path.resolve( projectPath ), documentKindID: 'score-project' } : {} ),
      ...( bindingID ? { bindingID } : {} ), ...( scoreSessionID ? { scoreSessionID } : {} ),
      ...( runID ? { runID } : {} ) }
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
    canOpenScoreField: view.toolID === 'score-studio' && Boolean( view.toolSessionID
      && ( view.currentDocumentPath || view.pendingRecentPath ) && view.sessionState?.scoreID ),
    liveRuntime: binding ? services.projectionForBinding( binding ) : { containers: [], entries: [] } };
}

async function openFieldForScore( scoreViewID ) {
  const scoreView = registry.get( scoreViewID );
  const scorePath = scoreView?.currentDocumentPath || scoreView?.pendingRecentPath;
  if ( !scoreView || scoreView.toolID !== 'score-studio' || !scoreView.toolSessionID
    || !scorePath || !scoreView.sessionState?.scoreID ) {
    throw new Error( 'The selected Score Studio view has no open hosted score to observe.' );
  }
  const owned = nativeToolSessions.get( scoreViewID );
  if ( !owned ) throw new Error( 'The selected score is not using a shell-owned native session.' );
  const mode = owned.service.hostSnapshot?.().control?.mode;
  const profileID = mode === 'headless' ? 'headless' : mode === 'ide' ? 'attached' : null;
  if ( !profileID ) throw new Error( 'The selected score no longer has a native SuperCollider host.' );
  return launchFromHome( { toolID: 'field-modelling', profileID, launchOrigin: 'desktop', payload: {
    documentKindID: 'score', scorePath,
    scoreSessionID: scoreView.toolSessionID, scoreID: scoreView.sessionState.scoreID,
    revision: scoreView.sessionState.revision, runID: scoreView.sessionState.runID ?? null,
    followRuns: true
  } } );
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
    views: registry.list().map( viewSnapshot ), renders: renderJobs.list(),
    host, nativeScHost: nativeScHost.snapshot(), failures: manifestFailures };
}

async function startHeadlessHost() {
  const configuration = hostConfigurationFromArgs( process.argv.slice( 1 ) );
  const service = await ensureHost( configuration ); const host = service.hostSnapshot();
  if ( host.sclang?.status === 'attached' && host.control?.mode !== 'headless' ) {
    throw new Error( 'An attached SuperCollider IDE host is already available.' );
  }
  return nativeScHost.start( { oscPort: configuration.oscPort } );
}

async function stopHeadlessHost() {
  const service = services.firstService( ( candidate ) => candidate.hostSnapshot?.().control?.mode === 'headless' );
  if ( [ ...nativeToolSessions.values() ].some( ( owned ) => owned.service === service ) ) {
    throw new Error( 'Close headless SuperCollider tool views before stopping their host.' );
  }
  return nativeScHost.stop( () => service?.shutdownHost?.() );
}

async function setNodeManager( action ) {
  const service = services.firstService( ( candidate ) => candidate.hostSnapshot?.().control?.status === 'ready' );
  if ( !service ) throw new Error( 'No AWB-enabled SuperCollider host is available.' );
  return service.setNodeManager( action );
}

async function nativeHostForProfile( profileID ) {
  const configuration = hostConfigurationFromArgs( process.argv.slice( 1 ) );
  const service = await ensureHost( configuration );
  if ( profileID === 'headless' ) {
    await startHeadlessHost();
    await waitFor( () => service.hostSnapshot().control?.status === 'ready'
      && service.hostSnapshot().control?.mode === 'headless', 30000 );
  } else if ( profileID === 'attached' ) {
    try {
      await waitFor( () => service.hostSnapshot().control?.status === 'ready', 5000 );
    } catch {
      throw new Error( 'No AWB-enabled SuperCollider IDE is attached. Open SuperCollider and recompile its class library.' );
    }
    if ( service.hostSnapshot().control?.mode !== 'ide' ) {
      throw new Error( 'The available SuperCollider host is not an attached IDE session.' );
    }
  } else return null;
  return { configuration, service };
}

async function launchFromHome( rawRequest ) {
  const nativeTool = rawRequest.toolID === 'score-studio'
    ? { sessionPrefix: 'scoreArranger', profiles: [ 'attached', 'headless' ] }
    : rawRequest.toolID === 'field-modelling'
      ? { sessionPrefix: 'fieldModelling', profiles: [ 'attached', 'headless' ] }
      : null;
  if ( !nativeTool
    || !nativeTool.profiles.includes( rawRequest.profileID )
    || rawRequest.toolSessionID
    || rawRequest.connections?.oscPort ) return router.launch( rawRequest );

  const native = await nativeHostForProfile( rawRequest.profileID );
  const sessionID = `${ nativeTool.sessionPrefix }:${ crypto.randomUUID() }`;
  await native.service.openToolSession( rawRequest.toolID, sessionID );
  const request = { ...rawRequest, toolSessionID: sessionID,
    connections: { ...( rawRequest.connections ?? {} ), oscHost: native.configuration.oscHost,
      oscPort: native.configuration.oscPort } };
  let result;
  try {
    result = await router.launch( request );
    if ( result.status === 'accepted' ) {
      nativeToolSessions.set( result.viewID, { service: native.service, toolID: rawRequest.toolID, sessionID } );
      return result;
    }
    return result;
  } finally {
    if ( result?.status !== 'accepted' ) {
      await native.service.closeToolSession( rawRequest.toolID, sessionID ).catch( () => {} );
    }
  }
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
    target = result.filePaths[ 0 ]; documentPayload = { ...documentPayload, documentPath: target };
  } else if ( payload.action === 'recent' ) {
    target = recentStore.resolve( payload.recentID, tool.id, kind.id ); documentPayload = { ...documentPayload, documentPath: target };
  } else documentPayload = { ...documentPayload, newDocumentID: crypto.randomUUID() };
  const result = await launchFromHome( { toolID: tool.id, profileID: kind.profileID,
    launchOrigin: 'desktop', payload: documentPayload } );
  if ( target && result.viewID ) registry.update( result.viewID, { pendingRecentPath: target, pendingDocumentKindID: kind.id } );
  return result;
}

function notifyHome() {
  if ( homeWindow && !homeWindow.isDestroyed() ) homeWindow.webContents.send( 'awb:command', { type: 'shell-registry-changed' } );
}
renderJobs.subscribe( () => {
  notifyHome();
  queueMicrotask( () => pumpRenderExecutor().catch( reportFatal ) );
} );

async function pumpRenderExecutor() {
  if ( quitting || !renderExecutorReady || renderExecutorLease
    || !renderExecutorWindow || renderExecutorWindow.isDestroyed() ) return;
  const lease = renderJobs.claim( renderExecutorID, { producerKinds: [ 'field' ] } );
  if ( !lease ) return;
  renderExecutorLease = lease;
  try {
    const output = renderOutputs.descriptor( lease.renderID );
    const { port1, port2 } = new MessageChannelMain();
    await renderOutputs.open( lease.renderID, lease.leaseID, port1 );
    renderExecutorWindow.webContents.postMessage( 'awb:render-lease', {
      ...lease,
      output,
      diagnostics: smokeRender ? { verifyPixels: true } : null
    }, [ port2 ] );
  } catch ( error ) {
    await renderOutputs.abort( lease.renderID );
    renderOutputs.release( lease.renderID );
    renderJobs.fail( renderExecutorID, lease.renderID, lease.leaseID, error );
    renderExecutorLease = null;
  }
}

function cancelActiveRender( renderID ) {
  if ( renderExecutorLease?.renderID === renderID && renderExecutorWindow && !renderExecutorWindow.isDestroyed() ) {
    renderExecutorWindow.webContents.send( 'awb:render-command', { type: 'cancel', renderID } );
  }
}

function requestRenderCancellation( renderID ) {
  const cancelled = renderJobs.requestCancel( renderID );
  if ( cancelled.status === 'cancelled' ) renderOutputs.release( renderID );
  else cancelActiveRender( renderID );
  return cancelled;
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
      if (scoreActions === 2 && lissajousActions === 2 && hostFacts === 4) resolve({ scoreActions, lissajousActions, hostFacts });
      else if (Date.now() - started > 5000) reject(new Error('Toolkit Home document and host facts did not render: score=' + scoreActions + ' lissajous=' + lissajousActions + ' host=' + hostFacts));
      else setTimeout(check, 25);
    }; check();
  })` );
  console.log( `AWB_SHELL_HOME_PROJECTIONS documents=${ result.scoreActions + result.lissajousActions } hostFacts=${ result.hostFacts } hostServices=${ services.snapshot().length }` ); app.quit();
}

async function runMultiviewSmoke() {
  smokeRunning = true;
  const scorePath = option( process.argv, 'smoke-score' );
  const payload = scorePath ? { scorePath: path.resolve( scorePath ) } : {};
  const results = await homeWindow.webContents.executeJavaScript( `(async () => {
    const payload = ${ JSON.stringify( payload ) };
    const first = await window.awbHost.request('shell.launch', { toolID: 'score-studio', profileID: 'headless', toolSessionID: 'smoke-a', launchOrigin: 'desktop', payload });
    const repeated = await window.awbHost.request('shell.launch', { toolID: 'score-studio', profileID: 'headless', toolSessionID: 'smoke-a', launchOrigin: 'desktop', payload });
    const second = await window.awbHost.request('shell.launch', { toolID: 'score-studio', profileID: 'headless', toolSessionID: 'smoke-b', launchOrigin: 'desktop', payload });
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
  const score = await router.launch( { toolID: 'score-studio', profileID: 'headless',
    toolSessionID: 'multitool-score', launchOrigin: 'desktop' } );
  const lissajous = await router.launch( { toolID: 'lissajous', profileID: 'standalone',
    toolSessionID: 'multitool-lissajous', launchOrigin: 'desktop' } );
  const field = await router.launch( { toolID: 'field-modelling', profileID: 'standalone',
    toolSessionID: 'multitool-field', launchOrigin: 'desktop' } );
  if ( score.status !== 'accepted' || lissajous.status !== 'accepted' || field.status !== 'accepted' ) {
    throw new Error( `Multi-tool launch failed: score=${ JSON.stringify( score ) } lissajous=${ JSON.stringify( lissajous ) } field=${ JSON.stringify( field ) }` );
  }
  try {
    await waitFor( () => registry.list().length === 3 && registry.list().every( ( view ) => view.lifecycle === 'ready' ), 25000 );
  } catch ( error ) {
    throw new Error( `${ error.message } views=${ JSON.stringify( registry.list().map( viewSnapshot ) ) }` );
  }
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
  if ( !lissajousContract.media.includes( 'native-audio' ) ) {
    throw new Error( `Lissajous native-audio policy was not installed: ${ JSON.stringify( lissajousContract ) }` );
  }
  const fieldContract = await windows.get( field.viewID ).webContents.executeJavaScript( `( {
    filesystem: globalThis.awbHost.capabilities().filesystem,
    media: globalThis.awbHost.capabilities().media,
    connections: globalThis.awbHost.capabilities().connections,
    title: document.querySelector('.fieldHostBar strong')?.textContent
  } )` );
  if ( fieldContract.title !== 'Field Modelling' || fieldContract.media?.length
    || !fieldContract.filesystem.includes( 'save-file' ) ) throw new Error( 'Field renderer contract was not installed.' );
  console.log( 'AWB_SHELL_MULTITOOL_READY score-studio=ready lissajous=ready field-modelling=ready requestedChannels=16' );
  await closeToolView( score.viewID ); await waitFor( () => windows.size === 2 );
  if ( !windows.has( lissajous.viewID ) || !windows.has( field.viewID ) ) throw new Error( 'Closing Score Studio disturbed another tool.' );
  await closeToolView( field.viewID ); await waitFor( () => windows.size === 1 );
  if ( !windows.has( lissajous.viewID ) ) throw new Error( 'Closing Field Modelling disturbed Lissajous.' );
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

async function runRenderSmoke() {
  smokeRunning = true;
  const targetPath = path.resolve( option( process.argv, 'smoke-render-output' ) );
  const submitted = renderJobs.submit( { requestedByToolID: 'field-modelling',
    requestedByViewID: 'smoke-render', job: {
      schemaVersion: 2,
      contentHash: 'sha256:headless-field-smoke',
      producer: { kind: 'field', version: '0.2.0', state: {
        mode: 'analytic-preview', pixelRatio: 1,
        camera: { position: [ 4.8, 6.6, 7.6 ], target: [ 0, 0.35, 1.5 ] },
        field: {
          instruments: [ { id: 'smoke', type: 'substrate', playing: true, mute: false,
            solo: false, amp: 1, lActive: true, rActive: true,
            params: { freqA: 36, beat: 0.1, freqQ: 0.1, movement: 0.4 }, channels: {},
            color: '#e0603a', highlight: true } ],
          room: { speakers: [ { id: 'L' }, { id: 'R' } ], sep: 2, spkH: 1.1,
            bedH: 0.6, bedY: 2, pistonA: 0.07, roomDiam: 7, roomBack: 2, conv: 20 },
          surfaces: {
            horizontal: { visible: true, radius: 3.5, height: 0.56, mode: 'abs',
              colorMode: 'composite', highlight: true, opacity: 1, contour: 0, contourN: 12 },
            spherical: { visible: false, radius: 3.1, width: 2.2, height: 2, mode: 'abs',
              colorMode: 'composite', highlight: true, opacity: 1, contour: 0, contourN: 12 },
            body: { visible: false, setupId: 'lying', showSites: false, mode: 'abs',
              colorMode: 'composite', highlight: true, opacity: 1, contour: 0, contourN: 12 }
          },
          microphones: [], display: { gain: 1, timeScaleExp: -2.7, playing: true, phaseSync: false },
          timeFactor: 1
        }
      } },
      inputs: [],
      timeline: { cueInSeconds: 0, cueOutSeconds: 0.5 },
      output: { width: 320, height: 180, fps: 4, format: 'mp4' }
    } } );
  renderOutputs.register( submitted.renderID, targetPath );
  await pumpRenderExecutor();
  await waitFor( () => [ 'completed', 'failed', 'cancelled' ].includes(
    renderJobs.getForTool( 'field-modelling', submitted.renderID ).status ), 10000 );
  const completed = renderJobs.getForTool( 'field-modelling', submitted.renderID );
  if ( completed.status !== 'completed' ) throw new Error( `Headless render failed: ${ completed.error }` );
  const diagnostics = completed.receipt?.output?.diagnostics;
  if ( !diagnostics?.repeatStable || !diagnostics.liveParity || diagnostics.frameHashes?.length !== 2
    || diagnostics.frameHashes[ 0 ] === diagnostics.frameHashes[ 1 ] ) {
    throw new Error( `Headless Field pixel determinism failed: ${ JSON.stringify( diagnostics ) }` );
  }
  const bytes = await readFile( targetPath );
  if ( bytes.length < 64 || bytes.subarray( 4, 8 ).toString() !== 'ftyp' ) {
    throw new Error( `Headless render did not produce an MP4 file (bytes=${ bytes.length }, header=${ bytes.subarray( 0, 16 ).toString( 'hex' ) }).` );
  }
  console.log( `AWB_SHELL_HEADLESS_RENDER frames=${ completed.completedFrames } bytes=${ bytes.length } producer=field repeatPixels=stable landmarks=distinct liveParity=exact` );
  app.quit();
}

async function runFieldSmoke() {
  smokeRunning = true;
  const launched = await router.launch( { toolID: 'field-modelling', profileID: 'standalone',
    toolSessionID: 'field-live-smoke', launchOrigin: 'desktop' } );
  if ( launched.status !== 'accepted' ) throw new Error( `Field launch failed: ${ JSON.stringify( launched ) }` );
  await waitFor( () => registry.get( launched.viewID )?.lifecycle === 'ready', 25000 );
  const result = await windows.get( launched.viewID ).webContents.executeJavaScript( `new Promise((resolve, reject) => {
    const started = Date.now();
    const check = () => {
      const canvas = document.querySelector('#stage canvas');
      const analytic = document.body.innerText.includes('Analytic preview');
      if (canvas && canvas.width > 0 && canvas.height > 0 && analytic) {
        resolve({ width: canvas.width, height: canvas.height });
      } else if (Date.now() - started > 10000) reject(new Error('Field WebGL canvas did not become ready'));
      else setTimeout(check, 25);
    }; check();
  })` );
  console.log( `AWB_SHELL_FIELD_WEBGL_READY width=${ result.width } height=${ result.height }` );
  await closeToolView( launched.viewID );
  await waitFor( () => windows.size === 0 );
  app.quit();
}

async function runHeadlessScSmoke() {
  smokeRunning = true;
  const scorePath = option( process.argv, 'smoke-score' );
  await startHeadlessHost();
  await waitFor( () => services.firstService( ( service ) => {
    const host = service.hostSnapshot?.(); return host?.control?.status === 'ready'
      && host.control.mode === 'headless' && host.scsynth.status === 'ready';
  } ), 30000 );
  const audioProbeService = services.firstService( ( service ) => {
    const host = service.hostSnapshot?.(); return host?.control?.status === 'ready'
      && host.control.mode === 'headless' && host.scsynth.status === 'ready';
  } );
  const audioProbe = await audioProbeService.audioProbe( { frequency: 440, duration: 0.35, amplitude: 0.08 } );
  if ( audioProbe.status !== 'played' || audioProbe.frequency !== 440 ) {
    throw new Error( `Native audio probe failed: ${ JSON.stringify( audioProbe ) }` );
  }
  await setNodeManager( 'enable' );
  await waitFor( () => services.firstService( ( service ) => service.hostSnapshot?.().nodeManager?.status === 'ready' ), 5000 );
  const launched = await launchFromHome( { toolID: 'score-studio', profileID: 'headless', launchOrigin: 'desktop',
    payload: scorePath ? { scorePath: path.resolve( scorePath ) } : {} } );
  if ( launched.status !== 'accepted' ) throw new Error( `Native Score Studio launch failed: ${ JSON.stringify( launched ) }` );
  await waitFor( () => {
    const view = registry.get( launched.viewID );
    return view?.lifecycle === 'ready' && view.sessionState?.mode === 'hosted'
      && view.sessionState?.connection === 'connected'
      && ( !scorePath || view.sessionState?.scoreID === 'sonic-attunement-01' );
  }, 25000 );
  if ( !nativeToolSessions.has( launched.viewID ) ) throw new Error( 'Native Score Studio view has no owned sclang ToolSession.' );
  const executionModes = await windows.get( launched.viewID ).webContents.executeJavaScript(
    `[ ...document.querySelectorAll('.modeSwitch button') ].map((button) => button.textContent.trim())`
  );
  if ( executionModes.length !== 1 || executionModes[ 0 ] !== 'hosted' ) {
    throw new Error( `Desktop Score Studio exposed non-native execution modes: ${ JSON.stringify( executionModes ) }` );
  }
  if ( scorePath ) {
    await windows.get( launched.viewID ).webContents.executeJavaScript( `new Promise((resolve, reject) => {
      const started = Date.now();
      const check = () => {
        const play = [ ...document.querySelectorAll('section.transport button') ]
          .find((button) => button.textContent.trim() === 'Play');
        if (play && !play.disabled) { play.click(); resolve(true); }
        else if (Date.now() - started > 10000) reject(new Error(
          'Hosted score never became playable: ' + document.body.innerText.slice(0, 1200)));
        else setTimeout(check, 25);
      }; check();
    })` );
    await waitFor( () => registry.get( launched.viewID )?.sessionState?.transport === 'playing', 5000 );
    await windows.get( launched.viewID ).webContents.executeJavaScript( `new Promise((resolve, reject) => {
      const started = Date.now();
      const check = () => {
        const realized = document.querySelector('.realizations .realization');
        if (realized) resolve(realized.innerText);
        else if (Date.now() - started > 5000) reject(new Error(
          'Hosted score played but reported no runtime realization: ' + document.body.innerText.slice(0, 1200)));
        else setTimeout(check, 25);
      }; check();
    })` );
  }
  const field = scorePath ? await openFieldForScore( launched.viewID )
    : await launchFromHome( { toolID: 'field-modelling', profileID: 'headless', launchOrigin: 'desktop' } );
  if ( field.status !== 'accepted' ) throw new Error( `Native Field launch failed: ${ JSON.stringify( field ) }` );
  await waitFor( () => registry.get( field.viewID )?.lifecycle === 'ready'
    && ( !scorePath || registry.get( field.viewID )?.sessionState?.mode === 'attached' ), 25000 );
  if ( !nativeToolSessions.has( field.viewID ) ) throw new Error( 'Native Field view has no owned sclang ToolSession.' );
  await windows.get( field.viewID ).webContents.executeJavaScript( `new Promise((resolve, reject) => {
    const started = Date.now();
    const check = () => {
      const live = [ ...document.querySelectorAll('.instLive') ]
        .some((item) => item.title === 'Sounding on the server');
      const canvas = document.querySelector('#stage canvas');
      const scoreProjected = ${ scorePath ? "document.body.innerText.includes('Hosted score field') && !document.body.innerText.includes('0 master-only')" : 'true' };
      if (live && scoreProjected && canvas?.width > 0 && canvas?.height > 0) resolve(true);
      else if (Date.now() - started > 12000) reject(new Error(
        'Hosted Field did not combine its owned instrument with the score projection: ' + document.body.innerText.slice(0, 1200)));
      else setTimeout(check, 25);
    }; check();
  })` );
  await closeToolView( field.viewID );
  await waitFor( () => !registry.get( field.viewID ) && !nativeToolSessions.has( field.viewID ), 5000 );
  await closeToolView( launched.viewID );
  await waitFor( () => !registry.get( launched.viewID ) && !nativeToolSessions.has( launched.viewID ), 5000 );
  await setNodeManager( 'manual' );
  await waitFor( () => services.firstService( ( service ) => service.hostSnapshot?.().nodeManager?.status === 'disabled' ), 5000 );
  await stopHeadlessHost();
  await waitFor( () => nativeScHost.snapshot().state === 'stopped', 8000 );
  console.log( `AWB_SHELL_HEADLESS_SC_READY engine=native audioProbe=sent scoreStudio=hosted${ scorePath ? ' scorePlayback=realized fieldScore=observed fieldAuthored=running' : '' } fieldModelling=hosted toolSession=owned nodeManager=toggleable shutdown=owned` );
  app.quit();
}

async function createRenderExecutorWindow() {
  if ( renderExecutorWindow && !renderExecutorWindow.isDestroyed() ) return renderExecutorWindow;
  const window = new BrowserWindow( { show: false, webPreferences: {
    preload: path.join( appRoot, 'render-worker/preload.cjs' ),
    contextIsolation: true, nodeIntegration: false, sandbox: true
  } } );
  const senderID = window.webContents.id;
  renderExecutorWindow = window;
  renderExecutorReady = false;
  senderRecords.set( senderID, { kind: 'render-executor', executorID: renderExecutorID } );
  bindNavigationGuards( window, ( url ) => url.startsWith( 'file:' ) );
  window.webContents.on( 'console-message', ( event ) => {
    if ( event.level === 'error' || smokeRender ) console.error( `[render-executor] ${ event.message }` );
  } );
  window.webContents.on( 'render-process-gone', async ( event, details ) => {
    console.error( `Headless render executor stopped: ${ details.reason }` );
    renderExecutorReady = false;
    if ( renderExecutorLease ) await renderOutputs.abort( renderExecutorLease.renderID );
    renderJobs.releaseExecutor( renderExecutorID );
    renderExecutorLease = null;
  } );
  window.on( 'closed', () => {
    senderRecords.delete( senderID );
    renderExecutorReady = false;
    if ( renderExecutorWindow === window ) renderExecutorWindow = null;
  } );
  await window.loadFile( path.join( appRoot, 'dist/render-worker/index.html' ) );
  return window;
}

async function createHomeWindow() {
  if ( homeWindow && !homeWindow.isDestroyed() ) {
    if ( homeWindow.isMinimized() ) homeWindow.restore();
    homeWindow.show(); homeWindow.focus(); return homeWindow;
  }
  const context = Object.freeze( { shellProtocol: SHELL_PROTOCOL, shellInstanceID, viewID: 'toolkit-home',
    tool: { id: 'awb-toolkit-home', version: app.getVersion() }, toolSessionID: null,
    launchOrigin: 'desktop', owner: { kind: 'none', pid: null },
    grantedCapabilities: { filesystem: [], media: [], connections: [], rendering: [] }, connections: {}, payload: {} } );
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
    const connectionID = tool.capabilities.connections.find( ( id ) => tool.connectionPolicies[ id ] );
    const policy = connectionID ? tool.connectionPolicies[ connectionID ] : null;
    if ( !policy ) throw new Error( `${ tool.name } has no hosted relay policy.` );
    const configuration = hostConfigurationFromRequest( request ); await ensureHost( configuration );
    const acquired = await services.acquire( configuration, {
      allowedPrefixes: [ ...policy.allowedPrefixes ],
      allowedAddresses: [ ...policy.allowedAddresses ],
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
  nativeAudio.releaseView( viewID ).catch( ( error ) => console.error( error ) );
  const nativeSession = nativeToolSessions.get( viewID ); nativeToolSessions.delete( viewID );
  nativeSession?.service.closeToolSession( nativeSession.toolID, nativeSession.sessionID )
    .catch( ( error ) => console.error( error ) );
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
  if ( operation.startsWith( 'render.' ) ) requireCapability( tool, 'rendering', 'local-render' );
  if ( operation === 'render.submit' ) {
    const result = await dialog.showSaveDialog( window, {
      defaultPath: path.basename( payload.suggestedName || `${ tool.id }-render.mp4` ),
      filters: [ { name: 'MPEG-4 video', extensions: [ 'mp4' ] } ]
    } );
    if ( result.canceled || !result.filePath ) return { status: 'cancelled' };
    const submitted = renderJobs.submit( { requestedByToolID: tool.id, requestedByViewID: view.viewID,
      job: payload.job, executionTarget: payload.executionTarget ?? 'local' } );
    renderOutputs.register( submitted.renderID, result.filePath );
    await pumpRenderExecutor();
    return submitted;
  }
  if ( operation === 'render.status' ) return renderJobs.getForTool( tool.id, payload.renderID );
  if ( operation === 'render.list' ) return renderJobs.list( tool.id );
  if ( operation === 'render.cancel' ) {
    renderJobs.getForTool( tool.id, payload.renderID );
    return requestRenderCancellation( payload.renderID );
  }
  if ( operation === 'artifact.read-text' ) {
    const target = safeArtifactPath( tool, payload.path );
    return { name: payload.name ?? path.basename( target ), text: await readFile( target, 'utf8' ), handle: null };
  }
  if ( operation === 'score.load-synthdefs' ) {
    if ( tool.id !== 'score-studio' ) throw new Error( 'Only Score Studio may load score SynthDefs.' );
    const nativeSession = nativeToolSessions.get( view.viewID );
    if ( !nativeSession || nativeSession.toolID !== 'score-studio' ) {
      throw new Error( 'Score SynthDefs require a shell-owned native Score Studio session.' );
    }
    const score = fileGrants.resolve( view.viewID, payload.handle, 'file' );
    if ( !score.name.endsWith( '.score.json' ) ) throw new Error( 'Score SynthDefs require a canonical .score.json file.' );
    const sourcePath = path.join( path.dirname( score.path ), 'synths.scd' );
    const source = await stat( sourcePath ).catch( () => null );
    if ( !source?.isFile() ) {
      return { status: 'notProvided', sourceName: null };
    }
    let result = await nativeSession.service.loadScoreSynthDefs( nativeSession.sessionID, sourcePath );
    if ( result.status === 'confirmationRequired' ) {
      const previousProject = result.previousSourcePath
        ? path.basename( path.dirname( result.previousSourcePath ) ) : 'another open tool';
      const incomingProject = path.basename( path.dirname( sourcePath ) );
      const confirmation = await dialog.showMessageBox( window, {
        type: 'warning', buttons: [ 'Keep current definition', 'Load new definition' ],
        defaultId: 0, cancelId: 0, noLink: true,
        title: 'Replace the active SynthDef set?',
        message: `${ incomingProject } defines SynthDefs while ${ previousProject } already owns the active set.`,
        detail: 'Loading continues with normal SuperCollider semantics: same-named definitions are replaced process-wide for new nodes. Existing nodes keep the graph they already use.'
      } );
      if ( confirmation.response !== 1 ) return { status: 'cancelled', sourceName: result.sourceName };
      result = await nativeSession.service.loadScoreSynthDefs( nativeSession.sessionID, sourcePath, true );
    }
    return { ...result, sourcePath: undefined, previousSourcePath: undefined };
  }
  if ( operation === 'native-audio.devices' ) {
    requireCapability( tool, 'media', 'native-audio' );
    return nativeAudio.listDevices();
  }
  if ( operation === 'native-audio.start' ) {
    requireCapability( tool, 'media', 'native-audio' );
    return nativeAudio.start( view.viewID, {
      deviceUID: payload.deviceUID,
      framesPerChunk: payload.framesPerChunk
    } );
  }
  if ( operation === 'native-audio.status' ) {
    requireCapability( tool, 'media', 'native-audio' );
    return nativeAudio.status( view.viewID );
  }
  if ( operation === 'native-audio.stop' ) {
    requireCapability( tool, 'media', 'native-audio' );
    return nativeAudio.stop( view.viewID );
  }
  if ( operation === 'filesystem.initial-file' ) {
    requireCapability( tool, 'filesystem', 'open-file' );
    const initialPath = view.requestPayload?.documentPath ?? view.requestPayload?.scorePath;
    if ( !initialPath ) return null;
    registry.update( view.viewID, { pendingRecentPath: initialPath,
      pendingDocumentKindID: view.requestPayload.documentKindID
        ?? documentKindIDForPath( tool.documentKinds, initialPath ) } );
    return fileGrants.fileRecord( view.viewID, initialPath );
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
  if ( operation === 'filesystem.resolve-score-project' ) {
    requireCapability( tool, 'filesystem', 'open-file' );
    const projectGrant = fileGrants.resolve( view.viewID, payload.handle, 'file' );
    const resolved = resolveToolBindingFromProject( await readFile( projectGrant.path, 'utf8' ), projectGrant.path,
      { toolID: payload.toolID ?? tool.id, bindingID: payload.bindingID ?? null } );
    if ( ( payload.toolID ?? tool.id ) !== tool.id ) throw new Error( 'A tool may resolve only its own project bindings.' );
    return { projectID: resolved.project.projectID, scoreID: resolved.project.score.scoreID,
      binding: resolved.binding, score: await fileGrants.fileRecord( view.viewID, resolved.scorePath ),
      config: await fileGrants.fileRecord( view.viewID, resolved.configPath ) };
  }
  if ( operation === 'filesystem.save-file' ) {
    requireCapability( tool, 'filesystem', 'save-file' );
    let target; let handle = payload.saveAs ? null : payload.handle;
    if ( handle ) target = fileGrants.resolve( view.viewID, handle, 'file' ).path;
    else if ( payload.deriveFromHandle && !payload.saveAs ) {
      const source = fileGrants.resolve( view.viewID, payload.deriveFromHandle, 'file' ).path;
      if ( payload.replaceSuffix !== '.score.json' || payload.derivedSuffix !== '.score.scd'
        || !source.toLowerCase().endsWith( payload.replaceSuffix ) ) {
        throw new Error( 'Derived save target is invalid.' );
      }
      target = `${ source.slice( 0, -payload.replaceSuffix.length ) }${ payload.derivedSuffix }`;
      handle = fileGrants.grant( view.viewID, target, 'file' );
    }
    else {
      const result = await dialog.showSaveDialog( window, { defaultPath: payload.suggestedName, filters: payload.filters ?? [] } );
      if ( result.canceled ) return null;
      target = result.filePath; handle = fileGrants.grant( view.viewID, target, 'file' );
    }
    if ( payload.expectedText !== null && payload.expectedText !== undefined ) await guardedWriteText( target, payload.text, { expectedText: payload.expectedText } );
    else await atomicWriteText( target, payload.text );
    if ( payload.markRecent && payload.documentKindID ) registry.update( view.viewID, {
      pendingRecentPath: target, pendingDocumentKindID: payload.documentKindID
    } );
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
      else if ( smokeRender && !smokeRunning ) runRenderSmoke().catch( reportFatal );
      else if ( smokeField && !smokeRunning ) runFieldSmoke().catch( reportFatal );
      else if ( smokeHeadlessSc && !smokeRunning ) runHeadlessScSmoke().catch( reportFatal );
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
        registry.update( sender.viewID, { currentDocumentPath: view.pendingRecentPath,
          pendingRecentPath: null } );
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
      if ( request.operation === 'shell.launch' ) return launchFromHome( payload );
      if ( request.operation === 'shell.launch-document' ) return launchDocument( payload );
      if ( request.operation === 'shell.focus' ) { await focusToolView( payload.viewID ); return true; }
      if ( request.operation === 'shell.close' ) return closeToolView( payload.viewID );
      if ( request.operation === 'shell.open-supercollider' ) return openSuperColliderIDE();
      if ( request.operation === 'shell.start-headless-sc' ) return startHeadlessHost();
      if ( request.operation === 'shell.stop-headless-sc' ) return stopHeadlessHost();
      if ( request.operation === 'shell.audio-probe' ) {
        const service = services.firstService( ( candidate ) => candidate.hostSnapshot?.().control?.status === 'ready' );
        if ( !service ) throw new Error( 'No AWB-enabled SuperCollider host is available.' );
        return service.audioProbe( { frequency: 440, duration: 0.35, amplitude: 0.08 } );
      }
      if ( request.operation === 'shell.open-field-for-score' ) return openFieldForScore( payload.viewID );
      if ( request.operation === 'shell.nodemanager' ) return setNodeManager( payload.action );
      if ( request.operation === 'render.cancel' ) {
        return requestRenderCancellation( payload.renderID );
      }
    }
    return handleToolOperation( sender, request.operation, payload );
  } );
  ipcMain.on( 'awb:render-executor-ready', ( event ) => {
    const sender = senderRecord( event );
    if ( sender.kind !== 'render-executor' || sender.executorID !== renderExecutorID ) {
      throw new Error( 'Rejected render executor registration.' );
    }
    renderExecutorReady = true;
    pumpRenderExecutor().catch( reportFatal );
  } );
  ipcMain.handle( 'awb:render-executor-control', async ( event, request ) => {
    const sender = senderRecord( event );
    if ( sender.kind !== 'render-executor' || sender.executorID !== renderExecutorID ) {
      throw new Error( 'Rejected render executor control message.' );
    }
    const payload = boundedOperationPayload( request?.payload ?? {} );
    const active = renderExecutorLease;
    if ( !active || payload.renderID !== active.renderID || payload.leaseID !== active.leaseID ) {
      throw new Error( 'Render executor control does not match the active lease.' );
    }
    if ( request.operation === 'progress' ) {
      return renderJobs.progress( renderExecutorID, active.renderID, active.leaseID, payload );
    }
    if ( request.operation === 'complete' ) {
      const completed = renderJobs.complete( renderExecutorID, active.renderID, active.leaseID, payload.receipt );
      renderOutputs.release( active.renderID );
      renderExecutorLease = null;
      await pumpRenderExecutor();
      return completed;
    }
    if ( request.operation === 'fail' ) {
      await renderOutputs.abort( active.renderID );
      const failed = renderJobs.fail( renderExecutorID, active.renderID, active.leaseID, payload.error );
      renderOutputs.release( active.renderID );
      renderExecutorLease = null;
      await pumpRenderExecutor();
      return failed;
    }
    if ( request.operation === 'cancelled' ) {
      await renderOutputs.abort( active.renderID );
      const cancelled = renderJobs.cancelled( renderExecutorID, active.renderID, active.leaseID );
      renderOutputs.release( active.renderID );
      renderExecutorLease = null;
      await pumpRenderExecutor();
      return cancelled;
    }
    throw new Error( 'Unknown render executor control operation.' );
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
        const result = await launchFromHome( request );
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
    await createRenderExecutorWindow();
    await createHomeWindow();
    if ( initialRequest ) await launchFromHome( initialRequest );
  } ).catch( reportFatal );
  app.on( 'activate', () => createHomeWindow().catch( reportFatal ) );
  app.on( 'window-all-closed', () => { if ( !quitting ) createHomeWindow().catch( reportFatal ); } );
  app.on( 'before-quit', ( event ) => {
    quitting = true;
    if ( servicesClosed ) return;
    event.preventDefault();
    if ( !serviceShutdown ) serviceShutdown = ( async () => {
      for ( const unsubscribe of hostSubscriptions.values() ) unsubscribe();
      hostSubscriptions.clear();
      const nativeSessionStops = await Promise.allSettled( [ ...nativeToolSessions.values() ].map(
        ( owned ) => owned.service.closeToolSession( owned.toolID, owned.sessionID )
      ) );
      nativeToolSessions.clear();
      const headlessService = services.firstService( ( service ) => service.hostSnapshot?.().control?.mode === 'headless' );
      const hostStop = await Promise.allSettled( [ nativeAudio.close(),
        nativeScHost.stop( () => headlessService?.shutdownHost?.() ) ] );
      const results = [ ...nativeSessionStops, ...hostStop, ...await Promise.allSettled( [ services.closeAll() ] ) ];
      results.filter( ( result ) => result.status === 'rejected' )
        .forEach( ( result ) => console.error( result.reason ) );
      servicesClosed = true; app.quit();
    } )().catch( reportFatal );
  } );
}

export { launchRequestFromArgs };
