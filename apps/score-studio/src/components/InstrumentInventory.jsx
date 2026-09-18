import { useEffect, useMemo, useRef, useState } from 'react';
import { loadSynthDefManifest } from '@awb/sc-wasm/core';
import {
  buildInstrumentInventory, shouldRefreshHostedSynthDefFocus, synthDefSignalKind
} from '../engine/instrumentInventory.js';
import { scoreInstruments } from '../engine/scoreInstruments.js';
import { synthDefManifestUrl } from '../engine/scAssets.js';
import { describeStandaloneSynthDef } from '../engine/standaloneSynthDefs.js';
import { formatScSymbol } from '../engine/scValueSyntax.js';

export default function InstrumentInventory( {
  document, focusedContextGeneration, focusedInitialValues, focusedName, focusedSource,
  hostedClient, hostedContext, mode, onFocus
} ) {
  const [ query, setQuery ] = useState( '' );
  const [ manifest, setManifest ] = useState( null );
  const [ localDefinitions, setLocalDefinitions ] = useState( {} );
  const [ loading, setLoading ] = useState( '' );
  const [ error, setError ] = useState( '' );
  const [ changed, setChanged ] = useState( new Set() );
  const fingerprints = useRef( new Map() );
  const selectionRequest = useRef( 0 );
  const hosted = mode === 'hosted';
  const scoreDefinitions = useMemo(
    () => scoreInstruments( document ).map( ( instrument ) => instrument.definition ), [ document ]
  );
  const availableNames = hosted ? ( hostedContext?.inventory ?? [] ) : [ ...( manifest?.keys() ?? [] ) ];
  const admittedDefinitions = hosted ? ( hostedContext?.definitions ?? {} ) : localDefinitions;
  const rows = useMemo( () => buildInstrumentInventory( {
    scoreDefinitions, admittedDefinitions, availableNames
  } ), [ admittedDefinitions, availableNames, scoreDefinitions ] );
  const filtered = useMemo( () => {
    const needle = query.trim().toLocaleLowerCase();
    return needle ? rows.filter( ( row ) => row.name.toLocaleLowerCase().includes( needle ) ) : rows;
  }, [ query, rows ] );

  useEffect( () => {
    let live = true;
    loadSynthDefManifest( synthDefManifestUrl() ).then(
      ( value ) => { if ( live ) setManifest( value ); },
      ( nextError ) => { if ( live ) setError( nextError.message ); }
    );
    return () => { live = false; };
  }, [] );

  useEffect( () => {
    if ( !hosted || hostedContext?.status !== 'connected' ) return;
    let live = true;
    hostedClient.listSynthDefs().then(
      () => { if ( live ) setError( '' ); },
      ( nextError ) => { if ( live ) setError( nextError.message ); }
    );
    return () => { live = false; };
  }, [ hosted, hostedClient, hostedContext?.generation, hostedContext?.status ] );

  useEffect( () => {
    selectionRequest.current += 1;
    setLoading( '' );
  }, [ hosted, hostedContext?.generation ] );

  useEffect( () => {
    const nextChanged = new Set( changed );
    for ( const [ name, description ] of Object.entries( admittedDefinitions ) ) {
      const previous = fingerprints.current.get( name );
      if ( previous && previous !== description.fingerprint ) nextChanged.add( name );
      fingerprints.current.set( name, description.fingerprint );
    }
    if ( nextChanged.size !== changed.size ) setChanged( nextChanged );
  }, [ admittedDefinitions, changed ] );

  useEffect( () => {
    if ( !hosted || !shouldRefreshHostedSynthDefFocus( {
      focusedName, focusedSource, focusedContextGeneration, hostedContext
    } ) ) return;
    if ( !hostedContext.inventory.includes( focusedName ) ) {
      selectionRequest.current += 1;
      setLoading( '' );
      const message = `SynthDef \\${ focusedName } is missing from the refreshed hosted context.`;
      setError( message );
      onFocus( {
        name: focusedName, description: null,
        contextGeneration: hostedContext.generation,
        signalKind: 'unknown', source: 'hosted context', error: message
      } );
      return;
    }
    select( { name: focusedName }, true, focusedInitialValues );
  }, [ focusedContextGeneration, focusedInitialValues, focusedName, focusedSource, hosted,
    hostedContext?.generation, hostedContext?.inventory, hostedContext?.status ] );

  async function select( row, force = false, initialValues = null ) {
    const request = ++selectionRequest.current;
    const isCurrent = () => selectionRequest.current === request;
    const startingGeneration = hosted
      ? hostedClient.getState().synthDefContext.generation : 0;
    setLoading( row.name );
    setError( '' );
    try {
      let description;
      let contextGeneration;
      if ( hosted ) {
        if ( hostedContext?.status !== 'connected' ) throw new Error( 'The hosted SynthDef context is not connected.' );
        const startingContext = hostedClient.getState().synthDefContext;
        contextGeneration = startingContext.generation;
        if ( !startingContext.inventory?.includes( row.name ) ) {
          throw new Error( `SynthDef \\${ row.name } is missing from the hosted context.` );
        }
        const cached = startingContext.definitions[ row.name ];
        description = !force && cached?.contextGeneration === contextGeneration
          ? cached
          : await hostedClient.describeSynthDef( row.name );
        if ( !isCurrent() ) return;
        if ( hostedClient.getState().synthDefContext.generation !== contextGeneration ) return;
      } else {
        if ( !manifest ) throw new Error( 'The browser SynthDef manifest is not ready.' );
        description = !force && localDefinitions[ row.name ]
          ? localDefinitions[ row.name ]
          : await describeStandaloneSynthDef( row.name, manifest );
        if ( !isCurrent() ) return;
        contextGeneration = 0;
        setLocalDefinitions( ( current ) => ( { ...current, [ row.name ]: description } ) );
      }
      if ( !isCurrent() ) return;
      onFocus( {
        name: row.name, description, contextGeneration,
        signalKind: synthDefSignalKind( description ),
        source: hosted ? 'hosted context' : 'browser bundle', initialValues
      } );
    } catch ( nextError ) {
      if ( !isCurrent() ) return;
      if ( hosted && hostedClient.getState().synthDefContext.generation !== startingGeneration ) return;
      setError( nextError.message );
      onFocus( {
        name: row.name, description: null,
        contextGeneration: hosted ? startingGeneration : 0,
        signalKind: 'unknown', source: hosted ? 'hosted context' : 'browser bundle', error: nextError.message
      } );
    } finally { if ( isCurrent() ) setLoading( '' ); }
  }

  async function refresh() {
    setError( '' );
    try {
      if ( hosted ) await hostedClient.listSynthDefs();
      if ( focusedName ) {
        const row = rows.find( ( item ) => item.name === focusedName );
        if ( row ) await select( row, true );
      }
    } catch ( nextError ) { setError( nextError.message ); }
  }

  let lastCategory = null;
  return <section className="instrumentInventory">
    <div className="inventoryTools">
      <input aria-label="Search instruments" type="search" value={ query }
        placeholder="Search SynthDefs" onChange={ ( event ) => setQuery( event.target.value ) } />
      <button disabled={ hosted && hostedContext?.status !== 'connected' } onClick={ refresh }>Refresh</button>
    </div>
    <p className="inventorySummary">{ rows.length } known · compiled models load on selection</p>
    <div className="instrumentInventoryList" role="listbox" aria-label="Instrument inventory">
      { filtered.map( ( row ) => {
        const showCategory = row.category !== lastCategory;
        lastCategory = row.category;
        return <div key={ row.name }>
          { showCategory && <h3>{ row.category === 'score' ? 'In score' : row.category }</h3> }
          <button role="option" aria-selected={ focusedName === row.name }
            className={ focusedName === row.name ? 'selected' : '' }
            onClick={ () => select( row ) }>
            <span><code>{ formatScSymbol( row.name ) }</code><small>{ row.category === 'available' ? 'system / context' : row.category }</small></span>
            <span className="inventoryBadges">
              { loading === row.name && <em>loading</em> }
              { row.modelled && <em>modelled</em> }
              { row.signalKind !== 'unknown' && <em className={ row.signalKind === 'audio' ? '' : 'nonAudio' }>{ row.signalKind }</em> }
              { changed.has( row.name ) && <em>changed</em> }
              { !row.available && <em className="missing">missing</em> }
            </span>
          </button>
        </div>;
      } ) }
      { filtered.length === 0 && <p className="emptyCopy">No matching SynthDefs.</p> }
    </div>
    { error && <p className="error">{ error }</p> }
  </section>;
}
