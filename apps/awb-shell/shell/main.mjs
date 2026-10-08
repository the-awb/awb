import {createLiveSetHostBridge} from '../src/liveSetHostBridge.mjs';
import {ControlObservationBroker} from '../src/controlObservationBroker.mjs';
import crypto from 'node:crypto';
import path from 'node:path';
import process from 'node:process';
import { guardStdioPipes } from '../src/stdioErrors.mjs';
import { readFile, stat, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { grantedCapabilities, publicManifest, SHELL_PROTOCOL } from '../src/contract.mjs';
import { activeNativeHostMode, canonicalNativeToolProfile } from '../src/nativeHostProfile.mjs';
import { LaunchRouter } from '../src/launchRouter.mjs';
import { loadToolArtifacts } from '../src/manifestLoader.mjs';
import { ViewRegistry } from '../src/viewRegistry.mjs';
import { FileGrantStore } from '../src/fileGrants.mjs';
import { atomicWriteText, guardedWriteText } from '../src/nativeFiles.mjs';
import { ServiceRegistry } from '../src/serviceRegistry.mjs';
import { ToolRuntimeRegistry } from '../src/toolRuntimeRegistry.mjs';
import { documentKindIDForPath, RecentStore } from '../src/recentStore.mjs';
import { createOscWebSocketRelay } from '../services/oscWebSocketRelay.mjs';
import { createNativeAudioBroker } from '@awb/native-audio';
import { NativeAudioAccess } from '../src/nativeAudioAccess.mjs';
import {SignalCaptureBroker} from '../src/signalCaptureBroker.mjs';
import {openScSignalSource} from '../src/scSignalSource.mjs';
import { ScBusAudioAccess } from '../src/scBusAudioAccess.mjs';
import { OSC as ScBusOSC } from '../src/scBusOsc.mjs';
import { RenderJobBroker } from '../src/renderJobBroker.mjs';
import { resolveToolBindingFromProject } from '../src/scoreProjectResolver.mjs';
import { RenderOutputStore } from '../src/renderOutputStore.mjs';
import { NativeScHostSupervisor, openSuperColliderIDE } from '../src/nativeScHostSupervisor.mjs';
import {
  permitsDisplayMediaRequest, permitsMediaCheck, permitsMediaRequest, responseHeadersForTool
} from '../src/rendererPolicy.mjs';

guardStdioPipes();
const require = createRequire( import.meta.url );
const { app, BrowserWindow, desktopCapturer, dialog, ipcMain, MessageChannelMain, session, webContents } = require( 'electron/main' );
const shellRoot = path.dirname( fileURLToPath( import.meta.url ) );
const appRoot = path.resolve( shellRoot, '..' );
const preloadPath = path.join( shellRoot, 'preload.cjs' );
const shellInstanceID = crypto.randomUUID();
const shellHostToken = crypto.randomUUID();
const registry = new ViewRegistry();
const windows = new Map();
const scopeWindows = new Map();
const senderRecords = new Map();
const ownerTimers = new Map();
const serviceReleases = new Map();
const nativeToolInstances = new Map();
const hostSubscriptions = new Map();
const fileGrants = new FileGrantStore();
const services = new ServiceRegistry( createOscWebSocketRelay );
const nativeAudio = new NativeAudioAccess( createNativeAudioBroker() );
const controlObservations=new ControlObservationBroker();
const signalCaptures=new SignalCaptureBroker({open:openScSignalSource});
const scBusAudio = new ScBusAudioAccess({broker:signalCaptures,hostContext: async()=>{
 const native=await nativeHostForProfile('hosted');
 await waitFor(()=>native.service.hostSnapshot().scsynth.status==='ready',10000);
 return {...native.configuration,token:shellHostToken,service:native.service,
  isConnected:()=>native.service.hostSnapshot().scsynth.status==='ready'};
}});
const renderJobs = new RenderJobBroker();
const renderOutputs = new RenderOutputStore();
const nativeScHost = new NativeScHostSupervisor( { token: shellHostToken,
  bootstrapPath: path.join( appRoot, 'sc/AWBHeadlessHost.scd' ),
  pluginPaths: [ path.resolve( appRoot, '../../tool-artifacts/shared-loop/0.1.0/build' ) ], onChange: () => notifyHome() } );
const renderExecutorID = `headless-local-${ crypto.randomUUID() }`;
let recentStore;
let toolRuntimes;
let liveSetSession=null, liveSetLaunch=null;
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
const smokeSharedLoop = process.argv.includes( '--smoke-shared-loop' );
const smokeScBus = process.argv.includes('--smoke-sc-bus');
const smokeScopeTool = process.argv.includes('--smoke-scope-tool');
const smokeMultiview = process.argv.includes( '--smoke-multiview' );
const smokeHosted = process.argv.includes( '--smoke-hosted' );
const smokeOwnerLoss = process.argv.includes( '--smoke-owner-loss' );
const smokeExternalRouter = process.argv.includes( '--smoke-external-router' );
const smokeMultitool = process.argv.includes( '--smoke-multitool' );
const smokeRender = process.argv.includes( '--smoke-render' );
const smokeField = process.argv.includes( '--smoke-field' );
const smokeQtStation = process.argv.includes( '--smoke-qt-station' );
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
  media: [ 'audio-input', 'system-audio', 'native-audio', 'sc-bus-audio' ],
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
  // Param/live-set views carry their own direct binding. --osc-port=0 omits
  // a renderer relay; it must not hide that same language host from Home.
  const oscPort = Number( option( args, 'osc-port', process.env.AWB_SC_OSC_PORT ?? 57120 ) )
    || Number( process.env.AWB_PARAM_SC_PORT );
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
    toolInstanceID: option( args, 'tool-instance' ),
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
  return { width, height, resizable: true, maximizable: true, show: false, webPreferences: { preload: preloadPath,
    additionalArguments: [ encodedContextArgument( context ) ], contextIsolation: true,
    nodeIntegration: false, sandbox: true } };
}

function bindNavigationGuards( window, allowed ) {
  window.webContents.setWindowOpenHandler( () => ( { action: 'deny' } ) );
  window.webContents.on( 'will-navigate', ( event, url ) => { if ( !allowed( url ) ) event.preventDefault(); } );
}

function viewSnapshot( view ) {
  const tool = tools.get( view.toolID );
  const binding = tool?.hostBindings.nodeManager && view.toolInstanceID ? {
    toolSource: tool.hostBindings.nodeManager.toolSource, toolInstance: view.toolInstanceID
  } : null;
  return { viewID: view.viewID, toolID: view.toolID, toolName: tool?.name ?? view.toolID,
    toolInstanceID: view.toolInstanceID, launchOrigin: view.launchOrigin, lifecycle: view.lifecycle,
    owner: view.owner, sessionState: view.sessionState, lastError: view.lastError ?? null,
    canOpenScoreField: view.toolID === 'score-studio' && Boolean( view.toolInstanceID
      && ( view.currentDocumentPath || view.pendingRecentPath ) && view.sessionState?.scoreID ),
    liveRuntime: binding ? services.projectionForBinding( binding ) : { containers: [], entries: [] } };
}

