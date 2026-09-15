import { useEffect, useMemo, useReducer, useRef, useState, useSyncExternalStore } from 'react';
import { useSuperCollider } from '@awb/sc-wasm/react';
import { useScLang } from '@awb/sc-console/hook';
import { sortScore } from '@awb/score';
import ConsoleWorkspace from './components/ConsoleWorkspace.jsx';
import EventPayloadEditor from './components/EventPayloadEditor.jsx';
import ScoreTimeline from './components/ScoreTimeline.jsx';
import {
  listScoreDirectory, loadBundledScore, openScoreDirectory, openScoreFile, readScoreFile,
  readScoreHandle, saveProjectionFile, saveScoreFile, storeRecoveryDraft
} from './engine/scoreFiles.js';
import { importSclang, importScsynth, locateSclangFile } from './engine/scAssets.js';
import { HostedScoreClient } from './engine/HostedScoreClient.js';
import { createStandaloneScoreExecutor } from './engine/StandaloneScoreExecutor.js';
import { loadStandaloneSynthDefs } from './engine/standaloneSynthDefs.js';
import { retryScoreProjection, saveScorePair } from './engine/scorePairSave.js';
import { createSessionState, MODES, scoreSessionReducer, seedDocument } from './state/scoreSession.js';

const freshID = () => `score-${ globalThis.crypto.randomUUID() }`;
const launchedScoreURL = import.meta.env.VITE_HOSTED_SCORE_URL ?? '';
const launchedScoreName = import.meta.env.VITE_HOSTED_SCORE_NAME ?? 'hosted.score.json';
const toolSessionID = import.meta.env.VITE_TOOL_SESSION_ID ?? '';

