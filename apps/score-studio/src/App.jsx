import { useEffect, useMemo, useReducer, useRef, useState } from 'react';
import { useSuperCollider } from '@awb/sc-wasm/react';
import { useScLang } from '@awb/sc-console/hook';
import { hashScoreDocument, parseScoreDocument } from '@awb/score';
import ConsoleWorkspace from './components/ConsoleWorkspace.jsx';
import ScoreTimeline from './components/ScoreTimeline.jsx';
import { openScoreFile, readScoreFile, saveScoreFile, storeRecoveryDraft } from './engine/scoreFiles.js';
import { importSclang, importScsynth, locateSclangFile } from './engine/scAssets.js';
import { createSessionState, MODES, scoreSessionReducer, seedDocument } from './state/scoreSession.js';

const freshID = () => `score-${ globalThis.crypto.randomUUID() }`;

export default function App() {
  const [ session, dispatch ] = useReducer( scoreSessionReducer, undefined, () => createSessionState() );
  const [ file, setFile ] = useState( { handle: null, name: null, hash: null, savedRevision: null, message: '' } );
  const [ endpoint, setEndpoint ] = useState( '' );
  const inputRef = useRef( null );
  const sc = useSuperCollider( { importScsynth } );
  const sclang = useScLang( sc, { importSclang, locateFile: locateSclangFile, exposeDevGlobals: import.meta.env.DEV } );
  const dirty = file.savedRevision !== session.document.revision;
  const selectedEntry = useMemo(
    () => session.document.entries.find( ( entry ) => entry.id === session.selected[ 0 ] ) ?? null,
    [ session.document.entries, session.selected ]
  );

  useEffect( () => {
    try { storeRecoveryDraft( session.document ); } catch { /* local recovery is optional */ }
  }, [ session.document ] );

  async function acceptOpen( result ) {
    dispatch( { type: 'LOAD_DOCUMENT', document: result.document } );
    setFile( {
      handle: result.handle ?? null,
      name: result.name,
      hash: result.hash,
      savedRevision: result.document.revision,
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
        message: result.downloaded
          ? 'Canonical JSON downloaded. This browser cannot retain a writable file handle.'
          : 'Canonical JSON saved. SC projection has not been requested yet.'
      } );
    } catch ( error ) {
      if ( error.name !== 'AbortError' ) setFile( ( current ) => ( { ...current, message: error.message } ) );
    }
  }

  function newDocument() {
    if ( dirty && !window.confirm( 'Discard the current unsaved revision?' ) ) return;
    dispatch( { type: 'LOAD_DOCUMENT', document: seedDocument( freshID() ) } );
    setFile( { handle: null, name: null, hash: null, savedRevision: null, message: 'New unsaved score' } );
  }

  function updateSelectedEvent( text ) {
    if ( !selectedEntry ) return;
    try {
      const event = JSON.parse( text );
      const entries = session.document.entries.map( ( entry ) => (
        entry.id === selectedEntry.id ? { ...entry, event } : entry
      ) );
      dispatch( { type: 'EDIT_ENTRIES', entries } );
      setFile( ( current ) => ( { ...current, message: '' } ) );
    } catch ( error ) {
      setFile( ( current ) => ( { ...current, message: `Event JSON: ${ error.message }` } ) );
    }
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
              <button disabled>Connect</button>
              <p className="boundaryNote">The desktop bridge owns scheduling and transport. This client will consume the frozen OSC transcript; it does not generate SC code.</p>
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
          <div className="runtimeButtons"><button disabled>Play</button><button disabled>Pause</button><button disabled>Stop</button></div>
          <p className="timeLarge">{ session.playhead.toFixed( 3 ) } s</p>
          <p className="boundaryNote">Controls stay disabled until their selected executor is connected.</p>
        </section>

        <section className="eventInspector">
          <h2>Event</h2>
          { selectedEntry
            ? <EventEditor key={ `${ selectedEntry.id }:${ session.document.revision }` }
              entry={ selectedEntry } onCommit={ updateSelectedEvent } />
            : <p className="emptyCopy">Select an event to inspect its authored payload.</p> }
        </section>
      </aside>
    </div>
  );
}

function EventEditor( { entry, onCommit } ) {
  const [ text, setText ] = useState( () => JSON.stringify( entry.event, null, 2 ) );
  return (
    <>
      <dl className="identity"><dt>ID</dt><dd>{ entry.id }</dd><dt>Time</dt><dd>{ entry.time } s</dd><dt>Path</dt><dd>{ entry.path.join( '/' ) || '—' }</dd></dl>
      <textarea className="eventJson" value={ text } onChange={ ( event ) => setText( event.target.value ) } />
      <button onClick={ () => onCommit( text ) }>Apply payload</button>
    </>
  );
}
