import { useEffect, useMemo, useState } from 'react';
import { instrumentEnvelopes } from '@awb/instruments';
import { normalizeScEnv, scEnvAsControlArray } from '@awb/sc-envelope';
import { loadSynthDefManifest } from '@awb/sc-wasm/core';
import EnvelopeEditor from './EnvelopeEditor.jsx';
import { liveInstrumentLibrary, initialLiveInstrumentParams } from '../engine/liveInstrumentLibrary.js';
import { synthDefManifestUrl } from '../engine/scAssets.js';
import { loadEnvelopeLabSynthDef, loadInstrumentLibrarySynthDefs } from '../engine/standaloneSynthDefs.js';

const defaultEditableEnvelope = normalizeScEnv( {
  levels: [ 0, 1, 0.65, 0 ], times: [ 0.08, 0.2, 0.5 ],
  curves: [ 'sin', 'sin', 'sin' ], releaseNode: 2
} );

export default function InstrumentWorkspace( { sc, mode, hostedClient, hostedState } ) {
  const [ manifest, setManifest ] = useState( null );
  const [ params, setParams ] = useState( {} );
  const [busy, setBusy] = useState( '' );
  const [message, setMessage] = useState( '' );
  const [error, setError] = useState( '' );
  const hosted = mode === 'hosted';
  const instruments = useMemo( () => manifest ? liveInstrumentLibrary( manifest, hosted ? {
    hostedDefinitions: hostedState?.synthDefContext?.definitions
  } : {} ) : [], [ hosted, hostedState?.synthDefContext?.definitions, manifest ] );
  const hostedNodes = hostedState?.liveInstruments ?? {};
  const rackNodeCount = hosted
    ? Object.keys( hostedNodes ).length
    : instruments.filter( ( instrument ) => sc.nodes[ instrument.definition ] ).length;

  useEffect( () => {
    let live = true;
    loadSynthDefManifest( synthDefManifestUrl() ).then(
      ( definitions ) => { if ( live ) setManifest( definitions ); },
      ( nextError ) => { if ( live ) setError( nextError.message ); }
    );
    return () => { live = false; };
  }, [] );

  useEffect( () => {
    if ( instruments.length === 0 ) return;
    setParams( ( current ) => Object.fromEntries( instruments.map( ( instrument ) => [
      instrument.definition,
      current[ instrument.definition ]
        ?? sc.nodes[ instrument.definition ]?.params
        ?? initialLiveInstrumentParams( instrument )
    ] ) ) );
  }, [ instruments ] ); // Node params are sampled when the library appears; later edits are local-first.

  async function prepare() {
    setError( '' );
    setMessage( '' );
    if ( sc.isBooted ) await sc.resumeAudio();
    else await sc.boot();
    const loaded = await loadInstrumentLibrarySynthDefs( sc );
    setMessage( `${ loaded.length } live instrument SynthDefs ready.` );
    return loaded;
  }

  async function act( key, action ) {
    setBusy( key );
    setError( '' );
    try { await action(); }
    catch ( nextError ) { setError( nextError.message ); }
    finally { setBusy( '' ); }
  }

  function updateParam( instrument, control, value ) {
    const next = { ...( params[ instrument.definition ] ?? {} ), [ control.name ]: value };
    setParams( ( current ) => ( { ...current, [ instrument.definition ]: next } ) );
    if ( hostedNodes[ instrument.key ] && hostedNodes[ instrument.key ].state !== 'releasing' ) {
      hostedClient.instrumentCommand( 'set', instrument.key, instrument.definition, { [ control.name ]: value } )
        .catch( ( nextError ) => setError( nextError.message ) );
    } else if ( !hosted && sc.nodes[ instrument.definition ] && !sc.nodes[ instrument.definition ].released ) {
      sc.setSynth( instrument.definition, { [ control.name ]: value } );
    }
  }

  function resetInstrument( instrument ) {
    const next = initialLiveInstrumentParams( instrument );
    setParams( ( current ) => ( { ...current, [ instrument.definition ]: next } ) );
    if ( hostedNodes[ instrument.key ] && hostedNodes[ instrument.key ].state !== 'releasing' ) {
      hostedClient.instrumentCommand( 'set', instrument.key, instrument.definition, next )
        .catch( ( nextError ) => setError( nextError.message ) );
    } else if ( !hosted && sc.nodes[ instrument.definition ] && !sc.nodes[ instrument.definition ].released ) {
      sc.setSynth( instrument.definition, next );
    }
  }

  async function instrumentAction( instrument, action ) {
    if ( hosted ) {
      return hostedClient.instrumentCommand( action, instrument.key, instrument.definition );
    }
    if ( action === 'pause' ) sc.pauseSynth( instrument.definition );
    else if ( action === 'resume' ) sc.resumeSynth( instrument.definition );
    else if ( action === 'release' ) sc.releaseSynth( instrument.definition );
    else if ( action === 'free' ) sc.freeSynth( instrument.definition );
  }

  async function startInstrument( instrument ) {
    const current = params[ instrument.definition ] ?? initialLiveInstrumentParams( instrument );
    const values = Object.fromEntries( instrument.controls.map( ( control ) => [
      control.name, current[ control.name ] ?? control.default
    ] ) );
    if ( hosted ) return hostedClient.instrumentCommand( 'start', instrument.key, instrument.definition, values );
    await prepare();
    sc.playSynth( instrument.definition, values );
  }

  async function allAction( action ) {
    const active = instruments.filter( ( instrument ) => hosted
      ? hostedNodes[ instrument.key ]
      : sc.nodes[ instrument.definition ] );
    await Promise.all( active.map( ( instrument ) => instrumentAction( instrument, action ) ) );
  }

  return <div className="instrumentWorkspace">
    <header className="instrumentWorkspaceHeader">
      <div><h1>{ hosted ? 'Hosted instruments' : 'Live instruments' }</h1>
        <p>{ hosted
          ? 'Desktop ToolInstance synths played by the connected SuperCollider language and server.'
          : 'Browser-owned synths for playing and shaping directly. Nothing here edits the score.' }</p></div>
      <div className="liveRackActions">
        <span>{ hosted
          ? `${ hostedState?.status ?? 'disconnected' } · ${ hostedState?.readiness?.engine ?? 'unknown' } · ${ rackNodeCount } live`
          : `${ sc.status } · ${ sc.audioContextState } · ${ rackNodeCount } live` }</span>
        { !hosted && <button disabled={ Boolean( busy ) || sc.status === 'loading' || sc.status === 'booting' }
          onClick={ () => act( 'prepare', prepare ) }>{ sc.isBooted ? 'Resume audio' : 'Prepare audio' }</button> }
        <button disabled={ rackNodeCount === 0 } onClick={ () => act( 'release-all', () => allAction( 'release' ) ) }>Release all live</button>
        <button disabled={ rackNodeCount === 0 } onClick={ () => act( 'free-all', () => allAction( 'free' ) ) }>Free all live</button>
      </div>
    </header>
    { hosted && <p className="liveRackBoundary">Hosted mode never boots the browser audio engine. These controls address the desktop ToolInstance; its Synths are tracked by NodeManager when tracking is enabled.</p> }
    { message && <p className="liveRackMessage">{ message }</p> }
    { ( error || ( !hosted && sc.error ) ) && <p className="error">{ error || sc.error }</p> }
    { hosted && <HostedSynthDefLibrary hostedClient={ hostedClient } hostedState={ hostedState } /> }
    <EnvelopeLab sc={ sc } hosted={ hosted } hostedClient={ hostedClient }
      hostedState={ hostedState } prepareAudio={ prepare } />
    { hosted && <h2 className="instrumentSectionTitle">Curated instruments</h2> }
    { !manifest && !error
      ? <p className="emptyState">Reading the compiled instrument library…</p>
      : <div className="instrumentGrid">{ instruments.map( ( instrument ) => {
        const hostInventory = hostedState?.synthDefContext?.inventory;
        const effectiveInstrument = hosted ? { ...instrument,
          available: Array.isArray( hostInventory ) && hostInventory.includes( instrument.definition ) }
          : instrument;
        const hostedNode = hostedNodes[ instrument.key ];
        const node = hosted ? hostedNode && {
          paused: hostedNode.state === 'paused', released: hostedNode.state === 'releasing'
        } : sc.nodes[ instrument.definition ];
        return <LiveInstrument key={ instrument.key } instrument={ effectiveInstrument }
          hosted={ hosted }
          values={ params[ instrument.definition ] ?? initialLiveInstrumentParams( instrument ) }
          node={ node }
          busy={ Boolean( busy ) }
          onStart={ () => act( instrument.key, () => startInstrument( instrument ) ) }
          onPause={ () => act( instrument.key, () => instrumentAction( instrument, 'pause' ) ) }
          onResume={ () => act( instrument.key, () => instrumentAction( instrument, 'resume' ) ) }
          onRelease={ () => act( instrument.key, () => instrumentAction( instrument, 'release' ) ) }
          onFree={ () => act( instrument.key, () => instrumentAction( instrument, 'free' ) ) }
          onReset={ () => resetInstrument( instrument ) }
          onChange={ ( control, value ) => updateParam( instrument, control, value ) } />;
      } ) }</div> }
  </div>;
}

