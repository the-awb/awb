import { useEffect, useMemo, useReducer, useRef, useState, useSyncExternalStore } from 'react';
import { useSuperCollider } from '@awb/sc-wasm/react';
import { useScLang } from '@awb/sc-console/hook';
import { hashScoreDocument, parseScoreDocument, sortScore } from '@awb/score';
import ConsoleWorkspace from './components/ConsoleWorkspace.jsx';
import ScoreTimeline from './components/ScoreTimeline.jsx';
import { openScoreFile, readScoreFile, saveScoreFile, storeRecoveryDraft } from './engine/scoreFiles.js';
import { importSclang, importScsynth, locateSclangFile } from './engine/scAssets.js';
import { HostedScoreClient } from './engine/HostedScoreClient.js';
import { createSessionState, MODES, scoreSessionReducer, seedDocument } from './state/scoreSession.js';

const freshID = () => `score-${ globalThis.crypto.randomUUID() }`;

export default function App() {
  const [ session, dispatch ] = useReducer( scoreSessionReducer, undefined, () => createSessionState() );
  const [ file, setFile ] = useState( {
    handle: null, name: null, hash: null, savedRevision: null,
    projectionStatus: 'not generated', message: ''
  } );
  const [ endpoint, setEndpoint ] = useState( import.meta.env.VITE_HOSTED_ENDPOINT ?? '' );
  const [ hostedMessage, setHostedMessage ] = useState( '' );
  const inputRef = useRef( null );
  const sc = useSuperCollider( { importScsynth } );
  const sclang = useScLang( sc, { importSclang, locateFile: locateSclangFile, exposeDevGlobals: import.meta.env.DEV } );
  const hostedClient = useMemo( () => new HostedScoreClient(), [] );
  const hosted = useSyncExternalStore( hostedClient.subscribe, hostedClient.getState, hostedClient.getState );
  const dirty = file.savedRevision !== session.document.revision;
  const selectedEntry = useMemo(
    () => session.document.entries.find( ( entry ) => entry.id === session.selected[ 0 ] ) ?? null,
    [ session.document.entries, session.selected ]
  );

  useEffect( () => {
    try { storeRecoveryDraft( session.document ); } catch { /* local recovery is optional */ }
  }, [ session.document ] );

  useEffect( () => () => hostedClient.disconnect(), [ hostedClient ] );

  useEffect( () => {
    if ( session.mode !== MODES.HOSTED || !hosted.transport ) return undefined;
    dispatch( { type: 'SET_PLAYHEAD', time: hostedClient.estimateScorePosition() } );
    if ( hosted.transport.state !== 'playing' ) return undefined;
    const timer = setInterval( () => {
      dispatch( { type: 'SET_PLAYHEAD', time: hostedClient.estimateScorePosition() } );
    }, 50 );
    return () => clearInterval( timer );
  }, [ hosted.transport, hosted.clockOffset, hostedClient, session.mode ] );

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

  async function acceptOpen( result ) {
    dispatch( { type: 'LOAD_DOCUMENT', document: result.document } );
    setFile( {
      handle: result.handle ?? null,
      name: result.name,
      hash: result.hash,
      savedRevision: result.document.revision,
      projectionStatus: 'not loaded',
      message: `Opened ${ result.name }`
    } );
  }

  async function openDocument() {
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
    if ( !picked ) return;
    try { await acceptOpen( await readScoreFile( picked ) ); }
    catch ( error ) { setFile( ( current ) => ( { ...current, message: error.message } ) ); }
  }

  async function saveDocument( saveAs = false ) {
    try {
      const result = await saveScoreFile( session.document, {
        handle: file.handle,
        expectedHash: file.hash,
        saveAs
      } );
      setFile( {
        handle: result.handle,
        name: result.handle?.name ?? `${ session.document.scoreID }.score.json`,
        hash: result.hash,
        savedRevision: session.document.revision,
        projectionStatus: 'pending desktop export',
        message: result.downloaded
          ? 'Canonical JSON downloaded. This browser cannot retain a writable file handle.'
          : 'Canonical JSON saved. SC projection is pending desktop export.'
      } );
    } catch ( error ) {
      if ( error.name !== 'AbortError' ) setFile( ( current ) => ( { ...current, message: error.message } ) );
    }
  }

  function newDocument() {
    if ( dirty && !window.confirm( 'Discard the current unsaved revision?' ) ) return;
    dispatch( { type: 'LOAD_DOCUMENT', document: seedDocument( freshID() ) } );
    setFile( {
      handle: null, name: null, hash: null, savedRevision: null,
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
          <button onClick={ () => saveDocument( false ) }>Save</button>
          <button onClick={ () => saveDocument( true ) }>Save as…</button>
        </div>
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
                <button disabled={ !sc.isBooted } onClick={ () => sc.shutdown() }>Quit</button>
              </div>
              <p className="boundaryNote">The browser owns only the nodes created by this standalone session. Score playback arrives in the next executor slice.</p>
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
          ) : <div className="runtimeButtons"><button disabled>Play</button><button disabled>Pause</button><button disabled>Stop</button></div> }
          <p className="timeLarge">{ session.playhead.toFixed( 3 ) } s</p>
          <p className="boundaryNote">{ session.mode === MODES.HOSTED && hosted.transport
            ? `${ hosted.transport.state } · run ${ hosted.transport.runID || '—' } · host-clock anchor`
            : 'Controls stay disabled until their selected executor is connected.' }</p>
        </section>

        { session.mode === MODES.HOSTED && <section className="realizations">
          <h2>Realizations</h2>
          { hosted.realizations.length ? [ ...hosted.realizations ].reverse().slice( 0, 8 ).map( ( realization ) => (
            <div className="realization" key={ realization.realizationID }>
              <strong>{ realization.entryID }</strong><span>{ realization.state }</span>
              <small>{ realization.nodeIDs.length ? `nodes ${ realization.nodeIDs.join( ', ' ) }` : 'no server nodes' }</small>
            </div>
          ) ) : <p className="emptyCopy">No runtime realizations reported.</p> }
        </section> }

        <section className="eventInspector">
          <h2>Event</h2>
          { selectedEntry
            ? <EventEditor key={ `${ selectedEntry.id }:${ session.document.revision }` }
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
        <label>Event payload<textarea aria-label="Event payload" className="eventJson" value={ eventText }
          onChange={ ( event ) => setEventText( event.target.value ) } /></label>
      </div>
      { error && <p className="error">{ error }</p> }
      <button onClick={ commit }>Apply event</button>
    </>
  );
}
