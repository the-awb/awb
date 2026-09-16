import { useEffect, useMemo, useState } from 'react';
import { loadSynthDefManifest } from '@awb/sc-wasm/core';
import { liveInstrumentLibrary, initialLiveInstrumentParams } from '../engine/liveInstrumentLibrary.js';
import { synthDefManifestUrl } from '../engine/scAssets.js';
import { loadInstrumentLibrarySynthDefs } from '../engine/standaloneSynthDefs.js';

export default function InstrumentWorkspace( { sc, mode } ) {
  const [ manifest, setManifest ] = useState( null );
  const [ params, setParams ] = useState( {} );
  const [busy, setBusy] = useState( '' );
  const [message, setMessage] = useState( '' );
  const [error, setError] = useState( '' );
  const instruments = useMemo( () => manifest ? liveInstrumentLibrary( manifest ) : [], [ manifest ] );
  const rackNodeCount = instruments.filter( ( instrument ) => sc.nodes[ instrument.definition ] ).length;

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
    if ( sc.nodes[ instrument.definition ] && !sc.nodes[ instrument.definition ].released ) {
      sc.setSynth( instrument.definition, { [ control.name ]: value } );
    }
  }

  function resetInstrument( instrument ) {
    const next = initialLiveInstrumentParams( instrument );
    setParams( ( current ) => ( { ...current, [ instrument.definition ]: next } ) );
    if ( sc.nodes[ instrument.definition ] && !sc.nodes[ instrument.definition ].released ) {
      sc.setSynth( instrument.definition, next );
    }
  }

  function releaseAll() {
    for ( const instrument of instruments ) sc.releaseSynth( instrument.definition );
  }

  function freeAll() {
    for ( const instrument of instruments ) sc.freeSynth( instrument.definition );
  }

  return <div className="instrumentWorkspace">
    <header className="instrumentWorkspaceHeader">
      <div><h1>Live instruments</h1>
        <p>Browser-owned synths for playing and shaping directly. Nothing here edits the score.</p></div>
      <div className="liveRackActions">
        <span>{ sc.status } · { sc.audioContextState } · { rackNodeCount } live</span>
        <button disabled={ Boolean( busy ) || sc.status === 'loading' || sc.status === 'booting' }
          onClick={ () => act( 'prepare', prepare ) }>{ sc.isBooted ? 'Resume audio' : 'Prepare audio' }</button>
        <button disabled={ rackNodeCount === 0 } onClick={ releaseAll }>Release all live</button>
        <button disabled={ rackNodeCount === 0 } onClick={ freeAll }>Free all live</button>
      </div>
    </header>
    { mode === 'hosted' && <p className="liveRackBoundary">This rack is browser-local even while score transport is hosted. Desktop live instruments belong on the NodeManager control route, not the score timeline bridge.</p> }
    { message && <p className="liveRackMessage">{ message }</p> }
    { ( error || sc.error ) && <p className="error">{ error || sc.error }</p> }
    { !manifest && !error
      ? <p className="emptyState">Reading the compiled instrument library…</p>
      : <div className="instrumentGrid">{ instruments.map( ( instrument ) => (
        <LiveInstrument key={ instrument.key } instrument={ instrument }
          values={ params[ instrument.definition ] ?? initialLiveInstrumentParams( instrument ) }
          node={ sc.nodes[ instrument.definition ] }
          busy={ Boolean( busy ) }
          onStart={ () => act( instrument.key, async () => {
            await prepare();
            sc.playSynth( instrument.definition,
              params[ instrument.definition ] ?? initialLiveInstrumentParams( instrument ) );
          } ) }
          onPause={ () => sc.pauseSynth( instrument.definition ) }
          onResume={ () => sc.resumeSynth( instrument.definition ) }
          onRelease={ () => sc.releaseSynth( instrument.definition ) }
          onFree={ () => sc.freeSynth( instrument.definition ) }
          onReset={ () => resetInstrument( instrument ) }
          onChange={ ( control, value ) => updateParam( instrument, control, value ) } />
      ) ) }</div> }
  </div>;
}

function LiveInstrument( {
  instrument, values, node, busy, onStart, onPause, onResume, onRelease, onFree, onReset, onChange
} ) {
  const state = !node ? 'idle' : node.released ? 'releasing' : node.paused ? 'paused' : 'running';
  return <section className={ `liveInstrument ${ state }` }>
    <header><div><h2>{ instrument.label }</h2><code>\{ instrument.definition }</code></div>
      <span>{ state }</span></header>
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
    { !instrument.available && <p className="error">SynthDef is not installed in this browser bundle.</p> }
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