function EnvelopeLab( { sc, hosted, hostedClient, hostedState, prepareAudio } ) {
  const [ envelope, setEnvelope ] = useState( defaultEditableEnvelope );
  const [ freq, setFreq ] = useState( 220 );
  const [ amp, setAmp ] = useState( 0.1 );
  const [ busy, setBusy ] = useState( false );
  const [ error, setError ] = useState( '' );
  const definition = 'awbEnvelopeLab';
  const instrumentID = 'envelope-lab';
  const hostedNode = hostedState?.liveInstruments?.[ instrumentID ];
  const standaloneNode = sc.nodes[ definition ];
  const node = hosted ? hostedNode : standaloneNode;
  const available = hosted
    ? hostedState?.synthDefContext?.inventory?.includes( definition )
    : true;

  async function stop() {
    if ( hostedNode ) await hostedClient.instrumentCommand( 'free', instrumentID, definition );
    else if ( standaloneNode ) sc.freeSynth( definition );
  }

  async function audition() {
    setBusy( true );
    setError( '' );
    try {
      await stop();
      const array = [ ...scEnvAsControlArray( envelope, 4 ) ];
      if ( hosted ) {
        if ( !available ) throw new Error( 'The editable envelope SynthDef is not installed in desktop SuperCollider.' );
        await hostedClient.instrumentCommand( 'start', instrumentID, definition, { gate: 0, freq, amp } );
        await hostedClient.instrumentArrayCommand( instrumentID, definition, 'env', array );
        await hostedClient.instrumentCommand( 'set', instrumentID, definition, { gate: 1 } );
      } else {
        await prepareAudio();
        await loadEnvelopeLabSynthDef( sc );
        sc.playSynth( definition, { gate: 0, freq, amp } );
        sc.setSynthArray( definition, 'env', array );
        sc.setSynth( definition, { gate: 1 } );
      }
    } catch ( nextError ) { setError( nextError.message ); }
    finally { setBusy( false ); }
  }

  return <section className="envelopeLab">
    <header><div><h2>Envelope lab</h2><p>Explicit four-stage Env-array instrument · changes are auditioned on a fresh Synth.</p></div>
      <div className="envelopeLabTone">
        <label>frequency<input type="number" min="20" max="20000" step="1" value={ freq }
          onChange={ ( event ) => setFreq( Number( event.target.value ) ) } /></label>
        <label>amplitude<input type="number" min="0" max="0.5" step="0.01" value={ amp }
          onChange={ ( event ) => setAmp( Number( event.target.value ) ) } /></label>
        <button disabled={ !node || busy } onClick={ () => stop().catch( ( nextError ) => setError( nextError.message ) ) }>Stop</button>
      </div>
    </header>
    <EnvelopeEditor value={ envelope } onChange={ setEnvelope } maxSegments={ 4 }
      disabled={ busy || ( hosted && !available ) } onAudition={ audition } auditioning={ Boolean( node ) } />
    { hosted && !available && <p className="boundaryNote">Reopen Score Studio from desktop SuperCollider after recompiling its class library so the support SynthDef is installed.</p> }
    { error && <p className="error">{ error }</p> }
  </section>;
}

