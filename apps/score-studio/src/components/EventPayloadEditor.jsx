import { INSTRUMENT_CATALOG } from '@awb/instruments';
import ControlSlider from './ControlSlider.jsx';
import { useEffect, useState } from 'react';
import { payloadFieldPlaceholder, payloadFields, updatePayloadField } from '../engine/eventPayloadFields.js';
import { mergeSynthDefNames } from '../engine/instrumentInventory.js';
import { formatScValue, parseScValue } from '../engine/scValueSyntax.js';

const COMMON_TYPES = [ 'note', 'set', 'release', 'free' ];

export default function EventPayloadEditor( {
  event, inheritedDefinition = null, inheritedValues = null, availableSynthDefs = [], onChange
} ) {
  if ( !event ) return <p className="typedPayloadUnavailable">Fix the raw JSON to use typed controls.</p>;
  const fields = payloadFields( event, inheritedDefinition, inheritedValues );
  const selectedSynthDef = event.def ?? event.instrument ?? '';
  const synthDefs = mergeSynthDefNames(
    Object.values( INSTRUMENT_CATALOG ).map( ( descriptor ) => descriptor.synthDef ),
    availableSynthDefs,
    selectedSynthDef
  );
  const update = ( name, value, kind = 'text' ) => onChange( updatePayloadField( event, name, value, kind ) );

  return (
    <fieldset className="typedPayload">
      <legend>Payload controls</legend>
      <div className="payloadFieldGrid">
        <label className="controlRow"><span className="controlRowName"><code>type</code></span>
          <input aria-label="Event type" list="score-event-types" value={ event.type ?? '' }
            onChange={ ( change ) => update( 'type', change.target.value ) } />
          <datalist id="score-event-types">
            { COMMON_TYPES.map( ( type ) => <option key={ type } value={ type } /> ) }
          </datalist>
        </label>
        { event.type === 'note' && <label className="controlRow"><span className="controlRowName"><code>def</code></span>
          <select aria-label="Event SynthDef" value={ selectedSynthDef }
            onChange={ ( change ) => update( event.def !== undefined ? 'def' : 'instrument', change.target.value ) }>
            { synthDefs.map( ( synthDef ) => <option key={ synthDef } value={ synthDef }>{ synthDef }</option> ) }
          </select>
        </label> }
        { [ 'set', 'release', 'free' ].includes( event.type ) && !Array.isArray( event.target ) && <label className="controlRow"><span className="controlRowName"><code>target</code></span>
          <input aria-label="Event target" value={ event.target ?? '' }
            onChange={ ( change ) => update( 'target', change.target.value ) } />
        </label> }
        { fields.map( ( field ) => field.kind === 'boolean'
          ? <label key={ field.name } className="controlRow payloadBoolean">
            <span className="controlRowName"><code>{ field.label }</code></span>
            <input aria-label={ `Payload ${ field.name }` } type="checkbox"
              className={ event[ field.name ] === undefined && field.defaultValue !== undefined
                ? 'payloadInheritedDefault' : undefined }
              checked={ event[ field.name ] ?? field.defaultValue ?? false }
              onChange={ ( change ) => update( field.name, change.target.checked, 'boolean' ) } />
          </label>
          : field.kind === 'json'
            ? <ScValueField key={ field.name } name={ field.name } value={ event[ field.name ] }
              inheritedValue={ field.defaultValue }
              onChange={ ( value ) => update( field.name, value, 'json' ) } />
            : field.kind === 'number'
              ? <ControlSlider key={ field.name } name={ field.name } label={ field.label }
                numberLabel={ `Payload ${ field.name }` }
                detail={ field.unit ?? '' } unit={ field.unit } value={ event[ field.name ] ?? '' }
                fallback={ field.defaultValue } placeholder={ payloadFieldPlaceholder( field ) }
                min={ field.min } max={ field.max } step={ field.step } decimals={ field.decimals }
                allowEmpty inherited={ event[ field.name ] === undefined && field.defaultValue !== undefined }
                numberClassName={ event[ field.name ] === undefined && field.defaultValue !== undefined
                  ? 'payloadInheritedDefault' : undefined }
                onChange={ ( value ) => update( field.name, value, 'number' ) } />
              : <label key={ field.name }>{ field.label }{ field.unit ?? '' }
                <input aria-label={ `Payload ${ field.name }` } type={ field.kind }
                  min={ field.min } max={ field.max } step={ field.step }
                  value={ event[ field.name ] ?? '' }
                  className={ event[ field.name ] === undefined && field.defaultValue !== undefined
                    ? 'payloadInheritedDefault' : undefined }
                  placeholder={ payloadFieldPlaceholder( field ) }
                  onChange={ ( change ) => update( field.name, change.target.value, field.kind ) } />
              </label> ) }
      </div>
    </fieldset>
  );
}

function ScValueField( { name, value, inheritedValue, onChange } ) {
  const [ text, setText ] = useState( () => formatScValue( value ) );
  const [ error, setError ] = useState( '' );
  useEffect( () => setText( formatScValue( value ) ), [ value ] );
  function commit() {
    try { onChange( parseScValue( text ) ); setError( '' ); }
    catch ( nextError ) { setError( nextError.message ); }
  }
  return <label className="controlRow payloadScValue"><span className="controlRowName"><code>{ name }</code></span>
    <input aria-label={ `Payload ${ name }` } value={ text }
      className={ value === undefined && inheritedValue !== undefined ? 'payloadInheritedDefault' : undefined }
      placeholder={ inheritedValue === undefined ? undefined : formatScValue( inheritedValue ) }
      onChange={ ( event ) => setText( event.target.value ) }
      onBlur={ commit }
      onKeyDown={ ( event ) => { if ( event.key === 'Enter' ) { event.preventDefault(); commit(); } } } />
    { error && <small className="error">{ error }</small> }
  </label>;
}
