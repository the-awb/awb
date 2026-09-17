import { INSTRUMENT_CATALOG, instrumentControls } from '@awb/instruments';
import { RESERVED_CONTROLS, settableControls } from '@awb/sc-wasm/core';

function hostedControls( definition ) {
  return ( definition?.interface?.controls ?? [] )
    .filter( ( control ) => !RESERVED_CONTROLS.has( control.name ) && ( control.numChannels ?? 1 ) === 1 );
}

export function liveInstrumentLibrary( manifest, { hostedDefinitions = null } = {} ) {
  return Object.entries( INSTRUMENT_CATALOG ).map( ( [ key, descriptor ] ) => {
    const definition = manifest.get( descriptor.synthDef );
    const hostedDefinition = hostedDefinitions?.[ descriptor.synthDef ];
    const catalogControls = new Map(
      instrumentControls( key ).map( ( control ) => [ control.name, control ] )
    );
    const controls = ( hostedDefinition ? hostedControls( hostedDefinition ) : settableControls( definition ) ).map( ( control ) => {
      const catalog = catalogControls.get( control.name );
      return Object.freeze( {
        name: control.name,
        default: control.default,
        synthDefault: control.default,
        rate: control.rate ?? 'control',
        role: catalog?.role ?? null,
        editor: catalog?.editor ?? null
      } );
    } );
    return Object.freeze( {
      key,
      label: descriptor.label,
      definition: descriptor.synthDef,
      note: descriptor.note ?? '',
      controls: Object.freeze( controls ),
      available: Boolean( hostedDefinition ?? definition )
    } );
  } );
}

export function initialLiveInstrumentParams( instrument ) {
  return Object.freeze( Object.fromEntries(
    instrument.controls.map( ( control ) => [ control.name, control.default ] )
  ) );
}