function HostedSynthDefLibrary( { hostedClient, hostedState } ) {
  const [ query, setQuery ] = useState( '' );
  const [ selected, setSelected ] = useState( '' );
  const [ loading, setLoading ] = useState( false );
  const [ error, setError ] = useState( '' );
  const context = hostedState?.synthDefContext;
  const inventory = context?.inventory ?? [];
  const filtered = useMemo( () => {
    const needle = query.trim().toLocaleLowerCase();
    return needle ? inventory.filter( ( name ) => name.toLocaleLowerCase().includes( needle ) ) : inventory;
  }, [ inventory, query ] );
  const description = selected ? context?.definitions?.[ selected ] : null;

  useEffect( () => {
    if ( context?.status !== 'connected' ) return undefined;
    let live = true;
    let refreshing = false;
    const refresh = async () => {
      if ( !live || refreshing ) return;
      refreshing = true;
      try { await hostedClient.listSynthDefs(); if ( live ) setError( '' ); }
      catch ( nextError ) { if ( live ) setError( nextError.message ); }
      finally { refreshing = false; }
    };
    const onFocus = () => refresh();
    const onVisibility = () => { if ( document.visibilityState === 'visible' ) refresh(); };
    refresh();
    const timer = setInterval( refresh, 5000 );
    window.addEventListener( 'focus', onFocus );
    document.addEventListener( 'visibilitychange', onVisibility );
    return () => {
      live = false;
      clearInterval( timer );
      window.removeEventListener( 'focus', onFocus );
      document.removeEventListener( 'visibilitychange', onVisibility );
    };
  }, [ context?.status, hostedClient ] );

  useEffect( () => {
    if ( selected && !inventory.includes( selected ) ) setSelected( '' );
  }, [ inventory, selected ] );

  async function selectDefinition( name, force = false ) {
    setSelected( name );
    setError( '' );
    if ( context?.definitions?.[ name ] && !force ) return;
    setLoading( true );
    try {
      if ( force ) await hostedClient.listSynthDefs();
      if ( !hostedClient.getState().synthDefContext.inventory?.includes( name ) ) {
        throw new Error( `SynthDef \\${ name } is no longer in the desktop context.` );
      }
      await hostedClient.describeSynthDef( name );
    }
    catch ( nextError ) { setError( nextError.message ); }
    finally { setLoading( false ); }
  }

  return <section className="hostedSynthLibrary">
    <header><div><h2>Desktop SynthDefs</h2><p>{ inventory.length } available · models load when selected</p></div>
      <button disabled={ context?.status !== 'connected' }
        onClick={ () => hostedClient.listSynthDefs().catch( ( nextError ) => setError( nextError.message ) ) }>Refresh</button></header>
    <div className="hostedSynthLibraryBody">
      <div className="hostedSynthList">
        <input aria-label="Filter desktop SynthDefs" type="search" value={ query }
          placeholder="Filter SynthDefs" onChange={ ( event ) => setQuery( event.target.value ) } />
        <div role="listbox" aria-label="Desktop SynthDefs">
          { filtered.map( ( name ) => <button key={ name } role="option" aria-selected={ selected === name }
            className={ selected === name ? 'selected' : '' } onClick={ () => selectDefinition( name ) }>
            <code>\{ name }</code>{ context?.definitions?.[ name ] && <span>modelled</span> }
          </button> ) }
          { context?.status === 'connected' && filtered.length === 0
            && <p>{ inventory.length ? 'No matching SynthDefs.' : 'No SynthDefs reported.' }</p> }
        </div>
      </div>
      <SynthDefSummary name={ selected } description={ description } loading={ loading }
        onReload={ () => selectDefinition( selected, true ) } />
    </div>
    { error && <p className="error">{ error }</p> }
  </section>;
}