async function openFieldForScore( scoreViewID ) {
  const scoreView = registry.get( scoreViewID );
  const scorePath = scoreView?.currentDocumentPath || scoreView?.pendingRecentPath;
  if ( !scoreView || scoreView.toolID !== 'score-studio' || !scoreView.toolInstanceID
    || !scorePath || !scoreView.sessionState?.scoreID ) {
    throw new Error( 'The selected Score Studio view has no open hosted score to observe.' );
  }
  const owned = nativeToolInstances.get( scoreViewID );
  if ( !owned ) throw new Error( 'The selected score is not using a shell-owned native session.' );
  const mode = owned.service.hostSnapshot?.().control?.mode;
  const profileID = mode === 'headless' || mode === 'ide' ? 'hosted' : null;
  if ( !profileID ) throw new Error( 'The selected score no longer has a native SuperCollider host.' );
  return launchFromHome( { toolID: 'field-modelling', profileID, launchOrigin: 'desktop', payload: {
    documentKindID: 'score', scorePath,
    scoreSessionID: scoreView.toolInstanceID, scoreID: scoreView.sessionState.scoreID,
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

async function startHeadlessHost({deferServerBoot=false}={}) {
  const configuration = hostConfigurationFromArgs( process.argv.slice( 1 ) );
  const service = await ensureHost( configuration ); const host = service.hostSnapshot();
  if ( host.sclang?.status === 'attached' && host.control?.mode !== 'headless' ) {
    throw new Error( 'An attached SuperCollider IDE host is already available.' );
  }
  return nativeScHost.start( { oscPort: configuration.oscPort, deferServerBoot } );
}

async function stopHeadlessHost() {
  const service = services.firstService( ( candidate ) => candidate.hostSnapshot?.().control?.mode === 'headless' );
  if ( signalCaptures.diagnostics().sources.length || scBusAudio.has() || toolRuntimes?.has( 'shared-loop' ) || [ ...nativeToolInstances.values() ].some( ( owned ) => owned.service === service ) ) {
    throw new Error( 'Stop SC captures or close instrument views before stopping their host.' );
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
  if ( profileID === 'hosted' ) {
    const activeMode = activeNativeHostMode( service.hostSnapshot() );
    if ( !activeMode ) {
      throw new Error( 'No native SuperCollider host is available. Open SuperCollider or start the headless host first.' );
    }
    profileID = activeMode;
  }
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

async function launchHeadlessLiveSet(request) {
  const existing=registry.list().find(v=>v.toolID==='live-set'&&windows.has(v.viewID));
  if(existing){await focusToolView(existing.viewID);return {status:'accepted',viewID:existing.viewID};}
  if(liveSetLaunch)return liveSetLaunch;
  liveSetLaunch=(async()=>{
    await startHeadlessHost({deferServerBoot:true});
    const configuration=hostConfigurationFromArgs(process.argv.slice(1)),service=await ensureHost(configuration);
    await waitFor(()=>service.hostSnapshot().control?.status==='ready'&&service.hostSnapshot().control?.mode==='headless',30000);
    const bridge=await createLiveSetHostBridge({port:configuration.oscPort,token:shellHostToken,libraryRoot:path.resolve(appRoot,'../../.rack-sc-libraries')});
    let result;
    try {
      const binding=await bridge.open();
      const session={...binding,bridge,service,close:async()=>{try{await bridge.close()}finally{if(liveSetSession===session)liveSetSession=null}}};
      liveSetSession=session;
      result=await router.launch({...request,toolInstanceID:binding.instanceID,owner:{kind:'attached-process',pid:binding.processID}});
      if(result.status!=='accepted')throw Error(result.error??'Live set window could not open');
      nativeToolInstances.set(result.viewID,{service,toolID:'live-set',instanceID:binding.instanceID,close:session.close});
      return result;
    } catch(error) {
      await bridge.close().catch(()=>{});liveSetSession=null;throw error;
    }
  })();
  try{return await liveSetLaunch}finally{liveSetLaunch=null}
}

async function launchFromHome( rawRequest ) {
  if(rawRequest.toolID==='live-set'&&rawRequest.profileID==='headless'&&!rawRequest.toolInstanceID)return launchHeadlessLiveSet(rawRequest);
  if ( [ 'shared-loop', 'scope' ].includes( rawRequest.toolID ) ) rawRequest = { ...rawRequest, profileID: 'hosted' };
  const nativeTool = rawRequest.toolID === 'score-studio'
    ? { instancePrefix: 'scoreArranger', profiles: [ 'hosted', 'attached', 'headless' ] }
    : rawRequest.toolID === 'field-modelling'
      ? { instancePrefix: 'fieldModelling', profiles: [ 'hosted', 'attached', 'headless' ] }
      : null;
  const routedRequest = nativeTool
    ? { ...rawRequest, profileID: canonicalNativeToolProfile( rawRequest.profileID ) }
    : rawRequest;
  if ( !nativeTool
    || !nativeTool.profiles.includes( rawRequest.profileID )
    || rawRequest.toolInstanceID
    || rawRequest.connections?.oscPort ) return router.launch( routedRequest );

  const native = await nativeHostForProfile( rawRequest.profileID );
  const instanceID = `${ nativeTool.instancePrefix }:${ crypto.randomUUID() }`;
  await native.service.openToolInstance( rawRequest.toolID, instanceID );
  const request = { ...routedRequest, toolInstanceID: instanceID,
    connections: { ...( rawRequest.connections ?? {} ), oscHost: native.configuration.oscHost,
      oscPort: native.configuration.oscPort } };
  let result;
  try {
    result = await router.launch( request );
    if ( result.status === 'accepted' ) {
      nativeToolInstances.set( result.viewID, { service: native.service, toolID: rawRequest.toolID, instanceID } );
      return result;
    }
    return result;
  } finally {
    if ( result?.status !== 'accepted' ) {
      await native.service.closeToolInstance( rawRequest.toolID, instanceID ).catch( () => {} );
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
      const toolButtons = [...document.querySelectorAll('button[data-tool]')].map((button) => ({
        tool: button.dataset.tool,
        profile: button.dataset.profile,
        label: button.textContent.trim()
      }));
      const scoreProfiles = toolButtons.filter((button) => button.tool === 'score-studio');
      const fieldProfiles = toolButtons.filter((button) => button.tool === 'field-modelling');
      const obsoleteProfiles = [...scoreProfiles, ...fieldProfiles]
        .filter((button) => button.profile === 'attached' || button.profile === 'headless');
      const profilesReady = scoreProfiles.length === 1
        && scoreProfiles[0].profile === 'hosted'
        && scoreProfiles[0].label === 'Open hosted'
        && fieldProfiles.length === 2
        && fieldProfiles.some((button) => button.profile === 'standalone' && button.label === 'New analytic field')
        && fieldProfiles.some((button) => button.profile === 'hosted' && button.label === 'Open hosted')
        && obsoleteProfiles.length === 0;
      if (scoreActions === 2 && lissajousActions === 2 && hostFacts === 4 && profilesReady) resolve({ scoreActions, lissajousActions, hostFacts, scoreProfiles, fieldProfiles });
      else if (Date.now() - started > 5000) reject(new Error('Toolkit Home document and host facts did not render: score=' + scoreActions + ' lissajous=' + lissajousActions + ' host=' + hostFacts));
      else setTimeout(check, 25);
    }; check();
  })` );
  console.log( `AWB_SHELL_HOME_PROJECTIONS documents=${ result.scoreActions + result.lissajousActions } hostFacts=${ result.hostFacts } hostServices=${ services.snapshot().length } profiles=hosted-public` ); app.quit();
}

async function runScBusSmoke() {
  smokeRunning=true;
  await startHeadlessHost();
  await waitFor(()=>services.firstService()?.hostSnapshot?.().scsynth.status==='ready',30000);
  const hostPID=nativeScHost.snapshot().processID;
  const osc=new ScBusOSC(nativeScHost.snapshot().serverPort);
  try {
    await osc.request('/d_load',[option(process.argv,'smoke-sc-bus-def')],'/done',a=>a[0]==='/d_load');
    osc.send('/s_new','awbScBusSmokeSource',888881,1,0);await osc.sync();
    const baseline=await osc.request('/status',[],'/status.reply');
    const launched=await launchFromHome({toolID:'lissajous',profileID:'standalone',launchOrigin:'desktop'});
    if(launched.status!=='accepted')throw new Error(JSON.stringify(launched));
    await waitFor(()=>registry.get(launched.viewID)?.lifecycle==='ready',30000);
    const win=windows.get(launched.viewID);win.show();win.focus();
    win.webContents.on('console-message',event=>{if(event.level>=2)console.error('SC bus renderer:',event.message)});
    await win.webContents.executeJavaScript(`(()=>{
      window.__scBusSmoke={frames:0,rate:0,channels:0,end:0,peaks:[],requests:[]};
      const Original=window.WebSocket;
      window.WebSocket=class extends Original {constructor(...args){super(...args);this.addEventListener('message',event=>{
        if(!(event.data instanceof ArrayBuffer)||event.data.byteLength<48)return;
        const v=new DataView(event.data);if(v.getUint32(0,true)!==0x43535741)return;
        const s=window.__scBusSmoke;s.frames++;s.rate=v.getFloat64(16,true);s.channels=v.getUint32(36,true);s.end=v.getFloat64(24,true);
        const n=v.getUint32(40,true),samples=new Float32Array(event.data,48);
        s.peaks=Array.from({length:s.channels},(_,ch)=>Math.max(...samples.subarray(ch*n,(ch+1)*n).map(Math.abs)));
      })}};
      const source=document.querySelector('button[title="Source"]');if(source.getAttribute('aria-pressed')!=='true')source.click();
    })()`);
    const setRange=async(bus,channels)=>win.webContents.executeJavaScript(`(()=>{
      const input=document.querySelector('[aria-label="SC audio bus"]');Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(input,${bus});input.dispatchEvent(new Event('input',{bubbles:true}));
      const select=document.querySelector('[aria-label="SC bus channels"]');Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype,'value').set.call(select,'${channels}');select.dispatchEvent(new Event('change',{bubbles:true}));
    })()`);
    const click=async(text)=>win.webContents.executeJavaScript(`(()=>{const b=[...document.querySelectorAll('button')].find(b=>b.textContent.trim()==='${text}');if(!b)throw new Error('Missing ${text}');b.click()})()`);
    await win.webContents.executeJavaScript(`new Promise((resolve,reject)=>{const until=Date.now()+5000;const poll=()=>{if(document.querySelector('[aria-label="SC audio bus"]'))resolve();else if(Date.now()>until)reject(new Error('SC Bus controls did not mount'));else setTimeout(poll,20)};poll()})`);
    await setRange(32,4);await new Promise(resolve=>setTimeout(resolve,100));await click('Start SC Bus');
    await waitFor(()=>registry.get(launched.viewID)?.sessionState?.sourceKind==='sc-bus',15000);
    await new Promise(resolve=>setTimeout(resolve,700));
    const first=await win.webContents.executeJavaScript('window.__scBusSmoke');
    if(first.frames<4||first.channels!==4||first.peaks.some((p,i)=>Math.abs(p-(i+1)*.1)>.002))throw new Error('Wrong raw SC bus channel samples: '+JSON.stringify(first));
    // Compare canvas pixels only: status counters and dropdown labels cannot prove drawing.
    const plot=await win.webContents.executeJavaScript(`(()=>{const r=document.querySelector('canvas').getBoundingClientRect();return {x:Math.ceil(r.x),y:Math.ceil(r.y),width:Math.floor(r.width),height:Math.floor(r.height)}})()`);
    const capturePlot=async()=> (await win.webContents.capturePage(plot)).toPNG();
    const shape=async()=>{
      const image=await win.webContents.capturePage(plot),{width,height}=image.getSize(),bitmap=image.toBitmap();
      let minX=width,maxX=-1,minY=height,maxY=-1;
      for(let y=Math.floor(height/4);y<height*3/4;y++)for(let x=Math.floor(width/4);x<width*3/4;x++){
        const i=(y*width+x)*4;if(bitmap[i]>40||bitmap[i+1]>40||bitmap[i+2]>40){minX=Math.min(minX,x);maxX=Math.max(maxX,x);minY=Math.min(minY,y);maxY=Math.max(maxY,y)}
      }
      return {width:Math.max(0,maxX-minX+1),height:Math.max(0,maxY-minY+1)};
    };
    const awaitShape=async(predicate,message)=>{const until=Date.now()+5000;let current;do{current=await shape();if(predicate(current))return current;await new Promise(resolve=>setTimeout(resolve,100))}while(Date.now()<until);throw new Error(message+': '+JSON.stringify(current))};
    const beforeShape=await awaitShape(s=>s.width>15&&s.height>25,'Initial SC curve was not drawn');
    await win.webContents.executeJavaScript(`document.querySelector('button[title="Patterns"]').click()`);
    await win.webContents.executeJavaScript(`new Promise((resolve,reject)=>{const until=Date.now()+5000;const poll=()=>{const select=document.querySelector('#pattern-source-pair');if(select){const labels=[...select.options].map(o=>o.textContent.trim());if(labels.join('|')!=='1 · SC buses 32/33|2 · SC buses 34/35'){reject(new Error('Wrong SC bus pair labels: '+labels));return}Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype,'value').set.call(select,'1');select.dispatchEvent(new Event('change',{bubbles:true}));resolve()}else if(Date.now()>until)reject(new Error('Pattern pair controls did not mount'));else setTimeout(poll,20)};poll()})`);
    await new Promise(resolve=>setTimeout(resolve,500));
    await awaitShape(s=>s.width>beforeShape.width*1.8&&s.height>beforeShape.height*1.3,'SC buses 34/35 did not produce their expected larger curve');
    const image1=await capturePlot();
    osc.send('/n_set',888881,'gain',.25);await osc.sync();await new Promise(resolve=>setTimeout(resolve,500));
    await awaitShape(s=>s.width<beforeShape.width*1.2&&s.height<beforeShape.height*.8,'SC gain change did not shrink the selected pair');
    const image2=await capturePlot();
    const screenshot=option(process.argv,'smoke-screenshot');if(screenshot)await writeFile(screenshot,(await win.webContents.capturePage()).toPNG());
    if(image1.equals(image2))throw new Error('Lissajous image did not respond to an SC gain change');
    await win.webContents.executeJavaScript(`document.querySelector('button[title="Add a new pattern"]').click()`);
    await new Promise(resolve=>setTimeout(resolve,100));
    await win.webContents.executeJavaScript(`(()=>{if(document.querySelector('#pattern-source-pair').value!=='0')throw new Error('New pattern did not get its own default pair');document.querySelector('button[title="Pattern 1"]').click()})()`);
    await new Promise(resolve=>setTimeout(resolve,100));
    if(await win.webContents.executeJavaScript(`document.querySelector('#pattern-source-pair').value`)!=='1')throw new Error('Patterns lost independent SC pair selections');
    osc.send('/n_set',888881,'gain',1);await osc.sync();
    // A second private tap must coexist without tail-following feedback, then release alone.
    const peer=await scBusAudio.start('sc-bus-smoke-peer',{bus:34,channels:2});
    const PeerSocket=require('ws').WebSocket,peerSocket=new PeerSocket(peer.endpoint);let peerFrames=0;
    peerSocket.on('message',()=>peerFrames++);peerSocket.on('error',()=>{});
    await new Promise(resolve=>setTimeout(resolve,300));
    const live=await win.webContents.executeJavaScript('window.__scBusSmoke.frames');
    if(peerFrames<3||live<=first.frames)throw new Error('Concurrent SC bus taps stopped publishing');
    peerSocket.terminate();await scBusAudio.releaseView('sc-bus-smoke-peer');
    await win.webContents.executeJavaScript(`document.querySelector('button[title="Source"]').click()`);
    await new Promise(resolve=>setTimeout(resolve,100));
    await click('Stop SC Bus');await waitFor(()=>!scBusAudio.has(),5000);
    await setRange(34,2);await new Promise(resolve=>setTimeout(resolve,100));await click('Start SC Bus');
    await waitFor(()=>registry.get(launched.viewID)?.sessionState?.audioChannels===2&&registry.get(launched.viewID)?.sessionState?.sourceKind==='sc-bus',10000);
    await new Promise(resolve=>setTimeout(resolve,400));const second=await win.webContents.executeJavaScript('window.__scBusSmoke');
    if(second.channels!==2||Math.abs(second.peaks[0]-.3)>.002||Math.abs(second.peaks[1]-.4)>.002)throw new Error('Switching SC bus range lost channel identity');
    await win.webContents.executeJavaScript(`document.querySelector('button[title="Patterns"]').click()`);
    await win.webContents.executeJavaScript(`new Promise((resolve,reject)=>{const until=Date.now()+5000;const poll=()=>{const select=document.querySelector('#pattern-source-pair');if(select){if(select.value!=='1'||select.options[0].textContent.trim()!=='1 · SC buses 34/35'||!select.options[1].disabled)reject(new Error('Reduced bus range silently changed the selected pair'));else resolve()}else if(Date.now()>until)reject(new Error('Missing pattern bus selector'));else setTimeout(poll,20)};poll()})`);
    await closeToolView(launched.viewID);await waitFor(()=>!scBusAudio.has(),5000);
    const state=await osc.request('/status',[],'/status.reply');
    if(nativeScHost.snapshot().processID!==hostPID||state[2]!==baseline[2]||state[3]!==baseline[3]||registry.list().some(v=>v.toolID!=='lissajous'))throw new Error('View closure disturbed host or unrelated tool opened');
    console.log(`AWB_SC_BUS_READY source=sc-bus channels=4,2 raw-peaks=true switching=true live-image=true concurrent=true pair-routing=true actualRate=${first.rate} host-survives=true unrelated-tools=0`);
  } finally {osc.send('/n_free',888881);await osc.sync().catch(()=>{});osc.close()}
  app.quit();
}

async function runSharedLoopSmoke() {
  smokeRunning = true;
  const unavailable = await launchFromHome({toolID:'shared-loop',profileID:'hosted',launchOrigin:'desktop'});
  if(unavailable.status!=='failed')throw new Error('Looper launched without shell host');
  const failed = registry.list().find(view=>view.toolID==='shared-loop');
  if(failed)await closeToolView(failed.viewID);
  await startHeadlessHost();
  await waitFor( () => services.firstService( ( service ) => service.hostSnapshot?.().scsynth.status === 'ready' ), 30000 );
  const hostPID = nativeScHost.snapshot().processID;
  const serviceCount = services.snapshot().length;
  await homeWindow.webContents.executeJavaScript( `new Promise((resolve, reject) => {
    const started = Date.now();
    const check = () => {
      const button = document.querySelector('[data-tool="shared-loop"][data-profile="hosted"]');
      if (button) { button.click(); resolve(); }
      else if (Date.now()-started > 5000) reject(new Error('Shared Loop catalogue action missing'));
      else setTimeout(check, 25);
    }; check();
  })` );
  await waitFor( () => registry.list().some( ( view ) => view.toolID === 'shared-loop' && view.lifecycle === 'ready' ), 45000 );
  const loop = registry.list().find( ( view ) => view.toolID === 'shared-loop' );
  const window = windows.get( loop.viewID );
  const result = await window.webContents.executeJavaScript( `(async () => {
    const send = async (action, value) => {
      const response = await fetch('/api/control', {method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({action,value})});
      if (!response.ok) throw new Error('Looper control failed');
    };
    await send('outputGain', 0);
    document.querySelector('#record').click();
    const wait = async (predicate) => {const started=Date.now();while(!predicate()){if(Date.now()-started>10000)throw new Error('Looper UI timed out');await new Promise(r=>setTimeout(r,40));}};
    await wait(()=>document.querySelector('#mode').textContent==='PLAYING');
    const stored = await (await fetch('/api/state')).json();
    if (Math.max(...stored.snapshot.envelope)<0.2) throw new Error('Shared waveform missing');
    document.querySelector('#overdub').click();
    await wait(()=>document.querySelector('#mode').textContent==='OVERDUBBING');
    document.querySelector('#play').click();
    await wait(()=>document.querySelector('#mode').textContent==='STOPPED');
    const canvas=document.querySelector('#wave');
    return {connected:stored.connected,sequence:stored.snapshot.sequence,width:canvas.width,height:canvas.height};
  })()` );
  if ( !result.connected || result.width < 100 || result.height < 100 ) throw new Error( 'Looper canvas is unavailable.' );
  const screenshot = option( process.argv, 'smoke-screenshot' );
  if ( screenshot ) { window.show(); window.focus(); await window.webContents.executeJavaScript('new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)))'); await writeFile( screenshot, ( await window.webContents.capturePage() ).toPNG() ); }
  const beforeClose = await window.webContents.executeJavaScript(`fetch('/api/state').then(r=>r.json())`);
  if ( beforeClose.session.host !== 'shell' || beforeClose.session.port !== nativeScHost.snapshot().serverPort ) throw new Error('Looper did not use shell SC');
  if ( beforeClose.snapshot.sampleRate !== beforeClose.session.sampleRate ) throw new Error('Looper sample rate differs from host');
  if(signalCaptures.diagnostics().sources.length)throw new Error('Looper allocated scope taps without viewers');
  const loopOSCModule = await import( path.resolve( appRoot, '../../tool-artifacts/shared-loop/0.1.0/osc.mjs' ) );
  const serverProbe = new loopOSCModule.OSC( beforeClose.session.port );
  // A separate node must survive closing the looper on the same server.
  serverProbe.send('/g_new', 900000001, 1, 1); await serverProbe.sync();
  await serverProbe.request('/d_load', [path.resolve(appRoot,'../../tool-artifacts/shared-loop/0.1.0/build/awbScopeMicProbeV1.scsyndef')], '/done', a=>a[0]==='/d_load');
  await serverProbe.request('/d_load', [path.resolve(appRoot,'../../tool-artifacts/shared-loop/0.1.0/build/awbScopeOutputProbeV1.scsyndef')], '/done', a=>a[0]==='/d_load');
  serverProbe.send('/s_new','awbScopeMicProbeV1',900000011,0,0);
  serverProbe.send('/s_new','awbScopeOutputProbeV1',900000012,1,0); await serverProbe.sync();
  await window.webContents.executeJavaScript(`document.querySelector('#micScope').click();document.querySelector('#outputScope').click();document.querySelector('#controlScope').click();`);
  await waitFor(()=>scopeWindows.get(loop.viewID)?.size===3,5000);
  const capture = async (kind) => {
    const scope = scopeWindows.get(loop.viewID).get(kind);scope.webContents.setBackgroundThrottling(false);scope.show();scope.focus();
    const checked=await scope.webContents.executeJavaScript(`(async()=>{
      const started=Date.now();let state;
      while(Date.now()-started<6000){
        state=await(await fetch('/api/scopes')).json();
        if(state.connected&&state.scopes.mic?.peaks[0]>0.079&&state.scopes.output?.peaks[0]>0.0039)break;
        await new Promise(r=>setTimeout(r,50));
      }
      if(!state.connected||state.scopes.mic.peaks[0]<0.079||state.scopes.output.peaks[0]<0.0039||Math.abs(state.scopes.output.peaks[1]-0.002)>0.0001)throw new Error('Scope routing did not match hardware bus probes: '+JSON.stringify(state));
      if(state.scopes.mic.channels!==1||state.scopes.output.channels!==2||state.scopes.output.frames!==1024)throw new Error('Scope format mismatch');
      if(state.scopes.output.samples||state.scopes.mic.samples)throw new Error('Scope API unexpectedly contains sample JSON');
      const {decodeScopeFrame,SCOPE_PROTOCOL}=await import('/scope-protocol.js');
      const binary=await new Promise((resolve,reject)=>{
        const ws=new WebSocket(location.origin.replace('http:','ws:')+'/scope/socket?kind=${kind}',SCOPE_PROTOCOL);ws.binaryType='arraybuffer';
        const timeout=setTimeout(()=>{ws.close();reject(new Error('Binary scope timed out'));},3000);
        ws.onerror=()=>{clearTimeout(timeout);reject(new Error('Binary scope connection failed'));};
        ws.onmessage=event=>{if(typeof event.data==='string')return;try{const frame=decodeScopeFrame(event.data,'${kind}',${beforeClose.session.sharedId});
          ws.send(JSON.stringify({ack:frame.sequence}));clearTimeout(timeout);ws.close();
          resolve({channels:frame.channels,frames:frame.frames,peak:Math.max(...frame.samples.subarray(0,frame.frames)),rightPeak:frame.channels===2?Math.max(...frame.samples.subarray(frame.frames)):null});
        }catch(error){clearTimeout(timeout);ws.close();reject(error);}};
      });
      if(binary.frames!==1024||binary.channels!==('${kind}'==='mic'?1:2)||Math.abs(binary.peak-('${kind}'==='mic'?0.08:0.004))>0.0001||binary.rightPeak!==null&&Math.abs(binary.rightPeak-0.002)>0.0001)throw new Error('Binary samples/stride differ from SC bus probes');
      if(document.querySelector('#scope').dataset.transport!=='binary-v5')throw new Error('Scope GUI did not receive binary frames');
      const readyAt=Date.now();while(document.querySelector('#connection').textContent!=='Live') {if(Date.now()-readyAt>3000)throw new Error('Scope UI not live');await new Promise(r=>setTimeout(r,40));}
      return {node:typeof require,host:typeof awbHost,peak:state.scopes['${kind}'].peaks,rate:state.scopes['${kind}'].sampleRate};
    })()`);
    if(checked.node!=='undefined'||checked.host!=='undefined'||checked.rate!==beforeClose.session.sampleRate)throw new Error('Scope sandbox or sample rate mismatch');
    scope.show(); scope.focus();
    await scope.webContents.executeJavaScript(`(async()=>{
      document.querySelector('#gain').value=String(document.querySelector('#gain').dataset.scale==='log2'?Math.log2(16):16);document.querySelector('#gain').dispatchEvent(new Event('change'));
      document.querySelector('#zoom').value=String(document.querySelector('#zoom').dataset.scale==='log2'?Math.log2(4):4);document.querySelector('#zoom').dispatchEvent(new Event('change'));
      document.querySelector('#pan').value='50';document.querySelector('#pan').dispatchEvent(new Event('input'));
      const started=Date.now();while(!document.querySelector('#scope').dataset.renderedSequence){if(Date.now()-started>3000)throw new Error('Scope canvas never painted');await new Promise(r=>setTimeout(r,25));}
      await new Promise(resolve=>setTimeout(resolve,200));
    })()`);
    const fits=await scope.webContents.executeJavaScript(`document.documentElement.scrollWidth<=innerWidth&&document.querySelector('footer').getBoundingClientRect().bottom<=innerHeight`);
    if(!fits)throw new Error('Scope controls/footer do not fit the default viewport');
    if(screenshot)await writeFile(screenshot.replace('.png',`-${kind}.png`),(await scope.webContents.capturePage()).toPNG());
    return scope;
  };
  const micWindow=await capture('mic'),outputWindow=await capture('output');
  const outputSource=signalCaptures.diagnostics().sources.find(s=>s.rate==='audio'&&s.bus===0&&s.channels===2);
  if(!outputSource||outputSource.subscribers!==1||signalCaptures.diagnostics().sources.length!==3)throw new Error('Scope taps did not allocate per demand');
  const sharedPeer=await scBusAudio.start('scope-lissajous-peer',{bus:0,channels:2});
  if(sharedPeer.generation!==outputSource.generation||signalCaptures.diagnostics().sources.find(s=>s.generation===sharedPeer.generation)?.subscribers!==2)throw new Error('SC Bus and scope did not share one physical capture');
  const PeerSocket=require('ws').WebSocket,sharedPeerSocket=new PeerSocket(sharedPeer.endpoint);let rawPeerFrames=0;
  sharedPeerSocket.on('error',()=>{});sharedPeerSocket.on('message',packet=>{
   if(packet.readUInt32LE(40)!==512||packet.readUInt32LE(36)!==2||packet.readDoubleLE(16)!==beforeClose.session.sampleRate)throw new Error('Scope zoom degraded raw SC Bus PCM');
   rawPeerFrames++;
  });
  await waitFor(()=>rawPeerFrames>3,3000);
  const controlWindow=scopeWindows.get(loop.viewID).get('control');
  if(!controlWindow)throw new Error('Control scope did not open');
  controlWindow.webContents.setBackgroundThrottling(false);
  for(const scope of [micWindow,outputWindow]) {
    scope.show();scope.focus();
    const zoomed=await scope.webContents.executeJavaScript(`(async()=>{
      document.querySelector('#freeze').click();const sequence=document.querySelector('#updates').textContent;
      document.querySelector('#zoom').value=String(document.querySelector('#zoom').dataset.scale==='log2'?Math.log2(8):8);document.querySelector('#zoom').dispatchEvent(new Event('change'));
      document.querySelector('#pan').value='100';document.querySelector('#pan').dispatchEvent(new Event('input'));
      await new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(new Error('Visible scope paint timed out')),5000);requestAnimationFrame(()=>requestAnimationFrame(()=>{clearTimeout(timer);resolve();}));});
      const canvas=document.querySelector('#scope');
      const valid=canvas.dataset.visibleFrames==='128'&&canvas.dataset.startFrame==='896'&&!document.querySelector('#pan').disabled&&document.querySelector('#updates').textContent===sequence;
      document.querySelector('#zoom').value=String(document.querySelector('#zoom').dataset.scale==='log2'?Math.log2(1):1);document.querySelector('#zoom').dispatchEvent(new Event('change'));
      await new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(new Error('Visible scope paint timed out')),5000);requestAnimationFrame(()=>requestAnimationFrame(()=>{clearTimeout(timer);resolve();}));});
      const reset=canvas.dataset.visibleFrames==='1024'&&canvas.dataset.startFrame==='0'&&document.querySelector('#pan').disabled;
      document.querySelector('#freeze').click();return valid&&reset;
    })()`);
    if(!zoomed)throw new Error('Scope horizontal zoom/pan/reset failed on frozen snapshot');
  }
  for(const [kind,scope] of [['mic',micWindow],['output',outputWindow],['control',controlWindow]]) {
    scope.show();scope.focus();
    const wider=await scope.webContents.executeJavaScript(`(async()=>{
      const {decodeScopeFrame,SCOPE_PROTOCOL}=await import('/scope-protocol.js');
      const {ScopeHistory}=await import('/scope-history.js');
      const wait=async(predicate)=>{const start=Date.now();while(!predicate()){if(Date.now()-start>7000)throw new Error('Wide capture/GUI timed out: '+JSON.stringify({kind:'${kind}',dataset:{...document.querySelector('#scope').dataset},connection:document.querySelector('#connection').textContent,metadata:await(await fetch('/api/scopes')).json()}));await new Promise(r=>setTimeout(r,35));}};
      document.querySelector('#gain').value=String(document.querySelector('#gain').dataset.scale==='log2'?Math.log2(1):1);document.querySelector('#gain').dispatchEvent(new Event('change'));
      document.querySelector('#zoom').value=String(document.querySelector('#zoom').dataset.scale==='log2'?Math.log2(0.0625):0.0625);document.querySelector('#zoom').dispatchEvent(new Event('change'));
      const expectedSource='${kind}'==='control'?2048:16384,reduction='${kind}'==='control'?1:16;
      await wait(()=>document.querySelector('#scope').dataset.sourceFrames===String(expectedSource)&&document.querySelector('#scope').dataset.format===('${kind}'==='control'?'samples':'minmax'));
      let publications=0,firstEnd,lastEnd;
      const frame=await new Promise((resolve,reject)=>{
        const ws=new WebSocket(location.origin.replace('http:','ws:')+'/scope/socket?kind=${kind}',SCOPE_PROTOCOL);ws.binaryType='arraybuffer';
        const composite=new ScopeHistory('${kind}'==='control'?128:1024);
        const timeout=setTimeout(()=>{ws.close();reject(new Error('Rolling history timed out'));},9000);
        ws.onerror=()=>{clearTimeout(timeout);reject(new Error('Wide packet connection failed'));};
        ws.onmessage=event=>{if(typeof event.data==='string')return;try{
          const f=decodeScopeFrame(event.data,'${kind}',${beforeClose.session.sharedId});ws.send(JSON.stringify({ack:f.sequence}));
          const expectedChunk='${kind}'==='control'?32:1024;
          if(f.sourceFrames!==expectedChunk||f.frames!==expectedChunk/reduction)throw new Error('Zoom changed the source chunk size instead of reduction');
          if(firstEnd===undefined)firstEnd=f.sourceEnd;lastEnd=f.sourceEnd;publications++;
          composite.append(f);const view=composite.view(expectedSource);
          if(lastEnd-firstEnd<expectedSource-expectedChunk||view.missingSourceFrames)return;
          clearTimeout(timeout);ws.close();resolve(view);
        }catch(error){clearTimeout(timeout);ws.close();reject(error);}};
      });
      if(frame.frames!==expectedSource/reduction||frame.samples.length!==frame.frames*frame.channels*(reduction===1?1:2))throw new Error('Wide bucket count/stride incorrect');
      const expectedRate='${kind}'==='control'?${beforeClose.session.sampleRate}/${beforeClose.session.blockSize}:${beforeClose.session.sampleRate};
      if(frame.sampleRate!==expectedRate||frame.audioSampleRate!==${beforeClose.session.sampleRate})throw new Error('Audio/control rate mismatch');
      if(reduction!==1)for(let i=0;i<frame.samples.length;i+=2)if(frame.samples[i]>frame.samples[i+1])throw new Error('Minmax bucket reversed');
      if('${kind}'==='control'){
        if(Math.max(...frame.samples)<.99||Math.min(...frame.samples)>-.99)throw new Error('Control LFO shape missing');
        // A 1 Hz LFO should have approximately duration positive-going crossings, within one window phase.
        let crossings=0;for(let i=1;i<frame.frames;i++){if(frame.samples[i-1]<0&&frame.samples[i]>=0)crossings++;}
        if(Math.abs(crossings-frame.sourceFrames/frame.sampleRate)>1)throw new Error('Control LFO time axis incorrect');
        if(frame.channels!==6||frame.peaks.length!==6||frame.rms.length!==6)throw new Error('Control array dimensions incorrect');
        const stride=frame.frames;
        let fastCrossings=0;for(let i=1;i<stride;i++){if(frame.samples[stride+i-1]<0&&frame.samples[stride+i]>=0)fastCrossings++;}
        if(Math.abs(fastCrossings-10*frame.sourceFrames/frame.sampleRate)>1)throw new Error('Fast 10 Hz LFO missing/wrong time axis');
        const noise=[];for(let ch=2;ch<6;ch++){
          const values=frame.samples.subarray(ch*stride,(ch+1)*stride);
          if(values.some(value=>!Number.isFinite(value)||Math.abs(value)>1.001)||new Set(values).size<2)throw new Error('Noise channel '+ch+' is absent or constant');
          noise.push(values);
        }
        for(let i=0;i<noise.length;i++)for(let j=i+1;j<noise.length;j++)if(noise[i].every((value,n)=>value===noise[j][n]))throw new Error('Noise channels are duplicate copies');
        const paint=()=>new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(new Error('Control signal picker paint timed out')),3000);requestAnimationFrame(()=>requestAnimationFrame(()=>{clearTimeout(timer);resolve();}));});
        document.querySelector('#freeze').click();const held=document.querySelector('#updates').textContent;
        for(const [mode,expected] of [['noise','2,3,4,5'],['fast','1'],['slow','0'],['all','0,1,2,3,4,5']]){
          document.querySelector('#signals').value=mode;document.querySelector('#signals').dispatchEvent(new Event('change'));await paint();
          if(document.querySelector('#scope').dataset.visibleChannels!==expected||document.querySelector('#updates').textContent!==held)throw new Error('Control signal picker/freeze failed');
        }
        document.querySelector('#freeze').click();
        for(const [mode,expected] of [['slow','0'],['fast','1'],['noise','2,3,4,5'],['all','0,1,2,3,4,5']]){
          document.querySelector('#signals').value=mode;document.querySelector('#signals').dispatchEvent(new Event('change'));
          await wait(()=>document.querySelector('#scope').dataset.channelIds===expected&&document.querySelector('#scope').dataset.visibleChannels===expected);
        }
        document.querySelector('#signals').value='fast';document.querySelector('#signals').dispatchEvent(new Event('change'));
        await wait(()=>document.querySelector('#scope').dataset.channelIds==='1'&&document.querySelector('#scope').dataset.visibleChannels==='1');
        document.querySelector('#freeze').click();await paint();const paintCount=document.querySelector('#scope').dataset.paints;
        await new Promise(r=>setTimeout(r,160));
        if(document.querySelector('#scope').dataset.paints!==paintCount)throw new Error('Frozen subset kept painting');
        if(!document.querySelector('#signals option[value="all"]').disabled||document.querySelector('#signals option[value="fast"]').disabled)throw new Error('Frozen subset offers unavailable history');
        document.querySelector('#freeze').click();document.querySelector('#signals').value='all';document.querySelector('#signals').dispatchEvent(new Event('change'));
        await wait(()=>document.querySelector('#scope').dataset.channelIds==='0,1,2,3,4,5');

      }else{
        const expected='${kind}'==='mic'?.08:.004;
        if(Math.abs(Math.max(...frame.samples.subarray(0,frame.frames*2))-expected)>.0001)throw new Error('Wide reduction lost audio peaks');
        if(frame.channels===2&&Math.abs(Math.max(...frame.samples.subarray(frame.frames*2))-.002)>.0001)throw new Error('Wide stereo stride/peak incorrect');
      }
      await wait(()=>document.querySelector('#scope').dataset.visibleFrames===String(expectedSource/reduction));
      if(publications<4)throw new Error('Rolling history did not advance through multiple short chunks');
      if(lastEnd-firstEnd<=0)throw new Error('Source clock did not advance');
      const duration=Number.parseFloat(document.querySelector('#duration').textContent);
      if(Math.abs(duration-1000*frame.sourceFrames/frame.sampleRate)>.02)throw new Error('Wider ruler duration incorrect');
      if(!document.querySelector('#pan').disabled)throw new Error('Wider capture should display its entire range');
      if(document.documentElement.scrollWidth>innerWidth||document.querySelector('footer').getBoundingClientRect().bottom>innerHeight)throw new Error('Wide scope footer/controls do not fit');
      if(document.querySelector('#connection').textContent!=='Live')throw new Error('Wide/control scope did not recover live status');
      return {sourceFrames:frame.sourceFrames,frames:frame.frames,duration,format:frame.format,rate:frame.sampleRate,publications,sourceClockAdvance:lastEnd-firstEnd,node:typeof require,host:typeof awbHost};
    })()`);
    if(wider.node!=='undefined'||wider.host!=='undefined')throw new Error('Wide/control scope escaped sandbox');
    scope.show();scope.focus();
    if(screenshot){
      await scope.webContents.executeJavaScript(`new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(new Error('Control screenshot paint timed out')),3000);requestAnimationFrame(()=>requestAnimationFrame(()=>{clearTimeout(timer);resolve();}));})`);
      await writeFile(screenshot.replace('.png',`-${kind}-wide.png`),(await scope.webContents.capturePage()).toPNG());
    }
    console.log('AWB_SHARED_SCOPE_WIDE '+JSON.stringify({kind,...wider}));
    if(kind==='control'){
      const single=await scope.webContents.executeJavaScript(`(async()=>{
        document.querySelector('#zoom').value=String(document.querySelector('#zoom').dataset.scale==='log2'?Math.log2(0.25):0.25);document.querySelector('#zoom').dispatchEvent(new Event('change'));
        const canvas=document.querySelector('#scope'),started=Date.now();
        while(canvas.dataset.frames!=='512'||canvas.dataset.format!=='samples'||canvas.dataset.missingSourceFrames!=='0'){
          if(Date.now()-started>5000)throw new Error('Quarter-width control raw history not ready');await new Promise(r=>setTimeout(r,35));
        }
        document.querySelector('#freeze').click();await new Promise(r=>setTimeout(r,50));
        const ctx=canvas.getContext('2d'),names=['beginPath','moveTo','closePath','stroke'],saved=Object.fromEntries(names.map(n=>[n,ctx[n]])),traces=[];
        let moves=0,closed=0;const colors=['#6ce0c1','#ffb276','#80bcff','#ed97bd','#b5df85','#bbabff'];
        ctx.beginPath=function(...a){moves=closed=0;return saved.beginPath.apply(this,a)};
        ctx.moveTo=function(...a){moves++;return saved.moveTo.apply(this,a)};
        ctx.closePath=function(...a){closed++;return saved.closePath.apply(this,a)};
        ctx.stroke=function(...a){if(colors.includes(this.strokeStyle))traces.push({moves,closed});return saved.stroke.apply(this,a)};
        try{document.querySelector('#gain').dispatchEvent(new Event('change'));await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));}
        finally{for(const n of names)ctx[n]=saved[n];}
        if(traces.length!==6||traces.some(t=>t.moves!==1||t.closed))throw new Error('Control lanes are not single open paths: '+JSON.stringify(traces));
        return {format:canvas.dataset.format,frames:Number(canvas.dataset.frames),paths:traces.length,closed:traces.reduce((n,t)=>n+t.closed,0)};
      })()`);
      if(screenshot)await writeFile(screenshot.replace('.png','-control-single-line.png'),(await scope.webContents.capturePage()).toPNG());
      console.log('AWB_CONTROL_SINGLE_TRACE_READY '+JSON.stringify(single));
      await scope.webContents.executeJavaScript(`document.querySelector('#freeze').click();void 0;`);
    }
    await scope.webContents.executeJavaScript(`document.querySelector('#zoom').value=String(document.querySelector('#zoom').dataset.scale==='log2'?Math.log2(1):1);document.querySelector('#zoom').dispatchEvent(new Event('change'));void 0;`);
  }
  const sliderGenerations=signalCaptures.diagnostics().sources.map(s=>s.generation).sort().join(',');
  for(const [kind,scope] of [['mic',micWindow],['output',outputWindow],['control',controlWindow]]){
    const sliders=await scope.webContents.executeJavaScript(`(async()=>{
      const canvas=document.querySelector('#scope'),base='${kind}'==='control'?128:1024,requests=[],originalFetch=window.fetch;
      const wait=async(fn)=>{const start=Date.now();while(!fn()){if(Date.now()-start>6000)throw new Error('Slider view did not settle: '+JSON.stringify({...canvas.dataset}));await new Promise(r=>setTimeout(r,25));}};
      const paint=()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));
      const axis=(id,value)=>{const input=document.querySelector('#'+id);if(input.type!=='range'||input.dataset.scale!=='log2')throw new Error('Missing zoom slider');input.value=String(value);input.dispatchEvent(new Event('input'));};
      window.fetch=(url,options)=>{if(String(url)==='/api/scope-view')requests.push(JSON.parse(options.body));return originalFetch(url,options);};
      try{
        const spans=[];
        for(const exponent of [-1.37,-2.43]){
          axis('zoom',exponent);const z=2**exponent,step='${kind}'==='control'?1:z>=.25?4:16,bins=Math.floor(base/z/step);
          await wait(()=>canvas.dataset.sourceFrames===String(bins*step)&&canvas.dataset.frames===String(bins)&&canvas.dataset.format===(step===1?'samples':'minmax'));
          const ms=Number.parseFloat(document.querySelector('#duration').textContent),rate='${kind}'==='control'?${beforeClose.session.sampleRate}/${beforeClose.session.blockSize}:${beforeClose.session.sampleRate};
          if(Math.abs(ms-1000*bins*step/rate)>.02)throw new Error('Fractional slider changed the time axis');spans.push({zoom:z,sourceFrames:bins*step,step});
        }
        // Crossing a capture-profile boundary repeatedly in one drag must coalesce requests.
        axis('zoom',0);await wait(()=>canvas.dataset.frames===String(base)&&canvas.dataset.format==='samples');const before=requests.length;
        for(let i=0;i<24;i++)axis('zoom',i%2?-2.1:-1.9);
        const z=2**-2.1,step='${kind}'==='control'?1:16,bins=Math.floor(base/z/step);
        await wait(()=>canvas.dataset.frames===String(bins)&&canvas.dataset.sourceFrames===String(bins*step));
        const dragRequests=requests.length-before;if(dragRequests>2)throw new Error('Slider flooded capture changes: '+dragRequests);
        axis('zoom',0);await wait(()=>canvas.dataset.frames===String(base)&&canvas.dataset.format==='samples');axis('gain',0);await paint();
        document.querySelector('#freeze').click();await paint();const held=canvas.dataset.renderedSourceEnd,image=canvas.toDataURL();
        axis('zoom',.63);document.querySelector('#pan').value='100';document.querySelector('#pan').dispatchEvent(new Event('input'));await paint();const zoomImage=canvas.toDataURL();
        axis('gain',3.25);await paint();if(canvas.toDataURL()===zoomImage||document.querySelector('#gainValue').textContent!=='9.51×')throw new Error('Y slider did not change the frozen waveform amplitude');
        const count=Math.floor(base/2**.63);
        if(canvas.dataset.visibleFrames!==String(count)||canvas.dataset.startFrame!==String(base-count)||document.querySelector('#pan').disabled||canvas.toDataURL()===image)throw new Error('Fractional frozen X/Y zoom or pan failed');
        await new Promise(r=>setTimeout(r,160));if(canvas.dataset.renderedSourceEnd!==held)throw new Error('Zoom altered the frozen source');
        for(const id of ['zoom','gain'])document.querySelector('#'+id).dispatchEvent(new MouseEvent('dblclick'));await paint();
        if(document.querySelector('#zoomValue').textContent!=='1×'||document.querySelector('#gainValue').textContent!=='1×'||canvas.dataset.visibleFrames!==String(base)||!document.querySelector('#pan').disabled)throw new Error('Slider reset failed');
        document.querySelector('#freeze').click();
        if(requests.some(r=>!['${kind}'].includes(r.kind)||![1,.25,.0625].includes(r.zoom)))throw new Error('Fractional zoom escaped supported capture profiles');
        if(document.documentElement.scrollWidth>innerWidth||document.querySelector('footer').getBoundingClientRect().bottom>innerHeight)throw new Error('Sliders overflow the scope window');
        return {kind:'${kind}',fractional:true,spans,dragRequests,frozenXY:true,reset:true};
      }finally{window.fetch=originalFetch;}
    })()`);
    console.log('AWB_SCOPE_SLIDERS_READY '+JSON.stringify(sliders));
  }
  if(signalCaptures.diagnostics().sources.map(s=>s.generation).sort().join(',')!==sliderGenerations)throw new Error('Slider changes replaced a physical SC capture');
  const cadenceProbe=await outputWindow.webContents.executeJavaScript(`(async()=>{
    const canvas=document.querySelector('#scope'),delay=ms=>new Promise(r=>setTimeout(r,ms)),results=[];
    const oldGain=document.querySelector('#gain').value;document.querySelector('#gain').value=String(document.querySelector('#gain').dataset.scale==='log2'?Math.log2(64):64);document.querySelector('#gain').dispatchEvent(new Event('change'));
    for(const fps of [30,15]){
      document.querySelector('#paintRate').value=String(fps);document.querySelector('#paintRate').dispatchEvent(new Event('change'));await delay(250);
      const count=Number(canvas.dataset.paints),end=Number(canvas.dataset.sourceEnd),image=canvas.toDataURL(),start=performance.now();await delay(1500);
      const rate=(Number(canvas.dataset.paints)-count)*1000/(performance.now()-start);
      if(rate>fps+1||rate<fps*.65||Number(canvas.dataset.sourceEnd)<=end)throw new Error('Scope paint cap/source progression failed: '+fps+' / '+rate);
      const pixelsChanged=canvas.toDataURL()!==image;if(!pixelsChanged)throw new Error('Capped scope canvas pixels did not change: '+fps);
      results.push({fps,actual:rate,pixelsChanged});
    }
    document.querySelector('#paintRate').value='0';document.querySelector('#paintRate').dispatchEvent(new Event('change'));document.querySelector('#gain').value=oldGain;document.querySelector('#gain').dispatchEvent(new Event('change'));return results;
  })()`);
  console.log('AWB_SCOPE_CADENCE_READY capture=unchanged rates='+JSON.stringify(cadenceProbe));
  const controlValue=await serverProbe.request('/c_get',[beforeClose.session.controlBus],'/c_set',a=>a[0]===beforeClose.session.controlBus);
  if(!Number.isFinite(controlValue[1])||Math.abs(controlValue[1])>1.001)throw new Error('Demo control bus unavailable');
  console.log('AWB_SCOPE_SELECTION_READY masks=0;1;2,3,4,5;0,1,2,3,4,5 frozen-subset=true');
  console.log('AWB_CONTROL_ARRAY_READY lfos=1,10 noise=1,5,20,100 channels=6 selector=all,noise,slow,fast');
  console.log('AWB_SHARED_SCOPE_WIDE_CHECKS_COMPLETE');
  if(process.argv.includes('--smoke-assess')) {
    const {assess}=await import(path.resolve(appRoot,'../../tool-artifacts/shared-loop/0.1.0/tests/assessment.mjs'));
    console.log('AWB_SHARED_LOOP_ASSESS '+JSON.stringify(await assess({serverProbe,session:beforeClose.session,url:window.webContents.getURL(),scopeWindows:[micWindow,outputWindow]})));
  }
  const frozen=await outputWindow.webContents.executeJavaScript(`(async()=>{document.querySelector('#freeze').click();const before=document.querySelector('#updates').textContent;await new Promise(r=>setTimeout(r,160));const after=document.querySelector('#updates').textContent;document.querySelector('#freeze').click();return before===after;})()`);
  if(!frozen)throw new Error('Scope freeze did not hold display');
  await outputWindow.webContents.executeJavaScript(`(async()=>{
   const button=document.querySelector('#freeze');if(button.textContent==='Resume')button.click();button.click();
   await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));
   const before=document.querySelector('#scope').dataset.paints;await new Promise(r=>setTimeout(r,250));
   if(document.querySelector('#scope').dataset.paints!==before)throw new Error('Frozen scope kept repainting');button.click();
  })()`);
  micWindow.close();await waitFor(()=>!scopeWindows.get(loop.viewID)?.has('mic'),3000);
  await waitFor(()=>!signalCaptures.diagnostics().sources.some(s=>s.rate==='audio'&&s.channels===1),5000);
  await window.webContents.executeJavaScript(`document.querySelector('#micScope').click()`);
  await waitFor(()=>scopeWindows.get(loop.viewID)?.size===3,5000);
  await capture('mic');
  let refused=false;try{await window.webContents.executeJavaScript(`window.awbHost.request('scope.open',{kind:'invalid'})`);}catch{refused=true;}
  if(!refused)throw new Error('Scope accepted arbitrary viewer kind');
  const oldScopes=[...scopeWindows.get(loop.viewID).values()];
  if(registry.list().some(view=>view.toolID!=='shared-loop'))throw new Error('Looper smoke launched an unrelated tool');
  const url = window.webContents.getURL();
  await closeToolView( loop.viewID );
  await waitFor( () => !registry.get( loop.viewID ), 5000 );
  await toolRuntimes.release( loop.viewID );
  if(scopeWindows.has(loop.viewID)||oldScopes.some(scope=>!scope.isDestroyed()))throw new Error('Scope windows survived instrument closure');
  if ( nativeScHost.snapshot().processID !== hostPID ) throw new Error('Closing looper restarted the host');
  await serverProbe.request('/g_queryTree', [900000001,0], '/g_queryTree.reply', a=>a[1]===900000001);
  await serverProbe.request('/status', [], '/status.reply');
  const freedBuffer=await serverProbe.request('/b_query',[beforeClose.session.bufnum],'/b_info',a=>a[0]===beforeClose.session.bufnum);
  if(freedBuffer[1]!==0)throw new Error('Looper Buffer survived view closure');
  await serverProbe.request('/n_query',[beforeClose.session.nodeId],'/fail',a=>a[0]==='/n_query');
  const nativeReader=require(path.resolve(appRoot,'../../tool-artifacts/shared-loop/0.1.0/build/loopview.node'));
  try {const handle=nativeReader.attach(beforeClose.session.sharedId);nativeReader.detach(handle);throw new Error('Looper region survived view closure');}
  catch(error){if(error.message!=='Shared region unavailable')throw error;}
  const surviving=signalCaptures.diagnostics().sources;
  if(surviving.length!==1||surviving[0].generation!==sharedPeer.generation||surviving[0].subscribers!==1)throw new Error('Closing looper detached peer or leaked private scopes');
  const heldFrames=rawPeerFrames;await waitFor(()=>rawPeerFrames>heldFrames+3,3000);
  sharedPeerSocket.terminate();await scBusAudio.releaseView('scope-lissajous-peer');
  if(signalCaptures.diagnostics().sources.length||signalCaptures.diagnostics().polling)throw new Error('Last scope subscriber left acquisition running');
  console.log('AWB_SIGNAL_ENGINE_READY shared-capture=true raw-pcm-isolated=true demand=true peer-survives=true last-release=true');
  serverProbe.send('/n_free',900000001,900000011,900000012); await serverProbe.sync(); serverProbe.close();
  console.log('AWB_SHARED_SCOPES_READY sources=hardware-input-1,hardware-output-1-2,control-bus windows=3 isolated-close=true zoom=1/16-8 pan=true transport=binary-v5 unrelated-tools=0');
  if ( services.snapshot().length !== serviceCount ) throw new Error( 'Looper changed shared host services.' );
  try { await fetch( new URL( '/api/state', url ) ); throw new Error( 'Looper backend survived view closure.' ); }
  catch ( error ) { if ( error.message === 'Looper backend survived view closure.' ) throw error; }
  console.log( `AWB_SHARED_LOOP_READY controls=record,overdub,stop waveform=shared-memory shared-host=true host-survives=true sampleRate=${ beforeClose.snapshot.sampleRate } hostServices=${ serviceCount }` );
  const reopened=await launchFromHome({toolID:'shared-loop',profileID:'hosted',launchOrigin:'desktop'});
  if(reopened.status!=='accepted')throw new Error(reopened.error);
  await waitFor(()=>registry.get(reopened.viewID)?.lifecycle==='ready',10000);
  const reopening=await windows.get(reopened.viewID).webContents.executeJavaScript(`fetch('/api/state').then(r=>r.json())`);
  console.log(`AWB_SHARED_LOOP_QUIT_ACTIVE sharedId=${reopening.session.sharedId} serverPort=${reopening.session.port}`);
  app.quit();
}

async function runMultiviewSmoke() {
  smokeRunning = true;
  const scorePath = option( process.argv, 'smoke-score' );
  const payload = scorePath ? { scorePath: path.resolve( scorePath ) } : {};
  const results = await homeWindow.webContents.executeJavaScript( `(async () => {
    const payload = ${ JSON.stringify( payload ) };
    const first = await window.awbHost.request('shell.launch', { toolID: 'score-studio', profileID: 'headless', toolInstanceID: 'smoke-a', launchOrigin: 'desktop', payload });
    const repeated = await window.awbHost.request('shell.launch', { toolID: 'score-studio', profileID: 'headless', toolInstanceID: 'smoke-a', launchOrigin: 'desktop', payload });
    const second = await window.awbHost.request('shell.launch', { toolID: 'score-studio', profileID: 'headless', toolInstanceID: 'smoke-b', launchOrigin: 'desktop', payload });
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
  const score = await router.launch( { toolID: 'score-studio', profileID: 'hosted',
    toolInstanceID: 'multitool-score', launchOrigin: 'desktop' } );
  const lissajous = await router.launch( { toolID: 'lissajous', profileID: 'standalone',
    toolInstanceID: 'multitool-lissajous', launchOrigin: 'desktop' } );
  const field = await router.launch( { toolID: 'field-modelling', profileID: 'standalone',
    toolInstanceID: 'multitool-field', launchOrigin: 'desktop' } );
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
  const first = await router.launch( { toolID: 'score-studio', profileID: 'hosted', toolInstanceID: 'owner-a',
    launchOrigin: 'supercollider', owner: { kind: 'attached-process', pid: ownerA }, payload: { scorePath } } );
  const second = await router.launch( { toolID: 'score-studio', profileID: 'hosted', toolInstanceID: 'owner-b',
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
  console.log( `AWB_SHELL_HOSTED_INSTALLED instance=${ view.toolInstanceID } score=${ loadedName } recent=recorded` );
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
    toolInstanceID: 'field-live-smoke', launchOrigin: 'desktop' } );
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
  const launched = await launchFromHome( { toolID: 'score-studio', profileID: 'hosted', launchOrigin: 'desktop',
    payload: scorePath ? { scorePath: path.resolve( scorePath ) } : {} } );
  if ( launched.status !== 'accepted' ) throw new Error( `Native Score Studio launch failed: ${ JSON.stringify( launched ) }` );
  await waitFor( () => {
    const view = registry.get( launched.viewID );
    return view?.lifecycle === 'ready' && view.sessionState?.mode === 'hosted'
      && view.sessionState?.connection === 'connected'
      && ( !scorePath || view.sessionState?.scoreID === 'sonic-attunement-01' );
  }, 25000 );
  if ( !nativeToolInstances.has( launched.viewID ) ) throw new Error( 'Native Score Studio view has no owned sclang ToolInstance.' );
  const executionModes = await windows.get( launched.viewID ).webContents.executeJavaScript(
    `[ ...document.querySelectorAll('.modeSwitch button') ].map((button) => button.textContent.trim())`
  );
  if ( executionModes.length !== 0 ) {
    throw new Error( `Desktop Score Studio exposed per-tool execution modes: ${ JSON.stringify( executionModes ) }` );
  }
  if ( scorePath ) {
    await windows.get( launched.viewID ).webContents.executeJavaScript( `new Promise((resolve, reject) => {
      const started = Date.now();
      const check = () => {
        const play = [ ...document.querySelectorAll('section.transportStrip button') ]
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
        const realized = document.querySelector('.realizations .runtimeRealizationGroup');
        if (realized) resolve(realized.innerText);
        else if (Date.now() - started > 5000) reject(new Error(
          'Hosted score played but reported no runtime realization: ' + document.body.innerText.slice(0, 1200)));
        else setTimeout(check, 25);
      }; check();
    })` );
  }
  const field = scorePath ? await openFieldForScore( launched.viewID )
    : await launchFromHome( { toolID: 'field-modelling', profileID: 'hosted', launchOrigin: 'desktop' } );
  if ( field.status !== 'accepted' ) throw new Error( `Native Field launch failed: ${ JSON.stringify( field ) }` );
  await waitFor( () => registry.get( field.viewID )?.lifecycle === 'ready'
    && ( !scorePath || registry.get( field.viewID )?.sessionState?.mode === 'attached' ), 25000 );
  if ( !nativeToolInstances.has( field.viewID ) ) throw new Error( 'Native Field view has no owned sclang ToolInstance.' );
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
  await waitFor( () => !registry.get( field.viewID ) && !nativeToolInstances.has( field.viewID ), 5000 );
  await closeToolView( launched.viewID );
  await waitFor( () => !registry.get( launched.viewID ) && !nativeToolInstances.has( launched.viewID ), 5000 );
  await setNodeManager( 'manual' );
  await waitFor( () => services.firstService( ( service ) => service.hostSnapshot?.().nodeManager?.status === 'disabled' ), 5000 );
  await stopHeadlessHost();
  await waitFor( () => nativeScHost.snapshot().state === 'stopped', 8000 );
  console.log( `AWB_SHELL_HEADLESS_SC_READY engine=native audioProbe=sent scoreStudio=hosted${ scorePath ? ' scorePlayback=realized fieldScore=observed fieldAuthored=running' : '' } fieldModelling=hosted toolInstance=owned nodeManager=toggleable shutdown=owned` );
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
    tool: { id: 'awb-toolkit-home', version: app.getVersion() }, toolInstanceID: null,
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
    tool: { id: tool.id, version: tool.version }, toolInstanceID: request.toolInstanceID,
    launchOrigin: request.launchOrigin, owner: request.owner,
    grantedCapabilities: grantedCapabilities( tool.capabilities, SUPPORTED_CAPABILITIES ),
    connections: request.connections, payload: request.payload } );
}

