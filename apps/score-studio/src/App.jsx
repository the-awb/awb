import { useEffect, useMemo, useReducer, useRef, useState, useSyncExternalStore } from 'react';
import { useSuperCollider } from '@awb/sc-wasm/react';
import { useScLang } from '@awb/sc-console/hook';
import { createPlaybackReadiness } from '@awb/sc-runtime';
import { hashScoreDocument, reviseScoreDocument, sortScore } from '@awb/score';
import ConsoleWorkspace from './components/ConsoleWorkspace.jsx';
import EventPayloadEditor from './components/EventPayloadEditor.jsx';
import InstrumentInventory from './components/InstrumentInventory.jsx';
import InstrumentPanel from './components/InstrumentPanel.jsx';
import InstrumentWorkspace from './components/InstrumentWorkspace.jsx';
import PanelLayout from './components/PanelLayout.jsx';
import ScoreFocusPanel from './components/ScoreFocusPanel.jsx';
import ScoreDocumentRuntimePanel from './components/ScoreDocumentRuntimePanel.jsx';
import ScoreRuntimeRail from './components/ScoreRuntimeRail.jsx';
import ScoreStudioLeftRail from './components/ScoreStudioLeftRail.jsx';
import ScoreTimeline from './components/ScoreTimeline.jsx';
import SynthDefDraftEditor from './components/SynthDefDraftEditor.jsx';
import { createAuditionController, createStandaloneAuditionAdapter } from './engine/AuditionController.js';
import { lifecycleDefinitionsForEntry } from './engine/synthLifecycleLanes.js';
import { importSclang, importScsynth, locateSclangFile } from './engine/scAssets.js';
import { formatScSymbol } from './engine/scValueSyntax.js';
import { createStandaloneScoreExecutor } from './engine/StandaloneScoreExecutor.js';
import { isHostedSynthDefFocusStale } from './engine/instrumentInventory.js';
import { loadStandaloneSynthDef, loadStandaloneSynthDefs } from './engine/standaloneSynthDefs.js';
import { generateLocalScProjection, SC_PROJECTION_KINDS } from './engine/localScProjection.js';
import { readLocalProjection, storeLocalProjection } from './engine/localProjectionStore.js';
import { scoreInstruments } from './engine/scoreInstruments.js';
import { retryScoreProjection, saveScorePair, validateProjection } from './engine/scorePairSave.js';
import { createSessionState, MODES, scoreSessionReducer, seedDocument } from './state/scoreSession.js';

const freshID = () => `score-${ globalThis.crypto.randomUUID() }`;
const freshDraftID = () => `draft-${ globalThis.crypto.randomUUID() }`;

