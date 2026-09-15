const NICE_STEPS = Object.freeze( [ 1, 2, 5, 10 ] );

export function timelineTickStep( pxPerSecond, minimumPixels = 72 ) {
  if ( !( pxPerSecond > 0 ) || !( minimumPixels > 0 ) ) throw new Error( 'Timeline scale must be positive.' );
  const raw = minimumPixels / pxPerSecond;
  const power = 10 ** Math.floor( Math.log10( raw ) );
  const normalized = raw / power;
  return NICE_STEPS.find( ( step ) => step >= normalized ) * power;
}

export function timelineTicks( totalSeconds, pxPerSecond, minimumPixels = 72 ) {
  const step = timelineTickStep( pxPerSecond, minimumPixels );
  const count = Math.floor( Math.max( 0, totalSeconds ) / step );
  return {
    step,
    values: Array.from( { length: count + 1 }, ( _, index ) => index * step )
  };
}

export function formatTimelineTime( seconds, step = 1 ) {
  const precision = step < 1 ? Math.min( 3, Math.ceil( -Math.log10( step ) ) ) : 0;
  const rounded = Number( seconds.toFixed( precision ) );
  const hours = Math.floor( rounded / 3600 );
  const minutes = Math.floor( ( rounded % 3600 ) / 60 );
  const secondValue = rounded - ( hours * 3600 ) - ( minutes * 60 );
  const secondText = secondValue.toFixed( precision ).padStart( precision ? 3 + precision : 2, '0' );
  return hours > 0
    ? `${ hours }:${ String( minutes ).padStart( 2, '0' ) }:${ secondText }`
    : `${ minutes }:${ secondText }`;
}
