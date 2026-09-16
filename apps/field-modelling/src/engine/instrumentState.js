import {
  instrumentDefaultParams,
  instrumentFrequencyControls,
  instrumentMainFrequency,
  instrumentType
} from '@awb/instruments';
import { defaultFieldChannels } from '@awb/field-engine';

function getPath( obj, path ) {
  return path.reduce( ( value, key ) => ( value == null ? value : value[ key ] ), obj );
}

function setPath( obj, path, value ) {
  const next = structuredClone( obj );
  let current = next;
  for ( let i = 0; i < path.length - 1; i++ ) current = current[ path[ i ] ];
  current[ path[ path.length - 1 ] ] = value;
  return next;
}

// A live app/session instance. The shared catalog describes the instrument; this object records
// what this particular field session is doing with it.
export function createInstrument(
  type,
  speakers,
  idFn = () => `inst-${ Math.random().toString( 36 ).slice( 2, 9 ) }`
) {
  if ( !instrumentType( type ) ) throw new Error( `Unknown instrument type: ${ type }` );
  return {
    id: idFn(),
    type,
    playing: true,
    mute: false,
    solo: false,
    amp: 1,
    lActive: true,
    rActive: true,
    params: instrumentDefaultParams( type, speakers ),
    channels: defaultFieldChannels( type )
  };
}

// Renderer policy: this SC context applies the global time factor to controls the shared catalog
// identifies as frequencies or frequency offsets. The catalog supplies meaning, not execution.
export function scaleFrequencies( type, params, timeFactor, speakers = [] ) {
  if ( timeFactor === 1 ) return params;
  const out = { ...params };
  for ( const name of instrumentFrequencyControls( type, speakers ) ) {
    if ( typeof out[ name ] === 'number' ) out[ name ] *= timeFactor;
  }
  return out;
}

export function mainFreq( instrument, speakers ) {
  return instrumentMainFrequency( instrument.type, instrument.params, speakers );
}

export { getPath, setPath };
