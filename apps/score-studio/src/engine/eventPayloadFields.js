import { instrumentBooleanFields, instrumentFields, typeForSynthDef } from '@awb/instruments';

const CORE_KEYS = new Set( [ 'type', 'def', 'instrument', 'target' ] );

function scalarKind( value ) {
  if ( typeof value === 'number' ) return 'number';
  if ( typeof value === 'boolean' ) return 'boolean';
  if ( typeof value === 'string' ) return 'text';
  return 'json';
}

export function payloadFields( event, inheritedDefinition = null, inheritedValues = null ) {
  const instrument = typeForSynthDef( event.def ?? event.instrument ?? inheritedDefinition );
  const fields = instrument ? [
    ...instrumentFields( instrument.key ).map( ( field ) => {
      const name = field.path[ 0 ];
      const inherited = inheritedValues?.[ name ];
      const effective = event[ name ] ?? inherited;
      return {
        name, ...field,
        kind: effective !== undefined && scalarKind( effective ) === 'json' ? 'json' : 'number',
        declared: true, synthDefaultValue: field.defaultValue,
        defaultValue: inherited ?? field.defaultValue
      };
    } ),
    ...instrumentBooleanFields( instrument.key ).map( ( field ) => {
      const name = field.path[ 0 ];
      const inherited = inheritedValues?.[ name ];
      const effective = event[ name ] ?? inherited;
      return {
        name, ...field,
        kind: effective !== undefined && scalarKind( effective ) === 'json' ? 'json' : 'boolean',
        declared: true, synthDefaultValue: field.defaultValue,
        defaultValue: inherited ?? field.defaultValue
      };
    } )
  ] : [];
  const declared = new Set( fields.map( ( field ) => field.name ) );
  for ( const [ name, value ] of Object.entries( { ...( inheritedValues ?? {} ), ...event } ) ) {
    if ( CORE_KEYS.has( name ) || declared.has( name ) ) continue;
    fields.push( {
      name, label: name, kind: scalarKind( value ), declared: false,
      defaultValue: event[ name ] === undefined ? inheritedValues?.[ name ] : undefined
    } );
  }
  return fields;
}

export function payloadFieldPlaceholder( field ) {
  if ( field.defaultValue === undefined ) return undefined;
  return String( field.defaultValue );
}

export function updatePayloadField( event, name, value, kind ) {
  const next = { ...event };
  if ( value === '' && kind !== 'boolean' ) {
    delete next[ name ];
    return next;
  }
  if ( kind === 'number' ) {
    const number = Number( value );
    if ( !Number.isFinite( number ) ) throw new Error( `${ name } must be a finite number.` );
    next[ name ] = number;
  } else if ( kind === 'boolean' ) next[ name ] = Boolean( value );
  else if ( kind === 'json' ) next[ name ] = value;
  else next[ name ] = value;
  return next;
}
