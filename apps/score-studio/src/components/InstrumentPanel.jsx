import { useEffect, useMemo, useState } from 'react';
import { loadSynthDefManifest, settableControls } from '@awb/sc-wasm/core';
import { synthDefManifestUrl } from '../engine/scAssets.js';
import { scoreInstruments } from '../engine/scoreInstruments.js';

const displayTarget = ( target ) => Array.isArray( target ) ? target.join( ', ' ) : target;
const displayDefault = ( value ) => typeof value === 'number'
  ? String( Number( value.toPrecision( 7 ) ) ) : String( value );

export default function InstrumentPanel( { document, mode, standaloneDefinitions, hostedSynthDefs } ) {
  const instruments = useMemo( () => scoreInstruments( document ), [ document ] );
  const [ definitions, setDefinitions ] = useState( null );
  const [ manifestError, setManifestError ] = useState( '' );

  useEffect( () => {
    let live = true;
    loadSynthDefManifest( synthDefManifestUrl() ).then(
      ( manifest ) => { if ( live ) setDefinitions( manifest ); },
      ( error ) => { if ( live ) setManifestError( error.message ); }
    );
    return () => { live = false; };
  }, [] );

  return (
    <section className="instrumentPanel">
      <div className="panelHeading">
        <h2>Instruments</h2>
        <span>{ instruments.length }</span>
      </div>
      { instruments.length === 0
        ? <p className="emptyCopy">This score does not reference a SynthDef.</p>
        : instruments.map( ( instrument ) => {
          const definition = definitions?.get( instrument.definition );
          const hostedDefinition = hostedSynthDefs?.definitions?.[ instrument.definition ];
          const hostedControls = hostedDefinition?.interface.controls ?? [];
          const hostInventoryKnown = Array.isArray( hostedSynthDefs?.inventory );
          const hostedContextAvailable = hostedSynthDefs?.status === 'connected' || hostInventoryKnown;
          const controls = mode === 'hosted' && hostedContextAvailable
            ? hostedControls
            : definition ? settableControls( definition ) : [];
          const currentStandalone = standaloneDefinitions.scoreID === document.scoreID
            && standaloneDefinitions.revision === document.revision;
          const missingStandalone = currentStandalone
            && standaloneDefinitions.missing.includes( instrument.definition );
          const hostHasDefinition = hostedSynthDefs?.inventory?.includes( instrument.definition );
          const runtimeStatus = mode === 'hosted'
            ? !hostedContextAvailable ? ( definition ? 'desktop unavailable · browser bundle available' : 'desktop context unavailable' )
              : hostedDefinition ? 'described by desktop host'
              : hostInventoryKnown && hostHasDefinition ? 'available; description pending'
                : hostInventoryKnown ? 'not in desktop context' : 'desktop context not queried'
            : missingStandalone ? 'missing from standalone'
              : currentStandalone && standaloneDefinitions.state === 'ready' ? 'loaded standalone'
                : !definitions ? ( manifestError ? 'bundle manifest unavailable' : 'checking browser bundle' )
                  : definition ? 'available to standalone' : 'not in browser bundle';
          const bundleStatus = !definitions
            ? ( manifestError ? 'manifest unavailable' : 'checking…' )
            : definition ? 'installed' : 'not installed';
          return (
            <details className="instrumentCard" key={ instrument.definition }>
              <summary>
                <span><strong>\{ instrument.definition }</strong><small>{ instrument.label }</small></span>
                <span className={ `definitionStatus ${ missingStandalone || ( definitions && !definition ) ? 'missing' : '' }` }>
                  { instrument.noteCount } note{ instrument.noteCount === 1 ? '' : 's' }
                  { definitions && !definition ? ' · not bundled' : '' }
                </span>
              </summary>
              <dl className="identity compact instrumentIdentity">
                <dt>Catalog</dt><dd>{ instrument.catalogKey ?? 'uncatalogued' }</dd>
                <dt>Browser</dt><dd>{ bundleStatus }</dd>
                <dt>Runtime</dt><dd>{ runtimeStatus }</dd>
                { hostedDefinition && <><dt>Graph</dt><dd>{ hostedDefinition.fingerprint.slice( 0, 18 ) }…</dd></> }
                <dt>Entries</dt><dd>{ instrument.entryCount }</dd>
                <dt>Span</dt><dd>{ instrument.firstTime.toFixed( 3 ) }–{ instrument.lastTime.toFixed( 3 ) } s</dd>
                <dt>Paths</dt><dd>{ instrument.paths.length ? instrument.paths.join( ', ' ) : 'root' }</dd>
              </dl>
              <InstrumentList label="Authored controls" values={ instrument.authoredControls } empty="none" />
              <InstrumentList label="SynthDef controls"
                values={ controls.map( ( control ) => `${ control.name}=${ displayDefault( control.default ) }${ control.roles?.length ? ` · ${ control.roles.join( ', ' ) }` : '' }` ) }
                empty={ mode === 'hosted' && hostedContextAvailable
                  ? ( hostedSynthDefs?.error || ( hostHasDefinition ? 'reading desktop graph…' : 'definition not in desktop context' ) )
                  : manifestError || ( definitions ? 'definition not in browser bundle' : 'reading manifest…' ) } />
              { instrument.envelopes.length > 0 && <div className="instrumentDetails">
                <h3>Envelopes</h3>
                <ul>{ instrument.envelopes.map( ( envelope ) => (
                  <li key={ envelope.id }><strong>{ envelope.label }</strong>
                    <span>{ envelope.role } → { displayTarget( envelope.target ) }
                      { envelope.completionAction ? ` · ${ envelope.completionAction }` : '' }</span></li>
                ) ) }</ul>
              </div> }
              { instrument.note && <p className="boundaryNote">{ instrument.note }</p> }
            </details>
          );
        } ) }
      <p className="boundaryNote">The score determines which definitions matter. In hosted mode, controls and functional roles come from the desktop context’s exact compiled graph and specs; the catalog is only an optional shared-context overlay.</p>
    </section>
  );
}

function InstrumentList( { label, values, empty } ) {
  return <div className="instrumentDetails"><h3>{ label }</h3>
    { values.length ? <div className="instrumentTags">{ values.map( ( value ) => <code key={ value }>{ value }</code> ) }</div>
      : <p>{ empty }</p> }
  </div>;
}
