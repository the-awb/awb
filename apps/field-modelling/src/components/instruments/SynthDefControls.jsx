import { useMemo, useState } from 'react';
import { instrumentType } from '@awb/instruments';
import { additionalSynthDefControls, curatedControlNames } from '../../engine/instrumentPresentation.js';

const displayDefault = ( value ) => Array.isArray( value ) ? value.join( ', ' ) : `${ value ?? '' }`;

// Field-specific presentation of the controls which are real on the SynthDef but are not part of
// the curated acoustic model. The host supplies the shared SynthDef description; this component
// performs no discovery and has no SuperCollider transport.
export default function SynthDefControls( { instrument, speakers, synthDefInterface, dispatch } ) {
  const [ open, setOpen ] = useState( false );
  const descriptor = instrumentType( instrument.type );
  const curated = useMemo( () => curatedControlNames( instrument, speakers ), [ instrument, speakers ] );
  const controls = useMemo( () => additionalSynthDefControls( synthDefInterface, {
    curated, gainControl: descriptor?.gainControl ?? null
  } ), [ synthDefInterface, curated, descriptor?.gainControl ] );

  if ( !descriptor?.synthDef ) {
    return <p className="note">No SynthDef is associated with this field model.</p>;
  }
  if ( !synthDefInterface || controls.length === 0 ) return null;

  return <>
    <h2 style={ { marginTop: 16, display: 'flex', alignItems: 'center', gap: 6 } }>
      <button onClick={ () => setOpen( !open ) }
        title={ open ? 'Hide additional controls' : `Show ${ controls.length } additional controls` }
        style={ { background: 'none', border: 'none', color: '#777', cursor: 'pointer', padding: 0, fontSize: 10 } }>
        { open ? '▾' : '▸' }
      </button>
      <span>{ synthDefInterface.name }</span>
      <span className="note" style={ { margin: 0, fontWeight: 'normal' } }>{ controls.length } more</span>
    </h2>
    { open && <>
      <p className="note" style={ { marginTop: 0 } }>
        These controls affect the synth but have no declared Field projection. Blank values retain
        the SynthDef default.
      </p>
      { controls.map( ( control ) => {
        const set = Object.hasOwn( instrument.params, control.name );
        const multi = control.numChannels > 1;
        return <div className="row" key={ control.name }>
          <label title={ `${ control.name }${ control.roles?.length ? ` · ${ control.roles.join( ', ' ) }` : '' }` }>
            { control.name }{ multi ? `[${ control.numChannels }]` : '' }
          </label>
          <input type={ multi ? 'text' : 'number' } step="any" readOnly={ multi }
            value={ multi ? displayDefault( instrument.params[ control.name ] ?? control.default )
              : ( set ? instrument.params[ control.name ] : '' ) }
            placeholder={ displayDefault( control.default ) }
            title={ multi ? 'Multichannel editing requires an explicit array-control command.' : undefined }
            onChange={ ( event ) => {
              if ( multi ) return;
              const raw = event.target.value;
              if ( raw === '' ) dispatch( { type: 'CLEAR_INSTRUMENT_PARAM', id: instrument.id, name: control.name } );
              else if ( Number.isFinite( Number( raw ) ) ) dispatch( {
                type: 'UPDATE_INSTRUMENT_PARAM', id: instrument.id, path: [ control.name ], value: Number( raw )
              } );
            } }
            style={ { width: 90, background: '#222', color: multi || !set ? '#777' : '#ccc',
              border: '1px solid #444', borderRadius: 3, padding: '1px 4px', fontSize: 11,
              fontFamily: 'monospace' } } />
        </div>;
      } ) }
    </> }
  </>;
}
