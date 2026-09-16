const TWO_PI = Math.PI * 2;

function wrapPhase( phase ) {
  const wrapped = phase % TWO_PI;
  return wrapped < 0 ? wrapped + TWO_PI : wrapped;
}

export function applyRelativePhaseSnapshot( phaseMap, snapshot, browserTime ) {
  if ( !snapshot || !phaseMap.has( snapshot.referenceKey ) ) return false;
  const elapsed = Math.max( 0, browserTime - snapshot.observationBrowserTime );
  const referencePhase = phaseMap.get( snapshot.referenceKey );
  for ( const correction of snapshot.corrections ) {
    const relativeNow = correction.relativePhase
      + TWO_PI * ( correction.frequency - snapshot.referenceFrequency ) * elapsed;
    phaseMap.set( correction.key, wrapPhase( referencePhase + relativeNow ) );
  }
  return true;
}