async function createToolWindow( args ) {
  try { return await createToolWindowOwned( args ); }
  catch ( error ) {
    windows.get( args.viewID )?.close();
    await toolRuntimes.release( args.viewID ).catch( ( cleanup ) => console.error( cleanup ) );
    throw error;
  }
}

async function createToolWindowOwned( { viewID, request, tool } ) {
  registry.update( viewID, { lifecycle: 'loading' } );
  let effectiveRequest = request;
  const runtimeURL = await toolRuntimes.start( viewID, tool );
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
  bindNavigationGuards( window, ( url ) => runtimeURL
    ? new URL( url ).origin === new URL( runtimeURL ).origin
    : developmentURL ? url.startsWith( developmentURL ) : url.startsWith( 'file:' ) );
  window.once( 'ready-to-show', () => window.show() );
  window.webContents.on( 'render-process-gone', ( event, details ) => {
    if ( registry.get( viewID ) ) registry.update( viewID, { lifecycle: 'failed', lastError: `renderer-${ details.reason }` } );
  } );
  window.on( 'closed', () => finalizeView( viewID, window, senderID ) );
  if ( request.owner.kind === 'attached-process' && request.owner.pid ) monitorOwner( viewID, request.owner.pid );
  if ( runtimeURL ) await window.loadURL( runtimeURL );
  else if ( developmentURL ) await window.loadURL( developmentURL );
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

async function openScopeWindow( viewID, kind ) {
  if ( ![ 'mic', 'output', 'control' ].includes( kind ) || registry.get( viewID )?.toolID !== 'shared-loop' ) {
    throw new Error( 'Only Shared Loop may open its mic, output or control scope.' );
  }
  const owner = windows.get( viewID );
  if ( !owner || owner.isDestroyed() ) throw new Error( 'Scope owner is unavailable.' );
  let owned = scopeWindows.get( viewID );
  if ( !owned ) { owned = new Map(); scopeWindows.set( viewID, owned ); }
  const existing = owned.get( kind );
  if ( existing && !existing.isDestroyed() ) { existing.show(); existing.focus(); return { status: 'focused' }; }
  const url = new URL( '/scope', owner.webContents.getURL() ); url.searchParams.set( 'kind', kind );
  if ( url.protocol !== 'http:' || url.hostname !== '127.0.0.1' ) throw new Error( 'Scope requires the local tool runtime.' );
  const bounds = owner.getBounds();
  const scope = new BrowserWindow( { width: 720, height: kind === 'control' ? 640 : 520, minWidth: 480, minHeight: kind === 'control' ? 600 : 480,
    x: bounds.x + ( kind === 'mic' ? 20 : 110 ), y: bounds.y + ( kind === 'mic' ? 80 : 160 ),
    parent: owner, show: false, title: kind === 'mic' ? 'Mic / input 1' : kind === 'output' ? 'Audio out / 1–2' : 'Control / LFO + Noise',
    webPreferences: { contextIsolation: true, nodeIntegration: false, sandbox: true } } );
  owned.set( kind, scope );
  bindNavigationGuards( scope, ( target ) => {
    const parsed = new URL( target ); return parsed.origin === url.origin && parsed.pathname === '/scope';
  } );
  scope.once( 'ready-to-show', () => scope.show() );
  scope.on( 'closed', () => { owned.delete( kind ); if ( !owned.size ) scopeWindows.delete( viewID ); } );
  try { await scope.loadURL( url.href ); return { status: 'opened' }; }
  catch ( error ) { scope.close(); throw error; }
}

function finalizeView( viewID, window, senderID ) {
  for ( const scope of scopeWindows.get( viewID )?.values() ?? [] ) if ( !scope.isDestroyed() ) scope.close();
  scopeWindows.delete( viewID );
  senderRecords.delete( senderID ); windows.delete( viewID );
  clearInterval( ownerTimers.get( viewID ) ); ownerTimers.delete( viewID );
  fileGrants.releaseView( viewID );
  nativeAudio.releaseView( viewID ).catch( ( error ) => console.error( error ) );
  scBusAudio.releaseView( viewID ).catch( ( error ) => console.error( error ) );
  const runtimeStop=toolRuntimes.release(viewID);
  const nativeInstance = nativeToolInstances.get( viewID ); nativeToolInstances.delete( viewID );
  // Stop observation and local servers before retiring this window's DSP owner.
  runtimeStop.catch(error=>console.error(error)).then(()=>nativeInstance &&
    (nativeInstance.close ? nativeInstance.close() : nativeInstance.service.closeToolInstance(nativeInstance.toolID,nativeInstance.instanceID)))
    .catch(error=>console.error(error));
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
  const window = windows.get( viewID );
  const view = registry.get( viewID );
  if ( !window || window.isDestroyed() ) {
    if ( view?.lifecycle !== 'failed' ) return false;
    await toolRuntimes.release( viewID ); registry.remove( viewID ); notifyHome(); return true;
  }
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
  if ( operation === 'scope.open' ) return openScopeWindow( view.viewID, payload.kind );
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
    const nativeInstance = nativeToolInstances.get( view.viewID );
    if ( !nativeInstance || nativeInstance.toolID !== 'score-studio' ) {
      throw new Error( 'Score SynthDefs require a shell-owned native Score Studio session.' );
    }
    const score = fileGrants.resolve( view.viewID, payload.handle, 'file' );
    if ( !score.name.endsWith( '.score.json' ) ) throw new Error( 'Score SynthDefs require a canonical .score.json file.' );
    const sourcePath = path.join( path.dirname( score.path ), 'synths.scd' );
    const source = await stat( sourcePath ).catch( () => null );
    if ( !source?.isFile() ) {
      return { status: 'notProvided', sourceName: null };
    }
    let result = await nativeInstance.service.loadScoreSynthDefs( nativeInstance.instanceID, sourcePath );
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
      result = await nativeInstance.service.loadScoreSynthDefs( nativeInstance.instanceID, sourcePath, true );
    }
    return { ...result, sourcePath: undefined, previousSourcePath: undefined };
  }
  if ( operation === 'sc-bus-audio.start' ) {
    requireCapability(tool,'media','sc-bus-audio');
    return scBusAudio.start(view.viewID,payload);
  }
  if ( operation === 'sc-bus-audio.stop' ) {
    requireCapability(tool,'media','sc-bus-audio');
    return scBusAudio.stop(view.viewID);
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
      if ( smokeQtStation && !smokeRunning ) {
        smokeRunning = true;
        ( async () => {
          await waitFor( () => services.firstService( candidate => candidate.hostSnapshot?.().control?.qtStation ), 10000 );
          const result = await homeWindow.webContents.executeJavaScript( `(async () => {
            const button = document.querySelector('[data-host-action="qt-station"]');
            if (!button) throw new Error('Qt station launcher missing');
            button.click();
            const first = await window.awbHost.request('shell.open-qt-station');
            const second = await window.awbHost.request('shell.open-qt-station');
            return {first, second};
          })()` );
          if ( result.first.status !== 'focused' || result.second.status !== 'focused' ) throw new Error( 'Qt station focus/reuse failed.' );
          console.log( 'AWB_QT_STATION_ELECTRON_RESULT=PASS launcher=present host=connected repeated=focused' );
          app.quit();
        } )().catch( reportFatal );
      }
      else if ( smokeHome ) runHomeSmoke().catch( reportFatal );
      else if ( smokeScopeTool && !smokeRunning ) { smokeRunning=true;
        import('../test/scope-tool/smoke.mjs').then(({runScopeToolSmoke})=>runScopeToolSmoke({
          startHeadlessHost,services,nativeScHost,launchFromHome,closeToolView,windows,registry,signalCaptures,scBusAudio,homeWindow,
          definition:option(process.argv,'smoke-scope-def'),screenshot:option(process.argv,'smoke-screenshot')
        })).then(()=>app.quit()).catch(reportFatal);
      }
      else if(smokeScBus&&!smokeRunning) runScBusSmoke().catch(async error=>{console.error(nativeScHost.snapshot().logTail.join('\n'));await scBusAudio.close().catch(console.error);await nativeScHost.stop(()=>services.firstService()?.shutdownHost?.());reportFatal(error)});
      else if ( smokeSharedLoop && !smokeRunning ) runSharedLoopSmoke().catch( async ( error ) => { console.error( nativeScHost.snapshot().logTail.join( '\n' ), registry.list() ); await toolRuntimes.closeAll().catch( console.error ); await nativeScHost.stop( () => services.firstService()?.shutdownHost?.() ); reportFatal( error ); } );
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
    if ( safe.toolInstanceID && safe.toolInstanceID !== view.toolInstanceID ) throw new Error( 'Renderer ToolInstance mismatch.' );
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
      if ( request.operation === 'shell.open-qt-station' ) {
        const service = services.firstService( ( candidate ) => candidate.hostSnapshot?.().control?.status === 'ready' );
        if ( !service ) throw new Error( 'No AWB-enabled SuperCollider host is connected. Open SuperCollider or start the language host first.' );
        return service.openQtToolStation();
      }
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
    toolRuntimes = new ToolRuntimeRegistry( {
      runtimeRoot: path.join( app.getPath( 'userData' ), 'tool-runtimes' ),
      runtimeContext: async ( { tool } ) => {
        if(tool.id==='live-set'&&liveSetSession)return {...liveSetSession.context,controlObservations};
        if ( [ 'param', 'live-set' ].includes( tool.id ) ) return {controlObservations};
        if ( tool.id === 'scope' ) return { signalCaptures, getNativeHost: async () => {
          const native = await nativeHostForProfile( 'hosted' );
          if ( native.service.hostSnapshot().scsynth.status !== 'ready' ) throw new Error( 'Boot the shell SC host or prepared IDE server before listening.' );
          return { ...native.configuration, service: native.service, token: shellHostToken,
            isConnected: () => native.service.hostSnapshot().scsynth.status === 'ready' };
        } };
        if ( tool.id !== 'shared-loop' ) return {};
        const native = await nativeHostForProfile( 'hosted' );
        await waitFor( () => native.service.hostSnapshot().scsynth.status === 'ready', 30000 );
        return { signalCaptures, nativeHost: { ...native.configuration, service:native.service, token: shellHostToken,
          isConnected: () => native.service.hostSnapshot().scsynth.status === 'ready' } };
      }
    } );
    recentStore = new RecentStore( { filePath: path.join( app.getPath( 'userData' ), 'recent-documents.json' ) } );
    await recentStore.load(); registerIPC(); registerRendererPolicies();
    router = new LaunchRouter( { tools, registry, createView: createToolWindow, focusView: focusToolView } );
    registry.subscribe( notifyHome );
    await ensureHost( hostConfigurationFromRequest( initialRequest )
      ?? hostConfigurationFromArgs( process.argv.slice( 1 ) ) );
    await createRenderExecutorWindow();
    if ( initialRequest?.toolID === 'live-set' ) {
      const result = await launchFromHome( initialRequest );
      await focusToolView( result.viewID );
    } else {
      await createHomeWindow();
      if ( initialRequest ) await launchFromHome( initialRequest );
    }
  } ).catch( reportFatal );
  app.on( 'activate', () => {
    if ( quitting ) return;
    const live = registry.list().find( view => view.toolID === 'live-set' && windows.has( view.viewID ) );
    if ( live ) focusToolView( live.viewID ).catch( reportFatal );
    else createHomeWindow().catch( reportFatal );
  } );
  app.on( 'window-all-closed', () => { if ( !quitting ) createHomeWindow().catch( reportFatal ); } );
  app.on( 'before-quit', ( event ) => {
    quitting = true;
    if ( servicesClosed ) return;
    event.preventDefault();
    if ( !serviceShutdown ) serviceShutdown = ( async () => {
      for ( const unsubscribe of hostSubscriptions.values() ) unsubscribe();
      hostSubscriptions.clear();
      const runtimeStops = await Promise.allSettled( [ toolRuntimes?.closeAll(), scBusAudio.close() ] );
      const nativeInstanceStops = await Promise.allSettled( [ ...nativeToolInstances.values() ].map(
        owned => owned.close ? owned.close() : owned.service.closeToolInstance(owned.toolID,owned.instanceID)
      ) );
      nativeToolInstances.clear();
      await signalCaptures.close();
      controlObservations.close();
      const headlessService = services.firstService( ( service ) => service.hostSnapshot?.().control?.mode === 'headless' );
      const hostStop = await Promise.allSettled( [ nativeAudio.close(),
        nativeScHost.stop( () => headlessService?.shutdownHost?.() ) ] );
      const results = [ ...nativeInstanceStops, ...runtimeStops, ...hostStop, ...await Promise.allSettled( [ services.closeAll() ] ) ];
      results.filter( ( result ) => result.status === 'rejected' )
        .forEach( ( result ) => console.error( result.reason ) );
      servicesClosed = true; app.quit();
    } )().catch( reportFatal );
  } );
}

export { launchRequestFromArgs };
