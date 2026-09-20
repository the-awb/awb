// Slider ranges and warp mapping for numeric controls.
//
// A declared range is a legality bound, not a fader span. The instrument catalog says freqA is
// 20..25000 Hz and an envelope time is 0..3600 s, which is true and useless on a fader: at 144 Hz
// a centimetre of travel jumps to 250 Hz, and an attack fader sweeps an hour. So a very wide range
// is narrowed to a working window around the value the control actually holds, while the number
// box keeps the full declared range. The window is anchored, not recomputed from the live value -
// deriving it from the value being dragged would make the fader chase itself.

const EPSILON = 1e-9;

// Above these the declared range is a legality bound rather than a span you would want to sweep.
const WIDE_RATIO = 200;       // positive ranges: max/min
const WIDE_LINEAR_FACTOR = 40; // other ranges: span vs the magnitude in play

const EXPONENTIAL_NAME = /freq|hz|cutoff|ratio|partial|harmonic|rate|time|dur|decay|release|attack/i;

// A declared ControlSpec's warp is authoritative. Where none is declared, a positive range spanning
// two octaves or more is exponential if its name or unit says it is a frequency or a duration.
export function inferWarp( { warp, min, max, unit, name } ) {
  if ( warp !== undefined && warp !== null ) return warp;
  if ( !( min > 0 ) || !( max > 0 ) || max / min < 4 ) return 'lin';
  return EXPONENTIAL_NAME.test( `${ name ?? '' } ${ unit ?? '' }` ) ? 'exp' : 'lin';
}

function provisionalBounds( anchor ) {
  const reference = Number.isFinite( anchor ) ? anchor : 1;
  const magnitude = Math.abs( reference );
  if ( magnitude < EPSILON ) return { min: 0, max: 1 };
  const span = magnitude * 2;
  return { min: reference < 0 ? -span : 0, max: span };
}

export function isWideRange( { min, max, anchor } ) {
  if ( !Number.isFinite( min ) || !Number.isFinite( max ) || max - min < EPSILON ) return false;
  if ( min > 0 && max / min > WIDE_RATIO ) return true;
  const magnitude = Math.max( Math.abs( anchor ?? 0 ), Math.abs( min ), 1 );
  return ( max - min ) > WIDE_LINEAR_FACTOR * magnitude;
}

// The span the fader sweeps, given the declared bounds and the value it is anchored on.
export function workingWindow( { min, max, warp, anchor } ) {
  if ( !isWideRange( { min, max, anchor } ) ) return { min, max };
  const value = Number.isFinite( anchor ) ? anchor : min;
  if ( min > 0 && value > 0 && ( warp === 'exp' || max / min > WIDE_RATIO ) ) {
    // Two octaves either side of where the control sits, which is a fader you can play.
    return { min: Math.max( min, value / 4 ), max: Math.min( max, value * 4 ) };
  }
  const reach = Math.max( Math.abs( value ), 1 ) * 2;
  return { min: Math.max( min, value - reach ), max: Math.min( max, value + reach ) };
}

export function sliderRange( { min, max, warp, step = 0, anchor, unit, name } ) {
  if ( Number.isFinite( min ) && Number.isFinite( max ) && max > min ) {
    const resolvedWarp = inferWarp( { warp, min, max, unit, name } );
    const windowed = workingWindow( { min, max, warp: resolvedWarp, anchor } );
    return {
      ...windowed,
      warp: windowed.min > 0 && windowed.max / windowed.min > 4 ? resolvedWarp : 'lin',
      step: Number.isFinite( step ) ? step : 0,
      provisional: false,
      declared: { min, max },
      windowed: windowed.min !== min || windowed.max !== max
    };
  }
  const bounds = provisionalBounds( anchor );
  return { ...bounds, warp: 'lin', step: 0, provisional: true, declared: null, windowed: false };
}

// position 0..1 -> value
export function unmap( range, position ) {
  const { min, max, warp } = range;
  const clamped = Math.min( 1, Math.max( 0, position ) );
  if ( warp === 'exp' && min > 0 && max > 0 ) return min * ( ( max / min ) ** clamped );
  if ( warp === 'amp' || warp === 'db' ) return min + ( max - min ) * ( clamped ** 2 );
  if ( Number.isFinite( warp ) && Math.abs( warp ) > EPSILON ) {
    const curve = Number( warp );
    return min + ( max - min ) * ( ( Math.exp( curve * clamped ) - 1 ) / ( Math.exp( curve ) - 1 ) );
  }
  return min + ( max - min ) * clamped;
}

// value -> position 0..1
export function map( range, value ) {
  const { min, max, warp } = range;
  if ( !Number.isFinite( value ) || max - min < EPSILON ) return 0;
  const clamped = Math.min( max, Math.max( min, value ) );
  if ( warp === 'exp' && min > 0 && max > 0 ) return Math.log( clamped / min ) / Math.log( max / min );
  if ( warp === 'amp' || warp === 'db' ) return Math.sqrt( ( clamped - min ) / ( max - min ) );
  if ( Number.isFinite( warp ) && Math.abs( warp ) > EPSILON ) {
    const curve = Number( warp );
    const linear = ( clamped - min ) / ( max - min );
    return Math.log( linear * ( Math.exp( curve ) - 1 ) + 1 ) / curve;
  }
  return ( clamped - min ) / ( max - min );
}

export function quantise( range, value, decimals ) {
  if ( !Number.isFinite( value ) ) return value;
  const stepped = range.step > 0 ? Math.round( value / range.step ) * range.step : value;
  return Number.isFinite( decimals ) ? Number( stepped.toFixed( decimals ) ) : stepped;
}