export default function App( { host, createHostedClient } ) {
  const launchContext = useMemo( () => host.hostedLaunchContext(), [ host ] );
  const executionModes = host.capabilities.executionModes ?? Object.values( MODES );
  const documentIngress = host.capabilities.documentIngress
    ?? { new: true, open: true, demo: true, browse: true };
  const { endpoint: launchedEndpoint, toolSessionID, viewID = '', toolID = 'score-studio' } = launchContext;
  const [ session, dispatch ] = useReducer( scoreSessionReducer, undefined, () => createSessionState() );
  const [ file, setFile ] = useState( {
    handle: null, name: null, hash: null, savedRevision: null,
    projectionHandle: null, projectionText: null, pendingIdentity: null,
    projectionStatus: 'not generated', message: ''
  } );
  const [ endpoint, setEndpoint ] = useState( launchedEndpoint );
  const [ hostedMessage, setHostedMessage ] = useState( '' );
  const [ standaloneMessage, setStandaloneMessage ] = useState( '' );
  const [ standaloneDefinitions, setStandaloneDefinitions ] = useState( {
    scoreID: null, revision: null, state: 'unknown', missing: [], detail: ''
  } );
  const [ projectionKind, setProjectionKind ] = useState( SC_PROJECTION_KINDS.DESKTOP_SCORE );
  const [ localProjection, setLocalProjection ] = useState( null );
  const [ scoreFolder, setScoreFolder ] = useState( { handle: null, name: '', files: [], message: '' } );
  const [ focus, setFocus ] = useState( { kind: 'none', draftID: freshDraftID() } );
  const inputRef = useRef( null );
  const stopArmedRef = useRef( false );
  const sc = useSuperCollider( { importScsynth } );
  const sclang = useScLang( sc, { importSclang, locateFile: locateSclangFile, exposeDevGlobals: import.meta.env.DEV } );
  const hostedClient = useMemo( () => createHostedClient( {
    clientID: toolSessionID ? `score-tool-${ toolSessionID }` : undefined,
    toolSessionID, viewID, requestingToolID: toolID
  } ), [ createHostedClient, toolID, toolSessionID, viewID ] );
  const hosted = useSyncExternalStore( hostedClient.subscribe, hostedClient.getState, hostedClient.getState );
  const referencedSynthDefs = useMemo(
    () => scoreInstruments( session.document ).map( ( instrument ) => instrument.definition ),
    [ session.document ]
  );
  const standaloneExecutorRef = useRef( null );
  if ( standaloneExecutorRef.current === null ) {
    standaloneExecutorRef.current = createStandaloneScoreExecutor( {
      sendOsc: sc.sendOsc,
      subscribeOscReply: sc.subscribeOscReply,
      parseOsc: ( bytes ) => sc.getEngine()?.parseOscMessage( bytes )
    } );
  }
  const standaloneExecutor = standaloneExecutorRef.current;
  const auditionControllerRef = useRef( null );
  if ( auditionControllerRef.current === null ) {
    auditionControllerRef.current = createAuditionController( {
      hostedClient,
      standaloneAdapter: createStandaloneAuditionAdapter( {
        sendOsc: sc.sendOsc,
        subscribeOscReply: sc.subscribeOscReply,
        parseOsc: ( bytes ) => sc.getEngine()?.parseOscMessage( bytes )
      } )
    } );
  }
  const auditionController = auditionControllerRef.current;
  const audition = useSyncExternalStore(
    auditionController.subscribe, auditionController.getState, auditionController.getState
  );
  const launchState = useRef( { scoreLoaded: false, installed: '' } );
  const standalone = useSyncExternalStore(
    standaloneExecutor.subscribe, standaloneExecutor.getState, standaloneExecutor.getState
  );
  const dirty = session.previewEntries !== null || file.savedRevision !== session.document.revision;
  const inspectedEntries = session.previewEntries ?? session.document.entries;
  const selectedEntry = useMemo(
    () => inspectedEntries.find( ( entry ) => entry.id === session.selected[ 0 ] ) ?? null,
    [ inspectedEntries, session.selected ]
  );
  const focusIsStale = isHostedSynthDefFocusStale(
    focus, session.mode, hosted.synthDefContext.generation
  );
  const displayedFocus = focusIsStale ? { ...focus, stale: true } : focus;

  useEffect( () => {
    if ( !selectedEntry ) {
      setFocus( ( current ) => current.kind === 'scoreEvent'
        ? { kind: 'none', draftID: freshDraftID() } : current );
      return;
    }
    setFocus( ( current ) => {
      const sameSource = current.kind === 'scoreEvent'
        && current.scoreID === session.document.scoreID
        && current.documentRevision === session.document.revision
        && current.entryID === selectedEntry.id;
      return sameSource ? { ...current, entry: selectedEntry } : {
        kind: 'scoreEvent', scoreID: session.document.scoreID,
        documentRevision: session.document.revision, entryID: selectedEntry.id,
        draftID: freshDraftID(), entry: selectedEntry
      };
    } );
  }, [ selectedEntry, session.document.revision, session.document.scoreID ] );

  useEffect( () => {
    setFocus( { kind: 'none', draftID: freshDraftID() } );
  }, [ session.documentEpoch ] );

  useEffect( () => {
    if ( !executionModes.includes( session.mode ) ) {
      dispatch( { type: 'SET_MODE', mode: executionModes[ 0 ] } );
    }
  }, [ executionModes, session.mode ] );

  useEffect( () => {
    try { host.storeRecovery( session.document ); } catch { /* host recovery is optional */ }
  }, [ host, session.document ] );

  useEffect( () => {
    if ( localProjection
      && ( localProjection.scoreID !== session.document.scoreID
        || localProjection.revision !== session.document.revision ) ) setLocalProjection( null );
  }, [ localProjection, session.document.revision, session.document.scoreID ] );

  useEffect( () => {
    if ( launchState.current.scoreLoaded ) return;
    launchState.current.scoreLoaded = true;
    host.initialScore()
      .then( ( result ) => result && acceptOpen( result ) )
      .catch( ( error ) => setFile( ( current ) => ( { ...current, message: error.message } ) ) );
  }, [ host ] );

  useEffect( () => {
    if ( !toolSessionID || !endpoint || hosted.status !== 'disconnected' ) return undefined;
    let cancelled = false;
    const timer = setTimeout( () => {
      if ( cancelled ) return;
      hostedClient.connect( endpoint )
        .then( () => setHostedMessage( 'Connected to desktop sclang.' ) )
        .catch( ( error ) => setHostedMessage( error.message ) );
    }, 0 );
    return () => {
      cancelled = true;
      clearTimeout( timer );
    };
  }, [ endpoint, hosted.status, hostedClient ] );

  useEffect( () => {
    if ( !toolSessionID || !file.name || hosted.status !== 'connected' ) return;
    const identity = `${ session.document.scoreID }:${ session.document.revision }`;
    if ( launchState.current.installed === identity ) return;
    if ( hosted.scoreID === session.document.scoreID
      && hosted.remoteRevision === session.document.revision ) {
      launchState.current.installed = identity;
      return;
    }
    launchState.current.installed = identity;
    hostedClient.installDocument( session.document )
      .then( () => setHostedMessage( `Revision ${ session.document.revision } installed atomically.` ) )
      .catch( ( error ) => {
        launchState.current.installed = '';
        setHostedMessage( error.message );
      } );
  }, [ file.name, hosted.remoteRevision, hosted.scoreID, hosted.status,
    hostedClient, session.document ] );

  useEffect( () => {
    if ( hosted.status !== 'connected' || hosted.synthDefContext.status !== 'connected' ) return;
    hostedClient.loadSynthDefContext( referencedSynthDefs ).catch( () => {} );
  }, [ hosted.status, hosted.synthDefContext.status, hostedClient, referencedSynthDefs,
    session.document.revision, session.document.scoreID ] );

  useEffect( () => {
    if ( !import.meta.env.DEV ) return undefined;
    window.__scoreSc = sc;
    window.__standaloneScore = standaloneExecutor;
    return () => {
      if ( window.__scoreSc === sc ) delete window.__scoreSc;
      if ( window.__standaloneScore === standaloneExecutor ) delete window.__standaloneScore;
    };
  }, [ sc, standaloneExecutor ] );

  useEffect( () => () => {
    hostedClient.disconnect();
    // Do not permanently dispose here: React development StrictMode replays effect cleanup while
    // preserving this component's refs. Stop owned nodes, but keep the executor reusable.
    standaloneExecutor.stop();
  }, [ hostedClient, standaloneExecutor ] );

  useEffect( () => {
    host.reportSessionState( Object.freeze( {
      scoreID: session.document.scoreID,
      revision: session.document.revision,
      dirty,
      mode: session.mode,
      connection: hosted.status,
      scsynthStatus: hosted.readiness.engine === 'ready' ? 'ready'
        : hosted.status === 'connecting' ? 'booting' : 'unavailable',
      transport: hosted.transport?.state ?? null,
      runID: hosted.transport?.runID || null
    } ) );
  }, [ dirty, host, hosted.readiness.engine, hosted.status, hosted.transport?.state, session.document.revision,
    session.document.scoreID, session.mode ] );

  useEffect( () => {
    if ( session.mode === MODES.STANDALONE ) return;
    if ( standalone.status === 'playing' || standalone.status === 'paused' ) standaloneExecutor.stop();
    if ( sc.isBooted ) sc.shutdown();
  }, [ session.mode, standalone.status, standaloneExecutor, sc.isBooted ] );

  useEffect( () => {
    const currentRevision = standalone.scoreID === session.document.scoreID
      && standalone.revision === session.document.revision;
    if ( currentRevision || ( standalone.status !== 'playing' && standalone.status !== 'paused' ) ) return;
    standaloneExecutor.stop();
    setStandaloneMessage( 'Playback stopped because the authored score revision changed.' );
  }, [ session.document.revision, session.document.scoreID, standalone.revision, standalone.scoreID,
    standalone.status, standaloneExecutor ] );

  useEffect( () => {
    if ( session.mode !== MODES.HOSTED || !hosted.transport ) return undefined;
    dispatch( { type: 'SET_PLAYHEAD', time: hostedClient.estimateScorePosition() } );
    if ( hosted.transport.state !== 'playing' ) return undefined;
    const timer = setInterval( () => {
      dispatch( { type: 'SET_PLAYHEAD', time: hostedClient.estimateScorePosition() } );
    }, 50 );
    return () => clearInterval( timer );
  }, [ hosted.transport, hosted.clockOffset, hostedClient, session.mode ] );

  useEffect( () => {
    if ( session.mode !== MODES.STANDALONE || standalone.status !== 'playing' ) return undefined;
    dispatch( { type: 'SET_PLAYHEAD', time: standaloneExecutor.estimatePosition() } );
    const timer = setInterval( () => {
      dispatch( { type: 'SET_PLAYHEAD', time: standaloneExecutor.estimatePosition() } );
    }, 50 );
    return () => clearInterval( timer );
  }, [ session.mode, standalone.status, standaloneExecutor ] );

  async function hostedAction( action, success ) {
    setHostedMessage( '' );
    try {
      await action();
      if ( success ) setHostedMessage( success );
    } catch ( error ) {
      setHostedMessage( error.message );
    }
  }

  const connected = hosted.status === 'connected';
  const loadedRevision = connected
    && hosted.scoreID === session.document.scoreID
    && hosted.remoteRevision === session.document.revision;
  const hostedCanPlay = loadedRevision && hosted.readiness.canPlay;
  const standaloneLoaded = standalone.scoreID === session.document.scoreID
    && standalone.revision === session.document.revision;
  const transportPlaying = session.mode === MODES.HOSTED
    ? hosted.transport?.state === 'playing'
    : standalone.status === 'playing';
  const transportLoaded = session.mode === MODES.HOSTED ? loadedRevision : standaloneLoaded;
  const definitionsCurrent = standaloneDefinitions.scoreID === session.document.scoreID
    && standaloneDefinitions.revision === session.document.revision;
  const standaloneReadiness = createPlaybackReadiness( {
    hostKind: 'standalone',
    engine: sc.status === 'ready' ? 'ready'
      : ( sc.status === 'loading' || sc.status === 'booting' ) ? 'booting'
        : sc.status === 'failed' ? 'failed' : 'offline',
    audio: sc.audioContextState === 'running' ? 'running'
      : sc.audioContextState === 'suspended' || sc.audioContextState === 'interrupted'
        ? 'suspended' : 'unknown',
    score: standaloneLoaded ? 'ready' : 'notLoaded',
    definitions: definitionsCurrent ? standaloneDefinitions.state : 'unknown',
    missingDefinitions: definitionsCurrent ? standaloneDefinitions.missing : [],
    detail: definitionsCurrent ? standaloneDefinitions.detail : ( sc.error || '' )
  } );

  async function prepareStandalone( { atPlayhead = false } = {} ) {
    setStandaloneMessage( '' );
    setStandaloneDefinitions( {
      scoreID: session.document.scoreID, revision: session.document.revision,
      state: 'loading', missing: [], detail: ''
    } );
    try {
      if ( sc.isBooted ) await sc.resumeAudio();
      else await sc.boot();
      const definitions = await loadStandaloneSynthDefs( sc, session.document );
      if ( !standaloneLoaded ) standaloneExecutor.load( session.document );
      if ( atPlayhead ) standaloneExecutor.seek( session.cursorTime );
      setStandaloneDefinitions( {
        scoreID: session.document.scoreID, revision: session.document.revision,
        state: 'ready', missing: [], detail: ''
      } );
      setStandaloneMessage( `Revision ${ session.document.revision } ready · ${ definitions.length } SynthDef${ definitions.length === 1 ? '' : 's' }.` );
      return true;
    } catch ( error ) {
      setStandaloneDefinitions( {
        scoreID: session.document.scoreID, revision: session.document.revision,
        state: error.code === 'missingSynthDefs' ? 'missing' : 'failed',
        missing: error.missingDefinitions ?? [], detail: error.message
      } );
      setStandaloneMessage( error.message );
      return false;
    }
  }

  async function playStandalone() {
    stopArmedRef.current = false;
    if ( standalone.status === 'paused' && standaloneLoaded ) {
      if ( sc.audioContextState !== 'running' ) await sc.resumeAudio();
      standaloneExecutor.play();
      return;
    }
    if ( standalone.status === 'ended' ) dispatch( { type: 'SET_PLAYHEAD', time: 0 } );
    if ( await prepareStandalone( { atPlayhead: true } ) ) {
      standaloneExecutor.play();
    }
  }

  async function playHosted() {
    stopArmedRef.current = false;
    if ( hosted.transport?.state === 'paused' ) {
      await hostedClient.command( session.document, 'resume' );
      return;
    }
    await hostedClient.command( session.document, 'seek', session.cursorTime );
    await hostedClient.command( session.document, 'play' );
  }

  async function seekTransport( time ) {
    stopArmedRef.current = false;
    if ( session.mode === MODES.HOSTED ) {
      if ( loadedRevision ) await hostedAction( () => hostedClient.command( session.document, 'seek', time ) );
    } else if ( standaloneLoaded ) standaloneExecutor.seek( time );
  }

  async function toggleTransport() {
    stopArmedRef.current = false;
    if ( session.mode === MODES.HOSTED ) {
      if ( transportPlaying ) await hostedAction( () => hostedClient.command( session.document, 'pause' ) );
      else await hostedAction( playHosted );
    } else if ( transportPlaying ) standaloneExecutor.pause();
    else await playStandalone();
  }

  async function stopTransport() {
    if ( stopArmedRef.current ) {
      dispatch( { type: 'SET_CURSOR', time: 0 } );
      await seekTransport( 0 );
      return;
    }
    if ( session.mode === MODES.HOSTED ) {
      if ( loadedRevision ) await hostedAction( () => hostedClient.command( session.document, 'stop' ) );
    } else if ( standaloneLoaded ) standaloneExecutor.stop();
    stopArmedRef.current = true;
  }

  async function returnToStart() {
    dispatch( { type: 'SET_CURSOR', time: 0 } );
    await seekTransport( 0 );
  }

  async function acceptOpen( result ) {
    let stored = null;
    try { stored = readLocalProjection( result.document, projectionKind ); } catch { /* optional app data */ }
    dispatch( { type: 'LOAD_DOCUMENT', document: result.document } );
    setLocalProjection( stored );
    if ( stored ) dispatch( { type: 'SET_WORKING_DOCUMENT', text: stored.text } );
    setFile( {
      handle: result.handle ?? null,
      name: result.name,
      hash: result.hash,
      savedRevision: result.migrated ? null : result.document.revision,
      projectionHandle: null,
      projectionText: null,
      pendingIdentity: null,
      projectionStatus: 'not loaded',
      message: result.migrated
        ? `Imported ${ result.name } as awb.score/1. Save to persist the canonical document.`
        : `Opened ${ result.name }`
    } );
  }

  function canDiscard() {
    const untouchedWelcomeScore = file.name === null
      && session.document.scoreID === 'untitled-score'
      && session.document.revision === 0;
    return !dirty || untouchedWelcomeScore || host.confirmDiscard( 'Discard the current unsaved revision?' );
  }

  async function openDocument() {
    if ( !canDiscard() ) return;
    try {
      const result = await host.openScore();
      if ( result ) await acceptOpen( result );
      else if ( host.capabilities.fileInputFallback ) inputRef.current?.click();
      else setFile( ( current ) => ( { ...current, message: 'This host cannot open score files.' } ) );
    } catch ( error ) {
      if ( error.name !== 'AbortError' ) setFile( ( current ) => ( { ...current, message: error.message } ) );
    }
  }

  async function onFallbackFile( event ) {
    const picked = event.target.files?.[ 0 ];
    event.target.value = '';
    if ( !picked || !canDiscard() ) return;
    try { await acceptOpen( await host.readFallbackScore( picked ) ); }
    catch ( error ) { setFile( ( current ) => ( { ...current, message: error.message } ) ); }
  }

  async function chooseScoreFolder() {
    try {
      const result = await host.openScoreDirectory();
      if ( !result ) {
        setScoreFolder( ( current ) => ( {
          ...current, message: 'Folder browsing is unavailable in this host; use Open… instead.'
        } ) );
        return;
      }
      setScoreFolder( { ...result, message: result.files.length ? '' : 'No .score.json files in this folder.' } );
    } catch ( error ) {
      if ( error.name !== 'AbortError' ) setScoreFolder( ( current ) => ( { ...current, message: error.message } ) );
    }
  }

  async function refreshScoreFolder() {
    if ( !scoreFolder.handle ) return;
    try {
      const refreshed = await host.refreshScoreDirectory( scoreFolder );
      setScoreFolder( ( current ) => ( {
        ...current, ...refreshed,
        message: refreshed.files.length ? '' : 'No .score.json files in this folder.'
      } ) );
    } catch ( error ) {
      setScoreFolder( ( current ) => ( { ...current, message: error.message } ) );
    }
  }

  async function openFolderScore( item ) {
    if ( !canDiscard() ) return;
    try { await acceptOpen( await host.openDirectoryScore( item ) ); }
    catch ( error ) { setScoreFolder( ( current ) => ( { ...current, message: error.message } ) ); }
  }

  async function openDemoScore() {
    if ( !canDiscard() ) return;
    try {
      const result = await host.loadBundledScore(
        '/examples/sonic-attunement-01.score.json', 'sonic-attunement-01.score.json'
      );
      await acceptOpen( result );
    } catch ( error ) {
      setFile( ( current ) => ( { ...current, message: error.message } ) );
    }
  }

  async function saveDocument( saveAs = false ) {
    const document = session.previewEntries
      ? reviseScoreDocument( session.document, session.previewEntries )
      : session.document;
    if ( session.previewEntries ) dispatch( { type: 'COMMIT_PREVIEW', entries: session.previewEntries } );
    try {
      if ( session.mode === MODES.HOSTED && connected ) {
        const result = await saveScorePair( {
          document,
          saveCanonical: () => host.saveCanonical( document, {
            handle: file.handle, expectedHash: file.hash, saveAs
          } ),
          requestProjection: ( identity ) => requestHostedProjection( identity, document ),
          saveProjection: ( text, identity ) => host.saveProjection( text, {
            scoreID: identity.scoreID,
            handle: file.projectionHandle,
            canonicalHandle: identity.canonicalHandle,
            expectedText: file.projectionText,
            saveAs
          } )
        } );
        setFile( ( current ) => ( {
          ...current,
          handle: result.canonical.handle,
          name: result.canonical.handle?.name ?? `${ session.document.scoreID }.score.json`,
          hash: result.canonical.hash,
          savedRevision: document.revision,
          projectionHandle: result.projectionResult?.handle ?? current.projectionHandle,
          projectionText: result.projection?.text ?? current.projectionText,
          pendingIdentity: result.status === 'partial' ? result.identity : null,
          projectionStatus: result.status === 'complete' ? 'saved' : 'canonical saved; SC export pending',
          message: result.status === 'complete'
            ? 'Canonical JSON and generated SC projection saved.'
            : result.projectionError
        } ) );
        return;
      }
      const result = await host.saveCanonical( document, {
        handle: file.handle, expectedHash: file.hash, saveAs
      } );
      setFile( {
        handle: result.handle,
        name: result.handle?.name ?? `${ session.document.scoreID }.score.json`,
        hash: result.hash,
        savedRevision: document.revision,
        projectionHandle: file.projectionHandle,
        projectionText: file.projectionText,
        pendingIdentity: null,
        projectionStatus: 'pending desktop export',
        message: result.downloaded
          ? 'Canonical JSON downloaded. This browser cannot retain a writable file handle.'
          : 'Canonical JSON saved. SC projection is pending desktop export.'
      } );
    } catch ( error ) {
      if ( error.name !== 'AbortError' ) setFile( ( current ) => ( { ...current, message: error.message } ) );
    }
  }

  async function ensureHostedRevision( document = session.document ) {
    if ( !connected ) throw new Error( 'Connect to the hosted bridge before requesting an SC projection.' );
    if ( hosted.scoreID !== document.scoreID || hosted.remoteRevision !== document.revision ) {
      await hostedClient.installDocument( document );
    }
  }

  async function requestHostedProjection( identity, document = session.document ) {
    await ensureHostedRevision( document );
    const projection = await hostedClient.requestProjection( identity );
    dispatch( { type: 'SET_WORKING_DOCUMENT', text: projection.text } );
    return projection;
  }

  async function generateScDocument() {
    setHostedMessage( '' );
    try {
      if ( projectionKind === SC_PROJECTION_KINDS.BROWSER_PSEQ
        || session.mode !== MODES.HOSTED || !connected ) {
        const text = generateLocalScProjection( session.document, { kind: projectionKind } );
        const stored = storeLocalProjection( session.document, projectionKind, text );
        setLocalProjection( stored );
        dispatch( { type: 'SET_WORKING_DOCUMENT', text } );
        setFile( ( current ) => ( {
          ...current,
          message: projectionKind === SC_PROJECTION_KINDS.BROWSER_PSEQ
            ? 'Browser Pseq reduction stored in app data.'
            : 'Desktop score projection stored in app data.'
        } ) );
        dispatch( { type: 'SET_VIEW', view: 'console' } );
        return;
      }
      const identity = Object.freeze( {
        scoreID: session.document.scoreID,
        revision: session.document.revision,
        contentHash: await hashScoreDocument( session.document ),
        kind: 'timeline'
      } );
      const projection = validateProjection( await requestHostedProjection( identity ), identity );
      setFile( ( current ) => ( {
        ...current,
        projectionStatus: 'generated; not saved',
        message: 'Generated SC working document. Save writes the canonical JSON and SC projection as a guarded pair.'
      } ) );
      setHostedMessage( `Generated ${ projection.scoreID } r${ projection.revision } SC document.` );
      dispatch( { type: 'SET_VIEW', view: 'console' } );
    } catch ( error ) {
      if ( error.name !== 'AbortError' ) {
        if ( session.mode === MODES.HOSTED && connected ) setHostedMessage( error.message );
        else setFile( ( current ) => ( { ...current, message: error.message } ) );
      }
    }
  }

  async function openHostedDocument() {
    setHostedMessage( '' );
    try {
      await ensureHostedRevision();
      await hostedClient.command( session.document, 'openDocument' );
      setHostedMessage( `Opened ${ session.document.scoreID } r${ session.document.revision } in desktop SuperCollider.` );
    } catch ( error ) {
      setHostedMessage( error.message );
    }
  }

  async function retryProjection() {
    if ( !file.pendingIdentity ) return;
    try {
      const result = await retryScoreProjection( {
        document: session.document,
        identity: file.pendingIdentity,
        requestProjection: requestHostedProjection,
        saveProjection: ( text, identity ) => host.saveProjection( text, {
          scoreID: identity.scoreID,
          handle: file.projectionHandle,
          expectedText: file.projectionText
        } )
      } );
      setFile( ( current ) => ( {
        ...current,
        projectionHandle: result.projectionResult.handle,
        projectionText: result.projection.text,
        pendingIdentity: null,
        projectionStatus: 'saved',
        message: 'Generated SC projection saved.'
      } ) );
    } catch ( error ) {
      if ( error.name !== 'AbortError' ) setFile( ( current ) => ( { ...current, message: error.message } ) );
    }
  }

  function newDocument() {
    if ( !canDiscard() ) return;
    dispatch( { type: 'LOAD_DOCUMENT', document: seedDocument( freshID() ) } );
    setLocalProjection( null );
    setFile( {
      handle: null, name: null, hash: null, savedRevision: null,
      projectionHandle: null, projectionText: null, pendingIdentity: null,
      projectionStatus: 'not generated', message: 'New unsaved score'
    } );
  }

  function chooseProjectionKind( kind ) {
    setProjectionKind( kind );
    let stored = null;
    try { stored = readLocalProjection( session.document, kind ); } catch { /* optional app data */ }
    setLocalProjection( stored );
    if ( stored ) dispatch( { type: 'SET_WORKING_DOCUMENT', text: stored.text } );
  }

  function updateSelectedEntry( patch ) {
    if ( !selectedEntry ) return;
    const entries = sortScore( session.document.entries.map( ( entry ) => (
      entry.id === selectedEntry.id ? { ...entry, ...patch } : entry
    ) ) );
    dispatch( { type: 'EDIT_ENTRIES', entries } );
    setFile( ( current ) => ( { ...current, message: '' } ) );
  }

  function previewSelectedEntry( patch ) {
    if ( !selectedEntry ) return;
    const entries = sortScore( session.document.entries.map( ( entry ) => (
      entry.id === selectedEntry.id ? { ...entry, ...patch } : entry
    ) ) );
    dispatch( { type: 'PREVIEW_ENTRIES', entries, preserveEditor: true } );
  }

  function focusSynthDef( {
    name, description, contextGeneration, signalKind, source, initialValues = null, error = ''
  } ) {
    dispatch( { type: 'SET_SELECTED', ids: [] } );
    setFocus( {
      kind: 'synthDef', contextGeneration, synthDefName: name, name,
      fingerprint: description?.fingerprint ?? null,
      draftID: freshDraftID(), description, signalKind, source, initialValues, error
    } );
  }

  async function auditionDraft( draft, focusScope = displayedFocus ) {
    if ( focusScope.signalKind && focusScope.signalKind !== 'audio' ) {
      throw new Error( `A ${ focusScope.signalKind } SynthDef is not an audible audition target.` );
    }
    if ( session.mode === MODES.STANDALONE ) {
      if ( sc.isBooted ) await sc.resumeAudio(); else await sc.boot();
      await loadStandaloneSynthDef( sc, draft.definition );
    }
    return auditionController.play( {
      mode: session.mode, definition: draft.definition, params: draft.params,
      model: draft.model, contextID: `${ focusScope.kind }:${ focusScope.entryID ?? focusScope.name ?? 'draft' }`,
      draftID: focusScope.draftID,
      contextGeneration: focusScope.contextGeneration ?? 0,
      fingerprint: focusScope.description?.fingerprint ?? '',
      description: focusScope.description ?? null,
      signalKind: focusScope.signalKind ?? 'audio'
    } );
  }

  return (
    <div className="appShell">
      <header className="topbar">
        <div className="brand"><span>AWB</span><strong>Score</strong></div>
        { executionModes.length > 1 && <div className="modeSwitch" aria-label="Execution mode">
          { executionModes.map( ( mode ) => (
            <button key={ mode } className={ session.mode === mode ? 'active' : '' }
              onClick={ () => dispatch( { type: 'SET_MODE', mode } ) }>{ mode }</button>
          ) ) }
        </div> }
      </header>
      <PanelLayout
        left={ <ScoreStudioLeftRail
          documentPanel={ <ScoreDocumentRuntimePanel
            session={ session } dirty={ dirty } documentIngress={ documentIngress } file={ file }
            scoreFolder={ scoreFolder } projectionKind={ projectionKind } localProjection={ localProjection }
            hostCapabilities={ host.capabilities } inputRef={ inputRef } endpoint={ endpoint }
            hosted={ hosted } hostedCanPlay={ hostedCanPlay } hostedMessage={ hostedMessage }
            connected={ connected } standalone={ standalone } standaloneReadiness={ standaloneReadiness }
            standaloneMessage={ standaloneMessage } sc={ sc } sclang={ sclang }
            onTitleChange={ ( value ) => dispatch( { type: 'EDIT_META', key: 'title', value } ) }
            onNew={ newDocument } onOpen={ openDocument } onOpenDemo={ openDemoScore }
            onChooseFolder={ chooseScoreFolder } onSave={ saveDocument }
            onProjectionKind={ chooseProjectionKind } onGenerateSc={ generateScDocument }
            onRetryProjection={ retryProjection } onRefreshFolder={ refreshScoreFolder }
            onOpenFolderScore={ openFolderScore } onFallbackFile={ onFallbackFile }
            onEndpointChange={ setEndpoint }
            onHostedConnect={ () => hostedAction( () => hostedClient.connect( endpoint ), 'Connected to desktop sclang.' ) }
            onHostedDisconnect={ () => hostedClient.disconnect() }
            onHostedLoad={ () => hostedAction( () => hostedClient.installDocument( session.document ),
              `Revision ${ session.document.revision } installed atomically.` ) }
            onHostedState={ () => hostedAction( () => hostedClient.command( session.document, 'state' ) ) }
            onOpenHostedDocument={ openHostedDocument }
            onStandaloneAudio={ () => sc.isBooted ? sc.resumeAudio() : sc.boot() }
            onAttachSclang={ sclang.attach } onStandaloneLoad={ prepareStandalone }
            onStandaloneQuit={ () => { standaloneExecutor.stop(); sc.shutdown(); } } /> }
          instrumentPanel={ <InstrumentInventory document={ session.document } mode={ session.mode }
            hostedClient={ hostedClient } hostedContext={ hosted.synthDefContext }
            focusedName={ focus.kind === 'synthDef' ? focus.name : '' }
            focusedSource={ focus.kind === 'synthDef' ? focus.source : '' }
            focusedInitialValues={ focus.kind === 'synthDef' ? focus.initialValues : null }
            focusedContextGeneration={ focus.kind === 'synthDef' ? focus.contextGeneration : null }
            onFocus={ focusSynthDef } /> } /> }
        centre={ <>
          <nav className="viewTabs">
            <button className={ session.view === 'score' ? 'active' : '' }
              onClick={ () => dispatch( { type: 'SET_VIEW', view: 'score' } ) }>Score</button>
            { executionModes.includes( MODES.STANDALONE ) && <button
              className={ session.view === 'instruments' ? 'active' : '' }
              onClick={ () => dispatch( { type: 'SET_VIEW', view: 'instruments' } ) }>Instruments</button> }
            <button className={ session.view === 'console' ? 'active' : '' }
              onClick={ () => dispatch( { type: 'SET_VIEW', view: 'console' } ) }>Console</button>
          </nav>
          { session.view === 'score' ? <div className="scoreWorkspace">
            <section className="transportStrip" aria-label="Score transport">
              <div className="transportControls">
                <button disabled={ session.mode === MODES.HOSTED
                  ? ( transportPlaying ? !loadedRevision : !hostedCanPlay )
                  : ( !transportPlaying && ( sc.status === 'loading' || sc.status === 'booting' ) ) }
                  className={ transportPlaying ? 'active' : '' }
                  onClick={ toggleTransport }>{ transportPlaying ? 'Pause' : 'Play' }</button>
                <button disabled={ !transportLoaded } onClick={ stopTransport }>Stop</button>
                <button disabled={ !transportLoaded } aria-label="Return to start"
                  title="Return to start" onClick={ returnToStart }>&#8612;</button>
              </div>
              <div className="transportPosition">
                <strong>{ session.playhead.toFixed( 3 ) } s</strong><span>playhead</span>
                <strong>{ session.cursorTime.toFixed( 3 ) } s</strong><span>cursor</span>
              </div>
              <p>{ session.mode === MODES.HOSTED && hosted.transport
                ? `${ hosted.transport.state } · run ${ hosted.transport.runID || '—' } · host-clock anchor`
                : session.mode === MODES.STANDALONE && standaloneLoaded
                  ? `${ standalone.status } · run ${ standalone.runID || '—' } · browser absolute-time anchor`
                  : 'Load the selected executor before playback.' }</p>
            </section>
            <ScoreTimeline session={ session } dispatch={ dispatch } onSeek={ seekTransport } />
          </div> : session.view === 'instruments'
            ? <InstrumentWorkspace sc={ sc } mode={ session.mode }
              hostedClient={ hostedClient } hostedState={ hosted } />
            : <ConsoleWorkspace sc={ sc } sclang={ sclang }
              workingDocument={ session.workingDocument } mode={ session.mode } /> }
        </> }
        right={ <ScoreRuntimeRail
          instrumentPanel={ <InstrumentPanel document={ session.document } mode={ session.mode }
            hostedSynthDefs={ hosted.synthDefContext }
            standaloneDefinitions={ definitionsCurrent ? standaloneDefinitions : {
              scoreID: null, revision: null, state: 'unknown', missing: [], detail: ''
            } } /> }
          auditionPanel={ <AuditionRuntimePanel realizations={ audition.realizations }
            onFocus={ ( realization ) => {
              if ( realization.definition ) {
                const description = realization.description
                  ?? hosted.synthDefContext.definitions[ realization.definition ];
                focusSynthDef( { name: realization.definition, description,
                  contextGeneration: description?.contextGeneration ?? 0,
                  signalKind: realization.signalKind ?? 'unknown', source: 'audition runtime',
                  initialValues: realization.params } );
              }
            } }
            onCommand={ ( id, action ) => auditionController.command( id, action ) } /> }
          realizationsPanel={ ( session.mode === MODES.HOSTED || standalone.realizations.length > 0 ) && <section className="realizations">
            <h2>Realizations</h2>
            { ( session.mode === MODES.HOSTED ? hosted.realizations : standalone.realizations ).length
              ? [ ...( session.mode === MODES.HOSTED ? hosted.realizations : standalone.realizations ) ].reverse().slice( 0, 8 ).map( ( realization ) => (
              <div className="realization" key={ realization.realizationID ?? realization.nodeID }>
                <strong>{ realization.entryID }</strong><span>{ realization.state }</span>
                <small>{ realization.nodeIDs?.length ? `nodes ${ realization.nodeIDs.join( ', ' ) }`
                  : realization.nodeID ? `node ${ realization.nodeID }` : 'no server nodes' }</small>
              </div>
            ) ) : <p className="emptyCopy">No runtime realizations reported.</p> }
          </section> } /> }
        bottom={ <ScoreFocusPanel focus={ displayedFocus }>
          { focus.kind === 'scoreEvent' && selectedEntry && <EventEditor
            key={ `${ selectedEntry.id }:${ session.document.revision }:${ session.previewVersion }` }
            entry={ selectedEntry } onPreview={ previewSelectedEntry } onCommit={ updateSelectedEntry }
            inheritedDefinition={ lifecycleDefinitionsForEntry( inspectedEntries, selectedEntry.id )[ 0 ] ?? null }
            availableSynthDefs={ session.mode === MODES.HOSTED
              ? hosted.synthDefContext.inventory ?? [] : [] }
            onAudition={ ( event ) => auditionDraft( {
              definition: event.def ?? event.instrument, params: event, model: null
            }, displayedFocus ) }
            onStopAudition={ () => auditionController.stopDraft( focus.draftID ) }
            auditionCount={ audition.realizations.filter( ( item ) => item.draftID === focus.draftID && item.state !== 'ended' ).length } /> }
          { focus.kind === 'synthDef' && <SynthDefDraftEditor key={ focus.draftID } focus={ displayedFocus }
            onAudition={ ( draft ) => auditionDraft( draft, displayedFocus ) }
            onStopAudition={ () => auditionController.stopDraft( focus.draftID ) }
            auditionCount={ audition.realizations.filter( ( item ) => item.draftID === focus.draftID && item.state !== 'ended' ).length } /> }
          { audition.error && <p className="error">{ audition.error }</p> }
        </ScoreFocusPanel> } />
    </div>
  );
}

