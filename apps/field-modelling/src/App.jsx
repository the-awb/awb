import { useEffect, useMemo, useReducer, useRef, useState } from 'react';
import { flattenChannels, slowestBeat } from '@awb/field-engine';
import FieldCanvas from './components/FieldCanvas.jsx';
import NumberSlider from './components/NumberSlider.jsx';
import InstrumentsPanel from './components/instruments/InstrumentsPanel.jsx';
import InstrumentParamsPanel from './components/instruments/InstrumentParamsPanel.jsx';
import MicrophonesPanel from './components/probes/MicrophonesPanel.jsx';
import DisplayPanel from './components/display/DisplayPanel.jsx';
import RoomPanel from './components/room/RoomPanel.jsx';
import SurfaceList from './components/surfaces/SurfaceList.jsx';
import { fieldReducer, initialFieldState } from './state/fieldReducer.js';
import { openInitialDocument, saveFieldDocument, stateFromFieldConfig } from './documentSession.js';
import { useHostedField } from './useHostedField.js';
import { instrumentType } from '@awb/instruments';
import { drawableRuntimeInstruments } from './engine/instrumentPresentation.js';
import './App.css';

const host = globalThis.awbHost ?? null;
const context = host?.initialLaunchContext?.() ?? { tool: { id: 'field-modelling' }, viewID: 'browser',
  toolSessionID: null, payload: {}, connections: {}, launchOrigin: 'web' };

const EMPTY_INSTRUMENT_RUNTIME = Object.freeze( {
  externalNodes: Object.freeze( [] ), voices: null,
  isSounding: null, synthDefFor: () => null,
  command: () => {}, setControl: () => {}
} );

