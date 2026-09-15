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
      const encoded = [ 'instrument', 'type' ].includes( key ) && typeof value === 'string'
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

export function generateLocalScProjection( document ) {
  const entries = document.entries
    .map( ( entry, index ) => ( { entry, index } ) )
    .sort( ( left, right ) => left.entry.time - right.entry.time || left.index - right.index )
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