export default function App() {
  const [ session, dispatch ] = useReducer( scoreSessionReducer, undefined, () => createSessionState() );
  const [ file, setFile ] = useState( {
    handle: null, name: null, hash: null, savedRevision: null,
    projectionHandle: null, projectionText: null, pendingIdentity: null,
    projectionStatus: 'not generated', message: ''
  } );
  const [ endpoint, setEndpoint ] = useState( import.meta.env.VITE_HOSTED_ENDPOINT ?? '' );
  const [ hostedMessage, setHostedMessage ] = useState( '' );
  const [ standaloneMessage, setStandaloneMessage ] = useState( '' );
  const [ scoreFolder, setScoreFolder ] = useState( { handle: null, name: '', files: [], message: '' } );
  const inputRef = useRef( null );
  const sc = useSuperCollider( { importScsynth } );
  const sclang = useScLang( sc, { importSclang, locateFile: locateSclangFile, exposeDevGlobals: import.meta.env.DEV } );
  const hostedClient = useMemo( () => new HostedScoreClient( {
    clientID: toolSessionID ? `score-tool-${ toolSessionID }` : undefined,
    toolSessionID
  } ), [] );
  const hosted = useSyncExternalStore( hostedClient.subscribe, hostedClient.getState, hostedClient.getState );
  const standaloneExecutorRef = useRef( null );
  if ( standaloneExecutorRef.current === null ) {
    standaloneExecutorRef.current = createStandaloneScoreExecutor( {
      sendOsc: sc.sendOsc,
      subscribeOscReply: sc.subscribeOscReply,
      parseOsc: ( bytes ) => sc.getEngine()?.parseOscMessage( bytes )
    } );
  }
  const standaloneExecutor = standaloneExecutorRef.current;
  const launchState = useRef( { scoreLoaded: false, installed: '' } );
  const standalone = useSyncExternalStore(
    standaloneExecutor.subscribe, standaloneExecutor.getState, standaloneExecutor.getState
  );
  const dirty = file.savedRevision !== session.document.revision;
  const inspectedEntries = session.previewEntries ?? session.document.entries;
  const selectedEntry = useMemo(
    () => inspectedEntries.find( ( entry ) => entry.id === session.selected[ 0 ] ) ?? null,
    [ inspectedEntries, session.selected ]
  );

  useEffect( () => {
    try { storeRecoveryDraft( session.document ); } catch { /* local recovery is optional */ }
  }, [ session.document ] );

  useEffect( () => {
    if ( !launchedScoreURL || launchState.current.scoreLoaded ) return;
    launchState.current.scoreLoaded = true;
    loadBundledScore( launchedScoreURL, launchedScoreName )
      .then( acceptOpen )
      .catch( ( error ) => setFile( ( current ) => ( { ...current, message: error.message } ) ) );
  }, [] );

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
    hostedClient.loadDocument( session.document, {
      expectedRevision: hosted.scoreID === session.document.scoreID
        && Number.isInteger( hosted.remoteRevision ) ? hosted.remoteRevision : -1
    } ).then( () => setHostedMessage( `Revision ${ session.document.revision } installed atomically.` ) )
      .catch( ( error ) => {
        launchState.current.installed = '';
        setHostedMessage( error.message );
      } );
  }, [ file.name, hosted.remoteRevision, hosted.scoreID, hosted.status,
    hostedClient, session.document ] );

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
    if ( session.mode === MODES.STANDALONE ) return;
    if ( standalone.status === 'playing' || standalone.status === 'paused' ) standaloneExecutor.stop();
  }, [ session.mode, standalone.status, standaloneExecutor ] );

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
  const standaloneLoaded = standalone.scoreID === session.document.scoreID
    && standalone.revision === session.document.revision;

  async function prepareStandalone( { atPlayhead = false } = {} ) {
    setStandaloneMessage( '' );
    try {
      await sc.boot();
      const definitions = await loadStandaloneSynthDefs( sc, session.document );
      if ( !standaloneLoaded ) standaloneExecutor.load( session.document );
      if ( atPlayhead ) standaloneExecutor.seek( session.playhead );
      setStandaloneMessage( `Revision ${ session.document.revision } ready · ${ definitions.length } SynthDef${ definitions.length === 1 ? '' : 's' }.` );
      return true;
    } catch ( error ) {
      setStandaloneMessage( error.message );
      return false;
    }
  }

  async function playStandalone() {
    if ( standalone.status === 'paused' && standaloneLoaded ) {
      standaloneExecutor.play();
      return;
    }
    if ( standalone.status === 'ended' ) dispatch( { type: 'SET_PLAYHEAD', time: 0 } );
    if ( await prepareStandalone( { atPlayhead: true } ) ) {
      if ( standalone.status === 'ended' ) standaloneExecutor.seek( 0 );
      standaloneExecutor.play();
    }
  }

  async function acceptOpen( result ) {
    dispatch( { type: 'LOAD_DOCUMENT', document: result.document } );
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
    return !dirty || untouchedWelcomeScore || window.confirm( 'Discard the current unsaved revision?' );
  }

  async function openDocument() {
    if ( !canDiscard() ) return;
    try {
      const result = await openScoreFile();
      if ( result ) await acceptOpen( result );
      else inputRef.current?.click();
    } catch ( error ) {
      if ( error.name !== 'AbortError' ) setFile( ( current ) => ( { ...current, message: error.message } ) );
    }
  }

  async function onFallbackFile( event ) {
    const picked = event.target.files?.[ 0 ];
    event.target.value = '';
    if ( !picked || !canDiscard() ) return;
    try { await acceptOpen( await readScoreFile( picked ) ); }
    catch ( error ) { setFile( ( current ) => ( { ...current, message: error.message } ) ); }
  }

  async function chooseScoreFolder() {
    try {
      const result = await openScoreDirectory();
      if ( !result ) {
        setScoreFolder( ( current ) => ( { ...current, message: 'Folder browsing requires Chromium; use Open… in this browser.' } ) );
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
      const files = await listScoreDirectory( scoreFolder.handle );
      setScoreFolder( ( current ) => ( {
        ...current, files, message: files.length ? '' : 'No .score.json files in this folder.'
      } ) );
    } catch ( error ) {
      setScoreFolder( ( current ) => ( { ...current, message: error.message } ) );
    }
  }

  async function openFolderScore( item ) {
    if ( !canDiscard() ) return;
    try { await acceptOpen( await readScoreHandle( item.handle ) ); }
    catch ( error ) { setScoreFolder( ( current ) => ( { ...current, message: error.message } ) ); }
  }

  async function openDemoScore() {
    if ( !canDiscard() ) return;
    try {
      const result = await loadBundledScore(
        '/examples/sonic-attunement-01.score.json', 'sonic-attunement-01.score.json'
      );
      await acceptOpen( result );
    } catch ( error ) {
      setFile( ( current ) => ( { ...current, message: error.message } ) );
    }
  }

  async function saveDocument( saveAs = false ) {
    try {
      if ( session.mode === MODES.HOSTED && connected ) {
        const result = await saveScorePair( {
          document: session.document,
          saveCanonical: () => saveScoreFile( session.document, {
            handle: file.handle, expectedHash: file.hash, saveAs
          } ),
          requestProjection: requestHostedProjection,
          saveProjection: ( text, identity ) => saveProjectionFile( text, {
            scoreID: identity.scoreID,
            handle: file.projectionHandle,
            expectedText: file.projectionText,
            saveAs
          } )
        } );
        setFile( ( current ) => ( {
          ...current,
          handle: result.canonical.handle,
          name: result.canonical.handle?.name ?? `${ session.document.scoreID }.score.json`,
          hash: result.canonical.hash,
          savedRevision: session.document.revision,
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
      const result = await saveScoreFile( session.document, { handle: file.handle, expectedHash: file.hash, saveAs } );
      setFile( {
        handle: result.handle,
        name: result.handle?.name ?? `${ session.document.scoreID }.score.json`,
        hash: result.hash,
        savedRevision: session.document.revision,
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

  async function requestHostedProjection( identity ) {
    if ( !connected ) throw new Error( 'Connect to the hosted bridge before requesting an SC projection.' );
    if ( hosted.scoreID !== session.document.scoreID || hosted.remoteRevision !== session.document.revision ) {
      const expectedRevision = hosted.scoreID === session.document.scoreID
        && Number.isInteger( hosted.remoteRevision ) ? hosted.remoteRevision : -1;
      await hostedClient.loadDocument( session.document, { expectedRevision } );
    }
    const projection = await hostedClient.requestProjection( identity );
    dispatch( { type: 'SET_WORKING_DOCUMENT', text: projection.text } );
    return projection;
  }

  async function retryProjection() {
    if ( !file.pendingIdentity ) return;
    try {
      const result = await retryScoreProjection( {
        document: session.document,
        identity: file.pendingIdentity,
        requestProjection: requestHostedProjection,
        saveProjection: ( text, identity ) => saveProjectionFile( text, {
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
    setFile( {
      handle: null, name: null, hash: null, savedRevision: null,
      projectionHandle: null, projectionText: null, pendingIdentity: null,
      projectionStatus: 'not generated', message: 'New unsaved score'
    } );
  }

  function updateSelectedEntry( patch ) {
    if ( !selectedEntry ) return;
    const entries = sortScore( session.document.entries.map( ( entry ) => (
      entry.id === selectedEntry.id ? { ...entry, ...patch } : entry
    ) ) );
    dispatch( { type: 'EDIT_ENTRIES', entries } );
    setFile( ( current ) => ( { ...current, message: '' } ) );
  }

  return (
    <div className="appShell">
      <header className="topbar">
        <div className="brand"><span>AWB</span><strong>Score</strong></div>
        <input className="titleInput" value={ session.document.meta.title }
          onChange={ ( event ) => dispatch( { type: 'EDIT_META', key: 'title', value: event.target.value } ) } />
        <span className={ `saveState ${ dirty ? 'dirty' : '' }` }>{ dirty ? 'unsaved' : 'saved' }</span>
        <div className="modeSwitch" aria-label="Execution mode">
          { Object.values( MODES ).map( ( mode ) => (
            <button key={ mode } className={ session.mode === mode ? 'active' : '' }
              onClick={ () => dispatch( { type: 'SET_MODE', mode } ) }>{ mode }</button>
          ) ) }
        </div>
      </header>

      <aside className="filePanel">
        <h2>Scores</h2>
        <div className="fileButtons">
          <button onClick={ newDocument }>New</button>
          <button onClick={ openDocument }>Open…</button>
          <button onClick={ openDemoScore }>Demo score</button>
          <button onClick={ chooseScoreFolder }>Open folder…</button>
          <button onClick={ () => saveDocument( false ) }>Save</button>
          <button onClick={ () => saveDocument( true ) }>Save as…</button>
          { file.pendingIdentity && <button disabled={ !connected } onClick={ retryProjection }>Retry SC export</button> }
        </div>
        { scoreFolder.handle && <div className="scoreFolder">
          <div className="scoreFolderHeader"><strong>{ scoreFolder.name }</strong>
            <button onClick={ refreshScoreFolder }>Refresh</button></div>
          { scoreFolder.files.map( ( item ) => <button key={ item.name }
            className={ file.name === item.name ? 'active' : '' }
            onClick={ () => openFolderScore( item ) }>{ item.name }</button> ) }
        </div> }
        { scoreFolder.message && <p className="fileMessage">{ scoreFolder.message }</p> }
        <input ref={ inputRef } hidden type="file" accept=".json,.score.json,application/json" onChange={ onFallbackFile } />
        <dl className="identity">
          <dt>File</dt><dd>{ file.name ?? 'not saved' }</dd>
          <dt>Score ID</dt><dd>{ session.document.scoreID }</dd>
          <dt>Revision</dt><dd>{ session.document.revision }</dd>
          <dt>Entries</dt><dd>{ session.document.entries.length }</dd>
          <dt>SC pair</dt><dd>{ file.projectionStatus }</dd>
        </dl>
        { file.message && <p className="fileMessage">{ file.message }</p> }
        <p className="boundaryNote">JSON is canonical. Browser drafts are recovery copies. The generated SC document is a projection.</p>
      </aside>

      <main className="workspace">
        <nav className="viewTabs">
          <button className={ session.view === 'score' ? 'active' : '' }
            onClick={ () => dispatch( { type: 'SET_VIEW', view: 'score' } ) }>Score</button>
          <button className={ session.view === 'console' ? 'active' : '' }
            onClick={ () => dispatch( { type: 'SET_VIEW', view: 'console' } ) }>Console</button>
        </nav>
        { session.view === 'score'
          ? <ScoreTimeline session={ session } dispatch={ dispatch } />
          : <ConsoleWorkspace sc={ sc } sclang={ sclang } workingDocument={ session.workingDocument } mode={ session.mode } /> }
      </main>

      <aside className="inspector">
        <section>
          <h2>{ session.mode === MODES.HOSTED ? 'Hosted runtime' : 'Standalone runtime' }</h2>
          { session.mode === MODES.HOSTED ? (
            <>
              <label>WebSocket endpoint<input value={ endpoint } placeholder="Waiting for the frozen host endpoint"
                onChange={ ( event ) => setEndpoint( event.target.value ) } /></label>
              <div className="runtimeButtons hostedConnection">
                <button disabled={ !endpoint || hosted.status === 'connecting' || connected }
                  onClick={ () => hostedAction( () => hostedClient.connect( endpoint ), 'Connected to desktop sclang.' ) }>Connect</button>
                <button disabled={ !connected } onClick={ () => hostedClient.disconnect() }>Disconnect</button>
                <button disabled={ !connected } onClick={ () => hostedAction( () => hostedClient.loadDocument( session.document, {
                  expectedRevision: hosted.scoreID === session.document.scoreID && Number.isInteger( hosted.remoteRevision )
                    ? hosted.remoteRevision : -1
                } ), `Revision ${ session.document.revision } installed atomically.` ) }>Load revision</button>
              </div>
              <dl className="identity compact"><dt>Status</dt><dd>{ hosted.status }</dd><dt>Protocol</dt><dd>{ hosted.protocolVersion ?? '—' }</dd><dt>Remote</dt><dd>{ hosted.scoreID ? `${ hosted.scoreID } r${ hosted.remoteRevision }` : 'not loaded' }</dd></dl>
              { ( hostedMessage || hosted.error ) && <p className={ hosted.error ? 'error' : 'fileMessage' }>{ hostedMessage || hosted.error }</p> }
              <p className="boundaryNote">The local WebSocket sidecar forwards only `/awb/timeline/...` OSC. Desktop sclang remains the scheduling and transport authority.</p>
            </>
          ) : (
            <>
              <div className="runtimeButtons">
                <button disabled={ sc.status === 'ready' || sc.status === 'loading' || sc.status === 'booting' }
                  onClick={ () => sc.boot() }>{ sc.status === 'ready' ? 'Audio running' : 'Start audio' }</button>
                <button disabled={ sclang.isAttached || sclang.status === 'attaching' }
                  onClick={ sclang.attach }>{ sclang.isAttached ? 'sclang attached' : 'Attach sclang' }</button>
                <button disabled={ sc.status === 'loading' || sc.status === 'booting' }
                  onClick={ () => prepareStandalone() }>Load revision</button>
                <button disabled={ !sc.isBooted } onClick={ () => {
                  standaloneExecutor.stop();
                  sc.shutdown();
                } }>Quit</button>
              </div>
              <dl className="identity compact"><dt>Status</dt><dd>{ standalone.status }</dd><dt>Loaded</dt><dd>{ standalone.scoreID ? `${ standalone.scoreID } r${ standalone.revision }` : 'not loaded' }</dd><dt>Nodes</dt><dd>{ standalone.liveCount }</dd></dl>
              { standaloneMessage && <p className={ standalone.status === 'failed' ? 'error' : 'fileMessage' }>{ standaloneMessage }</p> }
              <p className="boundaryNote">The browser schedules canonical events against absolute score time and owns only the nodes created by this standalone run. Seeking starts at the next event boundary; it does not reconstruct sustaining state.</p>
              { ( sc.error || sclang.error ) && <p className="error">{ sc.error || sclang.error }</p> }
            </>
          ) }
        </section>

        <section className="transport">
          <h2>Transport</h2>
          { session.mode === MODES.HOSTED ? (
            <div className="runtimeButtons">
              <button disabled={ !loadedRevision || hosted.transport?.state === 'playing' }
                onClick={ () => hostedAction( () => hostedClient.command( session.document,
                  hosted.transport?.state === 'paused' ? 'resume' : 'play' ) ) }>{ hosted.transport?.state === 'paused' ? 'Resume' : 'Play' }</button>
              <button disabled={ !loadedRevision || hosted.transport?.state !== 'playing' }
                onClick={ () => hostedAction( () => hostedClient.command( session.document, 'pause' ) ) }>Pause</button>
              <button disabled={ !loadedRevision }
                onClick={ () => hostedAction( () => hostedClient.command( session.document, 'stop' ) ) }>Stop</button>
              <button disabled={ !loadedRevision }
                onClick={ () => hostedAction( () => hostedClient.command( session.document, 'seek', session.playhead ) ) }>Seek here</button>
              <button disabled={ !connected }
                onClick={ () => hostedAction( () => hostedClient.command( session.document, 'state' ) ) }>State</button>
              <button disabled={ !loadedRevision }
                onClick={ () => hostedAction( () => hostedClient.command( session.document, 'openDocument' ) ) }>Open SC document</button>
            </div>
          ) : <div className="runtimeButtons">
            <button disabled={ sc.status === 'loading' || sc.status === 'booting' || standalone.status === 'playing' }
              onClick={ playStandalone }>{ standalone.status === 'paused' ? 'Resume' : 'Play' }</button>
            <button disabled={ standalone.status !== 'playing' } onClick={ standaloneExecutor.pause }>Pause</button>
            <button disabled={ !standaloneLoaded } onClick={ standaloneExecutor.stop }>Stop</button>
            <button disabled={ !standaloneLoaded } onClick={ () => standaloneExecutor.seek( session.playhead ) }>Seek here</button>
          </div> }
          <p className="timeLarge">{ session.playhead.toFixed( 3 ) } s</p>
          <p className="boundaryNote">{ session.mode === MODES.HOSTED && hosted.transport
            ? `${ hosted.transport.state } · run ${ hosted.transport.runID || '—' } · host-clock anchor`
            : session.mode === MODES.STANDALONE && standaloneLoaded
              ? `${ standalone.status } · run ${ standalone.runID || '—' } · browser absolute-time anchor`
              : 'Controls stay disabled until their selected executor is loaded.' }</p>
        </section>

        { ( session.mode === MODES.HOSTED || standalone.realizations.length > 0 ) && <section className="realizations">
          <h2>Realizations</h2>
          { ( session.mode === MODES.HOSTED ? hosted.realizations : standalone.realizations ).length
            ? [ ...( session.mode === MODES.HOSTED ? hosted.realizations : standalone.realizations ) ].reverse().slice( 0, 8 ).map( ( realization ) => (
            <div className="realization" key={ realization.realizationID ?? realization.nodeID }>
              <strong>{ realization.entryID }</strong><span>{ realization.state }</span>
              <small>{ realization.nodeIDs?.length
                ? `nodes ${ realization.nodeIDs.join( ', ' ) }`
                : realization.nodeID ? `node ${ realization.nodeID }` : 'no server nodes' }</small>
            </div>
          ) ) : <p className="emptyCopy">No runtime realizations reported.</p> }
        </section> }

        <section className="eventInspector">
          <h2>Event</h2>
          { selectedEntry
            ? <EventEditor key={ `${ selectedEntry.id }:${ session.document.revision }:${ session.previewVersion }` }
              entry={ selectedEntry } onCommit={ updateSelectedEntry } />
            : <p className="emptyCopy">Select an event to inspect its authored payload.</p> }
        </section>
      </aside>
    </div>
  );
}

function EventEditor( { entry, onCommit } ) {
  const [ time, setTime ] = useState( String( entry.time ) );
  const [ path, setPath ] = useState( () => entry.path.join( '/' ) );
  const [ eventText, setEventText ] = useState( () => JSON.stringify( entry.event, null, 2 ) );
  const [ error, setError ] = useState( '' );
  let parsedEvent = null;
  try {
    const parsed = JSON.parse( eventText );
    if ( parsed && typeof parsed === 'object' && !Array.isArray( parsed ) ) parsedEvent = parsed;
  } catch { /* raw editor reports syntax errors on Apply */ }

  function updatePayload( event ) {
    setEventText( JSON.stringify( event, null, 2 ) );
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
    <>
      <dl className="identity compact"><dt>ID</dt><dd>{ entry.id }</dd></dl>
      <div className="entryFields">
        <label>Time (seconds)<input aria-label="Event time" type="number" min="0" step="0.001"
          value={ time } onChange={ ( event ) => setTime( event.target.value ) } /></label>
        <label>Path <input aria-label="Event path" value={ path } placeholder="section/voice"
          onChange={ ( event ) => setPath( event.target.value ) } /></label>
        <EventPayloadEditor event={ parsedEvent } onChange={ updatePayload } />
        <label>Raw event JSON<textarea aria-label="Event payload" className="eventJson" value={ eventText }
          onChange={ ( event ) => setEventText( event.target.value ) } /></label>
      </div>
      { error && <p className="error">{ error }</p> }
      <button onClick={ commit }>Apply event</button>
    </>
  );
}