function EventEditor( {
  entry, inheritedDefinition, availableSynthDefs = [], onPreview, onCommit,
  onAudition, onStopAudition, auditionCount = 0
} ) {
  const [ time, setTime ] = useState( String( entry.time ) );
  const [ path, setPath ] = useState( () => entry.path.join( '/' ) );
  const [ eventText, setEventText ] = useState( () => JSON.stringify( entry.event, null, 2 ) );
  const [ error, setError ] = useState( '' );
  let parsedEvent = null;
  try {
    const parsed = JSON.parse( eventText );
    if ( parsed && typeof parsed === 'object' && !Array.isArray( parsed ) ) parsedEvent = parsed;
  } catch { /* raw editor reports syntax errors on Apply */ }

  function draftPatch( next = {} ) {
    const nextTime = Number( next.time ?? time );
    const nextPath = next.path ?? path;
    const nextText = next.eventText ?? eventText;
    let event;
    try { event = JSON.parse( nextText ); } catch { return; }
    if ( !Number.isFinite( nextTime ) || nextTime < 0 || !event || typeof event !== 'object' || Array.isArray( event ) ) return;
    onPreview( {
      time: nextTime,
      path: nextPath.split( '/' ).map( ( segment ) => segment.trim() ).filter( Boolean ),
      event
    } );
  }

  function updatePayload( event ) {
    const text = JSON.stringify( event, null, 2 );
    setEventText( text );
    draftPatch( { eventText: text } );
    setError( '' );
  }

  function commit() {
    try {
      if ( !time.trim() ) throw new Error( 'Time is required.' );
      const nextTime = Number( time );
      if ( !Number.isFinite( nextTime ) || nextTime < 0 ) throw new Error( 'Time must be a finite number at or after zero.' );
      const event = JSON.parse( eventText );
      if ( !event || typeof event !== 'object' || Array.isArray( event ) ) throw new Error( 'Event payload must be a JSON object.' );
      onCommit( {
        time: nextTime,
        path: path.split( '/' ).map( ( segment ) => segment.trim() ).filter( Boolean ),
        event
      } );
      setError( '' );
    } catch ( nextError ) {
      setError( nextError.message );
    }
  }

  return (
    <div className="eventDetailEditor" onBlur={ ( blurEvent ) => {
      if ( !blurEvent.currentTarget.contains( blurEvent.relatedTarget ) ) commit();
    } }>
      <div className="eventMetaBar">
        <span><small>Event ID</small><code>{ entry.id }</code></span>
        <label><small>Time</small><span><input aria-label="Event time" type="number" min="0" step="0.001"
          value={ time } onChange={ ( event ) => { setTime( event.target.value ); draftPatch( { time: event.target.value } ); } } />
          <em>s</em></span></label>
        <label className="eventPathField"><small>Path</small><input aria-label="Event path" value={ path }
          placeholder="section/voice" onChange={ ( event ) => {
            setPath( event.target.value ); draftPatch( { path: event.target.value } );
          } } /></label>
      </div>
      <div className="eventEditorGrid">
        <section className="eventEditorCard"><header><strong>Musical event</strong>
          <small>Structured controls update the score immediately.</small></header>
          <EventPayloadEditor event={ parsedEvent } inheritedDefinition={ inheritedDefinition }
            availableSynthDefs={ availableSynthDefs } onChange={ updatePayload } />
        </section>
        <section className="eventEditorCard rawEventCard"><header><strong>Raw event</strong>
          <small>JSON view of the same authored payload.</small></header>
          <textarea aria-label="Event payload" className="eventJson" value={ eventText }
            onChange={ ( event ) => { setEventText( event.target.value ); draftPatch( { eventText: event.target.value } ); } }
            onKeyDown={ ( event ) => {
              if ( ( event.metaKey || event.ctrlKey ) && event.key === 'Enter' ) { event.preventDefault(); commit(); }
            } } />
        </section>
      </div>
      { error && <p className="error">{ error }</p> }
      <div className="focusAuditionActions"><button onClick={ commit }>Apply event</button>
        <button disabled={ !parsedEvent || parsedEvent.type !== 'note' || !( parsedEvent.def ?? parsedEvent.instrument ) }
          onClick={ () => onAudition( parsedEvent ) }>Play copy</button>
        <button disabled={ auditionCount === 0 } onClick={ onStopAudition }>Stop copy ({ auditionCount })</button></div>
    </div>
  );
}

