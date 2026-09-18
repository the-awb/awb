import { INSTRUMENT_CATALOG } from '@awb/instruments';
import { useEffect, useState } from 'react';
import { payloadFieldPlaceholder, payloadFields, updatePayloadField } from '../engine/eventPayloadFields.js';
import { mergeSynthDefNames } from '../engine/instrumentInventory.js';
import { formatScValue, parseScValue } from '../engine/scValueSyntax.js';

const COMMON_TYPES = [ 'note', 'set', 'release', 'free' ];

export default function EventPayloadEditor( {
  event, inheritedDefinition = null, availableSynthDefs = [], onChange
} ) {
  if ( !event ) return <p className="typedPayloadUnavailable">Fix the raw JSON to use typed controls.</p>;
  const fields = payloadFields( event, inheritedDefinition );
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
      <label>Type
        <input aria-label="Event type" list="score-event-types" value={ event.type ?? '' }
          onChange={ ( change ) => update( 'type', change.target.value ) } />
        <datalist id="score-event-types">
          { COMMON_TYPES.map( ( type ) => <option key={ type } value={ type } /> ) }
        </datalist>
      </label>
      { event.type === 'note' && <label>SynthDef
        <select aria-label="Event SynthDef" value={ selectedSynthDef }
          onChange={ ( change ) => update( event.def !== undefined ? 'def' : 'instrument', change.target.value ) }>
          { synthDefs.map( ( synthDef ) => <option key={ synthDef } value={ synthDef } /> ) }
        </select>
      </label> }
      { [ 'set', 'release', 'free' ].includes( event.type ) && !Array.isArray( event.target ) && <label>Target
        <input aria-label="Event target" value={ event.target ?? '' }
          onChange={ ( change ) => update( 'target', change.target.value ) } />
      </label> }
      <div className="payloadFieldGrid">
        { fields.map( ( field ) => field.kind === 'boolean'
          ? <label key={ field.name } className="payloadBoolean">
            <input aria-label={ `Payload ${ field.name }` } type="checkbox" checked={ event[ field.name ] ?? false }
              onChange={ ( change ) => update( field.name, change.target.checked, 'boolean' ) } />
            { field.label }
          </label>
          : field.kind === 'json'
            ? <ScValueField key={ field.name } name={ field.name } value={ event[ field.name ] }
              onChange={ ( value ) => update( field.name, value, 'json' ) } />
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

function ScValueField( { name, value, onChange } ) {
  const [ text, setText ] = useState( () => formatScValue( value ) );
  const [ error, setError ] = useState( '' );
  useEffect( () => setText( formatScValue( value ) ), [ value ] );
  function commit() {
    try { onChange( parseScValue( text ) ); setError( '' ); }
    catch ( nextError ) { setError( nextError.message ); }
  }
  return <label className="payloadScValue">{ name }
    <input aria-label={ `Payload ${ name }` } value={ text }
      onChange={ ( event ) => setText( event.target.value ) }
      onBlur={ commit }
      onKeyDown={ ( event ) => { if ( event.key === 'Enter' ) { event.preventDefault(); commit(); } } } />
    { error && <small className="error">{ error }</small> }
  </label>;
}