function SynthDefSummary( { name, description, loading, onReload } ) {
  if ( !name ) return <div className="synthDefSummary empty">Select a SynthDef to inspect its compiled model.</div>;
  if ( loading && !description ) return <div className="synthDefSummary empty">Building <code>\{ name }</code>…</div>;
  if ( !description ) return <div className="synthDefSummary empty">No model loaded for <code>\{ name }</code>.</div>;
  const model = description.interface;
  return <div className="synthDefSummary">
    <header><div><h3>\{ name }</h3><code>{ description.fingerprint }</code></div>
      <div><span>{ model.controls.length } controls · { model.ugens.length } UGens</span>
        <button disabled={ loading } onClick={ onReload }>Reload model</button></div></header>
    <div className="synthDefControlList">{ model.controls.map( ( control ) => <div key={ control.name }>
      <code>{ control.name }</code><span>default { formatNumber( control.default ) }</span>
      <small>{ control.spec?.unit || control.roles.join( ', ' ) || control.rate }</small>
    </div> ) }</div>
  </div>;
}

function LiveInstrument( {
  instrument, values, node, busy, hosted, onStart, onPause, onResume, onRelease, onFree, onReset, onChange
} ) {
  const state = !node ? 'idle' : node.released ? 'releasing' : node.paused ? 'paused' : 'running';
  const amplitudeEnvelope = instrumentEnvelopes( instrument.key, values )
    .find( ( envelope ) => envelope.role === 'amplitude' );
  const attack = amplitudeEnvelope?.attack;
  const stateLabel = state === 'running' && Number.isFinite( attack ) && attack > 0
    ? `${ state } · ${ formatDuration( attack ) } attack`
    : state;
  return <section className={ `liveInstrument ${ state }` }>
    <header><div><h2>{ instrument.label }</h2><code>\{ instrument.definition }</code></div>
      <span>{ stateLabel }</span></header>
    <div className="liveInstrumentActions">
      <button aria-label={ `Start ${ instrument.label }` } disabled={ busy || !instrument.available || Boolean( node ) }
        onClick={ onStart }>Start</button>
      <button disabled={ !node || node.released } onClick={ node?.paused ? onResume : onPause }>
        { node?.paused ? 'Resume' : 'Pause' }</button>
      <button aria-label={ `Release ${ instrument.label }` } disabled={ !node || node.released }
        onClick={ onRelease }>Release</button>
      <button aria-label={ `Free ${ instrument.label }` } disabled={ !node } onClick={ onFree }>Free</button>
      <button disabled={ busy } onClick={ onReset }>Reset</button>
    </div>
    { !instrument.available && <p className="error">{ hosted
      ? 'SynthDef is not installed in the desktop SuperCollider context.'
      : 'SynthDef is not installed in this browser bundle.' }</p> }
    { amplitudeEnvelope && <p className="liveEnvelopeSummary">Amplitude envelope: { formatDuration( amplitudeEnvelope.attack ) } attack
      { amplitudeEnvelope.release !== null && <> · { formatDuration( amplitudeEnvelope.release ) } release</> }</p> }
    <div className="liveControls">{ instrument.controls.map( ( control ) => (
      <LiveControl key={ control.name } control={ control } value={ values[ control.name ] }
        disabled={ Boolean( node?.released ) } onChange={ ( value ) => onChange( control, value ) } />
    ) ) }</div>
    { instrument.note && <p className="boundaryNote">{ instrument.note }</p> }
  </section>;
}

