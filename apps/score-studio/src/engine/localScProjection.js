export const SC_PROJECTION_KINDS = Object.freeze( {
  DESKTOP_SCORE: 'desktop-score',
  BROWSER_PSEQ: 'browser-pseq'
} );

const SC_REF_TAG = '$sc.ref';

function scString( value ) {
  return JSON.stringify( value )
    .replaceAll( '\u2028', '\\u2028' )
    .replaceAll( '\u2029', '\\u2029' );
}

function scSymbol( value ) {
  return `'${ String( value ).replaceAll( '\\', '\\\\' ).replaceAll( "'", "\\'" ) }'`;
}

function scValue( value, path ) {
  if ( value === null ) return 'nil';
  if ( typeof value === 'boolean' ) return value ? 'true' : 'false';
  if ( typeof value === 'number' ) {
    if ( !Number.isFinite( value ) ) throw new TypeError( `Unsupported score value at ${ path }: non-finite number` );
    return Object.is( value, -0 ) ? '0' : String( value );
  }
  if ( typeof value === 'string' ) return scString( value );
  if ( Array.isArray( value ) ) {
    return `[ ${ value.map( ( child, index ) => scValue( child, `${ path }[${ index }]` ) ).join( ', ' ) } ]`;
  }
  if ( value && Object.getPrototypeOf( value ) === Object.prototype ) {
    if ( Object.keys( value ).length === 1 && Array.isArray( value[ SC_REF_TAG ] ) ) {
      return `Ref(${ scValue( value[ SC_REF_TAG ], `${ path }.${ SC_REF_TAG }` ) })`;
    }
    return `( ${ Object.entries( value ).map( ( [ key, child ] ) => (
      `${ scSymbol( key ) }: ${ scValue( child, `${ path }.${ key }` ) }`
    ) ).join( ', ' ) } )`;
  }
  throw new TypeError( `Unsupported score value at ${ path }` );
}

function eventCode( source, path ) {
  const fields = [];
  for ( const [ key, value ] of Object.entries( source ) ) {
    if ( key === 'def' && source.instrument === undefined ) {
      fields.push( `${ scSymbol( 'instrument' ) }: ${ scSymbol( value ) }` );
    } else if ( key !== 'def' ) {
      const encoded = key === 'dur' && value === 'inf' ? 'inf'
        : [ 'instrument', 'type' ].includes( key ) && typeof value === 'string'
          ? scSymbol( value )
          : scValue( value, `${ path }.${ key }` );
      fields.push( `${ scSymbol( key ) }: ${ encoded }` );
    }
  }
  return `( ${ fields.join( ', ' ) } )`;
}

function entryCode( entry, index ) {
  const id = entry.id ?? `entry-${ index }`;
  if ( !Number.isFinite( entry.time ) ) throw new TypeError( `Score entry ${ id } has no finite time` );
  if ( !entry.event || Object.getPrototypeOf( entry.event ) !== Object.prototype ) {
    throw new TypeError( `Score entry ${ id } event is not an object` );
  }
  const path = Array.isArray( entry.path ) ? entry.path : [];
  return [
    '(',
    `${ scSymbol( 'id' ) }: ${ scString( String( id ) ) },`,
    `${ scSymbol( 'time' ) }: ${ String( entry.time ) },`,
    `${ scSymbol( 'path' ) }: [ ${ path.map( scSymbol ).join( ', ' ) } ],`,
    `${ scSymbol( 'event' ) }: ${ eventCode( entry.event, `score[${ index }].event` ) }`,
    ')'
  ].join( ' ' );
}

function sortedEntries( document ) {
  return document.entries
    .map( ( entry, index ) => ( { entry, index } ) )
    .sort( ( left, right ) => left.entry.time - right.entry.time || left.index - right.index );
}

function generateDesktopScore( document ) {
  const entries = sortedEntries( document )
    .map( ( item ) => entryCode( item.entry, item.index ) )
    .join( ',\n    ' );
  return [
    '// AWB GENERATED SCORE PROJECTION',
    `// Score ID: ${ document.scoreID }`,
    `// Revision: ${ document.revision }`,
    '// Canonical authored data lives in the paired .score.json file.',
    '// Generated locally by Score Studio; desktop hosting was not required.',
    '(',
    '~scorePlayer = PScoreTimelinePlayer([',
    `    ${ entries }`,
    `], scoreID: ${ scString( document.scoreID ) }, revision: ${ document.revision });`,
    ')',
    ''
  ].join( '\n' );
}

function pseqEventCode( entry, index, delta ) {
  const source = entry.event;
  const fields = [];
  const instrument = source.def ?? source.instrument;
  if ( typeof instrument !== 'string' || !instrument.length ) {
    throw new TypeError( `Score entry ${ entry.id ?? index } has no SynthDef for Pseq projection` );
  }
  fields.push( `${ scSymbol( 'instrument' ) }: ${ scSymbol( instrument ) }` );
  fields.push( `${ scSymbol( 'delta' ) }: ${ String( delta ) }` );
  for ( const [ key, value ] of Object.entries( source ) ) {
    if ( [ 'type', 'def', 'instrument', 'target', 'delta' ].includes( key ) ) continue;
    const encoded = key === 'dur' && value === 'inf'
      ? 'inf' : scValue( value, `score[${ index }].event.${ key }` );
    fields.push( `${ scSymbol( key ) }: ${ encoded }` );
  }
  return `( ${ fields.join( ', ' ) } )`;
}

function generateBrowserPseq( document ) {
  const sorted = sortedEntries( document );
  const notes = sorted.filter( ( { entry } ) => entry.event?.type === 'note' );
  const omitted = sorted.filter( ( { entry } ) => entry.event?.type !== 'note' );
  if ( notes.length === 0 ) throw new TypeError( 'A browser Pseq reduction needs at least one note event' );
  const events = notes.map( ( item, noteIndex ) => {
    const next = notes[ noteIndex + 1 ];
    const delta = next ? Math.max( 0, next.entry.time - item.entry.time ) : 0;
    return pseqEventCode( item.entry, item.index, delta );
  } ).join( ',\n    ' );
  const omittedSummary = omitted.length
    ? omitted.map( ( { entry } ) => `${ entry.id }:${ entry.event?.type ?? 'untyped' }` ).join( ', ' )
    : 'none';
  return [
    '// AWB GENERATED BROWSER PSEQ REDUCTION',
    `// Score ID: ${ document.scoreID }`,
    `// Revision: ${ document.revision }`,
    '// Notes retain onset spacing as delta; authored dur, sustain and legato are unchanged.',
    '// This is not the canonical score and does not preserve target-based lifecycle control.',
    `// Omitted non-note entries: ${ omittedSummary }`,
    '(',
    '~scorePattern = Pseq([',
    `    ${ events }`,
    '], 1);',
    '// Play after the required SynthDefs are loaded:',
    '// ~scorePlayer = ~scorePattern.play;',
    ')',
    ''
  ].join( '\n' );
}

export function generateLocalScProjection( document, { kind = SC_PROJECTION_KINDS.DESKTOP_SCORE } = {} ) {
  if ( kind === SC_PROJECTION_KINDS.DESKTOP_SCORE ) return generateDesktopScore( document );
  if ( kind === SC_PROJECTION_KINDS.BROWSER_PSEQ ) return generateBrowserPseq( document );
  throw new TypeError( `Unknown SC projection kind: ${ kind }` );
}
