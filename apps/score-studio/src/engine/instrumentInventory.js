function uniqueSorted( values ) {
  return [ ...new Set( values.filter( ( value ) => typeof value === 'string' && value.length ) ) ]
    .sort( ( left, right ) => left.localeCompare( right ) );
}

export function synthDefSignalKind( description ) {
  const model = description?.interface;
  if ( !model ) return 'unknown';
  const rates = model.outputs.map( ( output ) => model.ugens[ output.ugenIndex ]?.rate );
  if ( rates.includes( 'audio' ) ) return 'audio';
  if ( rates.includes( 'control' ) ) return 'control';
  return 'utility';
}

export function buildInstrumentInventory( {
  scoreDefinitions = [], admittedDefinitions = {}, availableNames = []
} = {} ) {
  const score = new Set( scoreDefinitions );
  const admitted = new Set( Object.keys( admittedDefinitions ) );
  const available = new Set( availableNames );
  const names = uniqueSorted( [ ...score, ...admitted, ...available ] );
  const categoryRank = { score: 0, loaded: 1, available: 2 };
  return Object.freeze( names.map( ( name ) => {
    const category = score.has( name ) ? 'score' : admitted.has( name ) ? 'loaded' : 'available';
    const description = admittedDefinitions[ name ] ?? null;
    return Object.freeze( {
      name,
      category,
      categoryRank: categoryRank[ category ],
      available: available.has( name ),
      modelled: Boolean( description ),
      fingerprint: description?.fingerprint ?? null,
      signalKind: synthDefSignalKind( description )
    } );
  } ).sort( ( left, right ) => left.categoryRank - right.categoryRank
    || left.name.localeCompare( right.name ) ) );
}