function LiveControl( { control, value, disabled, onChange } ) {
  const label = control.editor?.label ?? control.name;
  const resolvedValue = value ?? control.default ?? '';
  if ( control.editor?.kind === 'boolean' ) {
    return <label className="liveBoolean"><span>{ label }<small>{ control.name }</small></span>
      <input aria-label={ `Live ${ control.name }` } type="checkbox" checked={ Boolean( resolvedValue ) }
        disabled={ disabled } onChange={ ( event ) => onChange( event.target.checked ? 1 : 0 ) } /></label>;
  }
  const editor = control.editor;
  return <label className="liveControl"><span>{ label }<small>{ control.name } · default { formatNumber( control.synthDefault ) }</small></span>
    <div>{ editor?.kind === 'number' && <input aria-label={ `Live ${ control.name } slider` } type="range"
      min={ editor.min } max={ editor.max } step={ editor.step } value={ resolvedValue } disabled={ disabled }
      onChange={ ( event ) => onChange( Number( event.target.value ) ) } /> }
      <input aria-label={ `Live ${ control.name }` } type="number" step={ editor?.step ?? 'any' }
        min={ editor?.min } max={ editor?.max } value={ resolvedValue } disabled={ disabled }
        onChange={ ( event ) => {
          const next = Number( event.target.value );
          if ( Number.isFinite( next ) ) onChange( next );
        } } />
      { editor?.unit && <em>{ editor.unit }</em> }</div>
  </label>;
}

function formatNumber( value ) {
  return typeof value === 'number' ? String( Number( value.toPrecision( 7 ) ) ) : String( value );
}

function formatDuration( value ) {
  return Number.isFinite( value ) ? `${ formatNumber( value ) }s` : 'unknown';
}
