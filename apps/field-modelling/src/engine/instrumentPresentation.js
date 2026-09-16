import {
  instrumentBooleanFields,
  instrumentDefaultParams,
  instrumentFields,
  typeForSynthDef
} from '@awb/instruments';
import { defaultFieldChannels } from '@awb/field-engine';

export const RUNTIME_OWNERSHIP = Object.freeze( {
  OWNED: 'owned',
  EXTERNAL: 'external'
} );

const ownershipValues = new Set( Object.values( RUNTIME_OWNERSHIP ) );

export function assertRuntimeInstrumentNode( node ) {
  if ( !node || typeof node !== 'object' ) throw new TypeError( 'Runtime instrument node is required.' );
  if ( !node.entryID ) throw new TypeError( 'Runtime instrument node requires an entryID.' );
  if ( !node.synthDefName ) throw new TypeError( 'Runtime instrument node requires a synthDefName.' );
  if ( !ownershipValues.has( node.ownership ) ) {
    throw new TypeError( 'Runtime instrument ownership must be supplied explicitly.' );
  }
  if ( node.controls !== undefined && ( !node.controls || typeof node.controls !== 'object'
    || Array.isArray( node.controls ) ) ) {
    throw new TypeError( 'Runtime instrument controls must be an object when supplied.' );
  }
  return node;
}

export function curatedControlNames( instrument, speakers ) {
  if ( !instrument ) return new Set();
  return new Set( [
    ...instrumentFields( instrument.type, speakers ),
    ...instrumentBooleanFields( instrument.type, speakers )
  ].filter( ( field ) => field.path.length === 1 ).map( ( field ) => field.path[ 0 ] ) );
}

export function additionalSynthDefControls( synthDefInterface, { curated = new Set(), gainControl = null } = {} ) {
  if ( !synthDefInterface ) return [];
  if ( synthDefInterface.schema !== 'awb.synthdef-interface/1' || !Array.isArray( synthDefInterface.controls ) ) {
    throw new TypeError( 'Expected an awb.synthdef-interface/1 description.' );
  }
  return synthDefInterface.controls.filter( ( control ) => !curated.has( control.name )
    && control.name !== gainControl && ![ 'out', 'gate' ].includes( control.name ) );
}

// A runtime node becomes drawable only when the shared catalog has an explicit acoustic-field
// mapping for its SynthDef. Arbitrary SynthDef analysis describes controls and lifecycle evidence;
// it does not invent field physics.
export function runtimeNodeToFieldInstrument( input, speakers ) {
  const node = assertRuntimeInstrumentNode( input );
  const known = typeForSynthDef( node.synthDefName );
  if ( !known ) return null;
  const { key, descriptor } = known;
  const params = instrumentDefaultParams( key, speakers );
  for ( const name of Object.keys( params ) ) {
    const value = node.controls?.[ name ];
    if ( typeof value !== 'number' ) continue;
    params[ name ] = typeof params[ name ] === 'boolean' ? value >= 0.5 : value;
  }
  const gain = node.controls?.[ descriptor.gainControl ];
  return Object.freeze( {
    id: `runtime:${ node.entryID }`,
    type: key,
    external: true,
    runtimeEntryID: node.entryID,
    synthDefName: node.synthDefName,
    ownership: node.ownership,
    playing: node.active !== false,
    mute: false,
    solo: false,
    amp: typeof gain === 'number' ? gain : 1,
    lActive: true,
    rActive: true,
    params,
    channels: defaultFieldChannels( key )
  } );
}

export function drawableRuntimeInstruments( nodes, speakers ) {
  return Object.freeze( ( nodes ?? [] )
    .filter( ( node ) => node?.ownership === RUNTIME_OWNERSHIP.EXTERNAL && node.active !== false )
    .map( ( node ) => runtimeNodeToFieldInstrument( node, speakers ) )
    .filter( Boolean ) );
}
