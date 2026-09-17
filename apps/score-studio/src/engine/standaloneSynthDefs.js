import { INSTRUMENT_CATALOG } from '@awb/instruments';

const base = () => import.meta.env.BASE_URL || '/';
const loadedByEngine = new WeakMap();

function scoreDefNames( document ) {
  return [ ...new Set( document.entries
    .filter( ( entry ) => entry.event?.type === 'note' )
    .map( ( entry ) => entry.event.def ?? entry.event.instrument )
    .filter( Boolean ) ) ];
}

async function loadNamedSynthDefs( sc, wanted, { assetBase = `${ base() }synthdefs/` } = {} ) {
  const engine = sc.getEngine();
  if ( !engine ) throw new Error( 'Start the browser audio engine before loading SynthDefs.' );
  let loaded = loadedByEngine.get( engine );
  if ( !loaded ) {
    loaded = new Set();
    loadedByEngine.set( engine, loaded );
  }

  const response = await fetch( `${ assetBase }manifest.json` );
  if ( !response.ok ) throw new Error( `Could not load standalone SynthDef manifest (${ response.status }).` );
  const manifest = await response.json();
  const available = new Map( ( manifest.patches ?? [] ).flatMap( ( patch ) => patch.defs ?? [] )
    .map( ( definition ) => [ definition.name, definition ] ) );
  const missing = wanted.filter( ( name ) => !available.has( name ) );
  if ( missing.length ) {
    const error = new Error( `Standalone SynthDef${ missing.length > 1 ? 's' : '' } not installed: ${ missing.join( ', ' ) }.` );
    error.code = 'missingSynthDefs';
    error.missingDefinitions = Object.freeze( [ ...missing ] );
    throw error;
  }

  for ( const name of wanted ) {
    if ( loaded.has( name ) ) continue;
    const definition = available.get( name );
    const bytes = await fetch( `${ assetBase }${ definition.file }` );
    if ( !bytes.ok ) throw new Error( `Could not load ${ definition.file } (${ bytes.status }).` );
    await sc.loadSynthDef( new Uint8Array( await bytes.arrayBuffer() ), name );
    loaded.add( name );
  }
  return Object.freeze( [ ...wanted ] );
}

export async function loadStandaloneSynthDefs( sc, document, options ) {
  return loadNamedSynthDefs( sc, scoreDefNames( document ), options );
}

export async function loadInstrumentLibrarySynthDefs( sc, options ) {
  const wanted = [ ...new Set( Object.values( INSTRUMENT_CATALOG )
    .map( ( descriptor ) => descriptor.synthDef )
    .filter( Boolean ) ) ];
  return loadNamedSynthDefs( sc, wanted, options );
}

export async function loadEnvelopeLabSynthDef( sc, options ) {
  return loadNamedSynthDefs( sc, [ 'awbEnvelopeLab' ], options );
}
