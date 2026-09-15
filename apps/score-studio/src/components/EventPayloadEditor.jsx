import { INSTRUMENT_CATALOG } from '@awb/instruments';
import { payloadFields, updatePayloadField } from '../engine/eventPayloadFields.js';

const COMMON_TYPES = [ 'note', 'set', 'release', 'free' ];

export default function EventPayloadEditor( { event, onChange } ) {
  if ( !event ) return <p className="typedPayloadUnavailable">Fix the raw JSON to use typed controls.</p>;
  const fields = payloadFields( event );
  const synthDefs = Object.values( INSTRUMENT_CATALOG ).map( ( descriptor ) => descriptor.synthDef );
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
        <input aria-label="Event SynthDef" list="score-synthdefs" value={ event.def ?? event.instrument ?? '' }
          onChange={ ( change ) => update( event.def !== undefined ? 'def' : 'instrument', change.target.value ) } />
        <datalist id="score-synthdefs">
          { synthDefs.map( ( synthDef ) => <option key={ synthDef } value={ synthDef } /> ) }
        </datalist>
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
            ? <p key={ field.name } className="payloadJsonOnly"><strong>{ field.name }</strong> — edit in raw JSON</p>
            : <label key={ field.name }>{ field.label }{ field.unit ?? '' }
              <input aria-label={ `Payload ${ field.name }` } type={ field.kind }
                min={ field.min } max={ field.max } step={ field.step }
                value={ event[ field.name ] ?? '' }
                placeholder={ field.declared ? 'unset' : undefined }
                onChange={ ( change ) => update( field.name, change.target.value, field.kind ) } />
            </label> ) }
      </div>
    </fieldset>
  );
}