// The desktop composition root supplies a NodeManager-backed runtime; the web composition root may
// supply an equivalent WASM projection. Field's application layer consumes only this projection
// and never discovers synths or talks to a server directly.
export default function App( { instrumentRuntime = EMPTY_INSTRUMENT_RUNTIME } ) {
  const [ state, dispatch ] = useReducer( fieldReducer, undefined, initialFieldState );
  const [ tab, setTab ] = useState( 'instruments' );
  const [ file, setFile ] = useState( null );
  const [ project, setProject ] = useState( null );
  const [ scoreDocument, setScoreDocument ] = useState( null );
  const [ documentStatus, setDocumentStatus ] = useState( 'new' );
  const [ error, setError ] = useState( null );
  const [ readings, setReadings ] = useState( {} );
  const stateRef = useRef( state ); stateRef.current = state;
  const attached = Boolean( context.payload?.scoreSessionID && context.payload?.runID );
  const runtime = useMemo( () => ( {
    ...EMPTY_INSTRUMENT_RUNTIME,
    ...instrumentRuntime,
    externalNodes: Array.isArray( instrumentRuntime?.externalNodes ) ? instrumentRuntime.externalNodes : [],
    synthDefFor: typeof instrumentRuntime?.synthDefFor === 'function'
      ? instrumentRuntime.synthDefFor : EMPTY_INSTRUMENT_RUNTIME.synthDefFor,
    command: typeof instrumentRuntime?.command === 'function'
      ? instrumentRuntime.command : EMPTY_INSTRUMENT_RUNTIME.command,
    setControl: typeof instrumentRuntime?.setControl === 'function'
      ? instrumentRuntime.setControl : EMPTY_INSTRUMENT_RUNTIME.setControl
  } ), [ instrumentRuntime ] );

  const analyticVoices = useMemo( () => ( {
    external: [], voicesRef: { current: new Map( state.instruments
      .filter( ( instrument ) => instrument.playing !== false )
      .map( ( instrument ) => [ instrument.id, { startedAt: 0, releasedAt: null } ] ) ) },
    isSounding: ( id ) => state.instruments.some( ( instrument ) => instrument.id === id && instrument.playing !== false )
  } ), [ state.instruments ] );
  const hosted = useHostedField( { context, document: scoreDocument,
    speakers: state.room.speakers, enabled: attached } );
  const runtimeExternals = useMemo( () => drawableRuntimeInstruments(
    runtime.externalNodes, state.room.speakers
  ), [ runtime.externalNodes, state.room.speakers ] );
  const runtimeVoices = useMemo( () => ( {
    ...( runtime.voices ?? analyticVoices ),
    external: runtimeExternals
  } ), [ runtime.voices, runtimeExternals, analyticVoices ] );
  const voices = attached ? hosted.voices : runtimeVoices;
  const mode = attached ? 'attached' : ( runtime.voices == null ? 'analytic' : 'live' );

  useEffect( () => {
    let live = true;
    ( async () => {
      if ( !host ) { setDocumentStatus( 'browser analytic preview' ); return; }
      try {
        const opened = await openInitialDocument( host, context );
        if ( !live ) return;
        if ( opened.config ) dispatch( { type: 'LOAD_STATE', state: stateFromFieldConfig( opened.config ) } );
        setFile( opened.file ? { ...opened.file, configID: opened.config?.configID } : null );
        setProject( opened.kind === 'project' ? { projectID: opened.project.projectID,
          scoreID: opened.project.score.scoreID, bindingID: opened.binding.bindingID } : null );
        setScoreDocument( opened.score?.document ?? null );
        setDocumentStatus( opened.kind === 'new' ? 'new field' : `opened ${ opened.file.name }` );
        host.reportDetailedState( { validatedDocumentKindID: opened.kind === 'project' ? 'score-project' :
          opened.kind === 'config' ? 'field-config' : null } );
      } catch ( failure ) { if ( live ) { setError( failure.message ); setDocumentStatus( 'open failed' ); } }
      host.reportReady( { toolID: 'field-modelling', viewID: context.viewID,
        toolSessionID: context.toolSessionID, mode } );
    } )();
    return () => { live = false; };
  }, [] );

  useEffect( () => { host?.reportSessionState( { mode,
    scoreSessionID: context.payload?.scoreSessionID ?? null, runID: context.payload?.runID ?? null,
    project, documentStatus } ); }, [ project, documentStatus, mode ] );

  useEffect( () => host?.onCommand( ( command ) => {
    if ( command?.type === 'dispose' ) host.reportDetailedState( { disposeAcknowledged: true } );
  } ), [] );

  const hint = useMemo( () => {
    const channels = flattenChannels( state.instruments, state.room.speakers, state.timeFactor, 0 )
      .filter( ( channel ) => channel.freq > 0 && ( channel.gl > 0 || channel.gr > 0 ) );
    if ( !channels.length ) return 'No active channels.';
    const beat = slowestBeat( channels.map( ( channel ) => channel.freq ) );
    return `${ channels.length } channel${ channels.length === 1 ? '' : 's' }${ beat == null ? '' : ` - slowest beat ${ beat.toFixed( 2 ) } Hz` }.`;
  }, [ state.instruments, state.room.speakers, state.timeFactor ] );

  const save = async ( saveAs = false ) => {
    try {
      setError( null ); setDocumentStatus( 'saving' );
      const saved = await saveFieldDocument( host, stateRef.current, file, { saveAs } );
      setFile( saved ); setDocumentStatus( saved ? `saved ${ saved.name }` : 'save cancelled' );
      if ( saved ) host?.reportDetailedState( { validatedDocumentKindID: 'field-config' } );
    } catch ( failure ) { setError( failure.message ); setDocumentStatus( 'save failed' ); }
  };

  const selectedIndex = state.instruments.findIndex( ( instrument ) => instrument.id === state.selectedInstrumentId );
  const selected = state.instruments[ selectedIndex ] ?? null;
  const selectedRuntimeNode = runtime.externalNodes.find(
    ( node ) => node.entryID === state.selectedNodeId ) ?? null;
  const selectedSynthDef = selected
    ? runtime.synthDefFor( instrumentType( selected.type )?.synthDef ?? null )
    : null;

  return <div className="appRoot fieldTool" style={{ '--dockH': '35vh', '--lhsW': '40px', '--rhsW': '400px' }}>
    <FieldCanvas state={ state } voices={ voices } readRecentSamples={ null }
      onMicrophoneReadings={ setReadings } analytic={ mode === 'analytic' } />
    <header className="fieldHostBar">
      <div><strong>Field Modelling</strong><span>{ mode === 'attached' ? 'Hosted score field'
        : mode === 'live' ? 'Desktop live field' : 'Analytic preview' }</span></div>
      <div className="fieldIdentity">
        { project && <span>{ project.projectID } / { project.bindingID }</span> }
        { attached && <span>session { context.payload.scoreSessionID } / run { context.payload.runID }</span> }
        { attached && <span>score { hosted.runtime.status } · phase { hosted.runtime.phaseStatus } · { hosted.projection.instruments.length } master-only · { hosted.projection.unsupported.length } unsupported</span> }
        <span>{ documentStatus }</span>
      </div>
      <button onClick={ () => save( false ) } disabled={ !host }>Save</button>
      <button onClick={ () => save( true ) } disabled={ !host }>Save As</button>
    </header>
    { error && <div className="fieldError" role="alert">{ error }</div> }
    <input className="floatingTitle" value={ state.meta.title }
      onChange={ ( event ) => dispatch( { type: 'SET_META', key: 'title', value: event.target.value } ) } />
    <textarea className="floatingDescription" value={ state.meta.description }
      onChange={ ( event ) => dispatch( { type: 'SET_META', key: 'description', value: event.target.value } ) } />
    <MicrophonesPanel microphones={ state.microphones } bodySurface={ state.surfaces.body }
      instruments={ state.instruments } externals={ voices?.external ?? [] } room={ state.room } timeFactor={ state.timeFactor }
      displayGain={ state.display.gain } liveReadings={ readings } />
    <InstrumentParamsPanel open={ state.paramsOpen }
      onToggle={ () => dispatch( { type: 'SET_PARAMS_OPEN', open: !state.paramsOpen } ) }
      instrument={ selected } colorIndex={ selectedIndex } synthDefInterface={ selectedSynthDef }
      selectedSurfaceId={ state.selectedSurfaceId } surfaces={ state.surfaces }
      selectedNodeId={ state.selectedNodeId } runtimeNode={ selectedRuntimeNode }
      onSetRuntimeControl={ runtime.setControl } onRuntimeCommand={ runtime.command }
      speakers={ state.room.speakers } dispatch={ dispatch } />
    <div className="dock"><div className="dockBody">
      <div className="dockTabs">
        <button className={ tab === 'instruments' ? 'on' : '' } onClick={ () => setTab( 'instruments' ) }>Instruments</button>
        <button className={ tab === 'settings' ? 'on' : '' } onClick={ () => setTab( 'settings' ) }>Room and display</button>
      </div>
      { tab === 'instruments' ? <div className="dockContent">
        <div className="dockContentHeader"><div className="hint">{ hint }</div>
          <NumberSlider label="Time factor" value={ state.timeFactor } min={ 0.05 } max={ 4 }
            step={ 0.01 } decimals={ 3 } unit="x" onChange={ ( value ) => dispatch( { type: 'SET_TIME_FACTOR', value } ) } />
        </div>
        <InstrumentsPanel instruments={ state.instruments } speakers={ state.room.speakers }
          selectedId={ state.selectedInstrumentId } dispatch={ dispatch }
          selectedNodeId={ state.selectedNodeId }
          isSounding={ runtime.isSounding ?? analyticVoices.isSounding }
          runtimeNodes={ runtime.externalNodes }
          onRuntimeCommand={ runtime.command } />
      </div> : <div className="dockContent"><div className="splitPane settingsPane">
        <SurfaceList surfaces={ state.surfaces } selectedId={ state.selectedSurfaceId } dispatch={ dispatch } />
        <RoomPanel room={ state.room } dispatch={ dispatch } />
        <DisplayPanel display={ state.display } dispatch={ dispatch } />
      </div></div> }
    </div></div>
  </div>;
}