function AuditionRuntimePanel( { realizations, onFocus, onCommand } ) {
  const visible = [ ...realizations ].reverse().slice( 0, 8 );
  return <section className="auditionRuntime"><h2>Auditions</h2>
    { visible.length ? visible.map( ( realization ) => {
      const running = realization.state === 'running';
      const paused = realization.state === 'paused';
      const live = running || paused;
      const stateLabel = running ? 'Pause' : paused ? 'Play'
        : [ 'releasing', 'ending' ].includes( realization.state ) ? 'Finishing'
          : realization.state === 'ended' ? 'Finished'
            : realization.state === 'starting' ? 'Starting' : 'Unavailable';
      return <div className="realization auditionVoice" key={ realization.realizationID }>
      <button className="realizationFocus" onClick={ () => onFocus( realization ) }>
        <strong>{ formatScSymbol( realization.definition ) }</strong>
        <small>{ realization.nodeIDs.length } voice{ realization.nodeIDs.length === 1 ? '' : 's' }</small>
      </button>
      <div className="realizationActions">
        <button disabled={ !live } onClick={ () => live
          && onCommand( realization.realizationID, paused ? 'resume' : 'pause' ) }>{ stateLabel }</button>
        { live && <button onClick={ () => onCommand( realization.realizationID, 'release' ) }>Release</button> }
        { live && <button onClick={ () => onCommand( realization.realizationID, 'free' ) }>Free</button> }
      </div>
      { realization.error && <small className="error">{ realization.error }</small> }
    </div>;
    } ) : <p className="emptyCopy">No audition voices.</p> }
  </section>;
}
