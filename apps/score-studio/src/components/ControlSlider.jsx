// A numeric control as a slider plus a number box, used for SynthDef controls and for the declared
// payload fields of a score event. The slider is mapped through the control's ControlSpec warp so an
// exponential frequency control moves the way it does in sclang. The number box stays authoritative:
// it is never clamped by the slider's range, so a control whose range is only provisional can still
// be driven anywhere, and clearing it (where the caller allows) falls back to the inherited value.

const EPSILON = 1e-9;

function provisionalBounds( value, fallback ) {
  const reference = Number.isFinite( value ) ? value
    : Number.isFinite( fallback ) ? fallback : 1;
  const magnitude = Math.abs( reference );
  if ( magnitude < EPSILON ) return { min: 0, max: 1 };
  const span = magnitude * 2;
  return { min: reference < 0 ? -span : 0, max: span };
}

const EXPONENTIAL_NAME = /freq|hz|cutoff|ratio|partial|harmonic|rate|time|dur|decay|release|attack/i;

// A declared ControlSpec's warp is authoritative. Where none is declared — the instrument catalog
// gives ranges but no warp — a positive range spanning two octaves or more is exponential if its
// name or unit says it is a frequency or a duration, which is how these read on a fader.
export function inferWarp( { warp, min, max, unit, name } ) {
  if ( warp !== undefined && warp !== null ) return warp;
  if ( !( min > 0 ) || !( max > 0 ) || max / min < 4 ) return 'lin';
  return EXPONENTIAL_NAME.test( `${ name ?? '' } ${ unit ?? '' }` ) ? 'exp' : 'lin';
}

export function sliderRange( { min, max, warp, step = 0, value, fallback, unit, name } ) {
  if ( Number.isFinite( min ) && Number.isFinite( max ) && max > min ) {
    return { min, max, warp: inferWarp( { warp, min, max, unit, name } ),
      step: Number.isFinite( step ) ? step : 0, provisional: false };
  }
  return { ...provisionalBounds( value, fallback ), warp: 'lin', step: 0, provisional: true };
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

const display = ( value ) => Number.isFinite( value )
  ? String( Number( value.toPrecision( 6 ) ) ) : String( value ?? '' );

export default function ControlSlider( {
  name, label = name, detail = '', value, fallback, placeholder,
  min, max, warp, step = 0, decimals, unit,
  disabled = false, inherited = false, allowEmpty = false, numberClassName, numberLabel, onChange
} ) {
  const numeric = Number.isFinite( value ) ? value
    : value === '' || value === undefined || value === null ? undefined : Number( value );
  const shown = Number.isFinite( numeric ) ? numeric : fallback;
  const range = sliderRange( { min, max, warp, step, value: shown, fallback, unit, name } );
  const position = map( range, shown );

  function commitSlider( next ) {
    if ( !Number.isFinite( next ) ) return;
    const quantised = range.step > 0 ? Math.round( next / range.step ) * range.step : next;
    onChange( Number.isFinite( decimals ) ? Number( quantised.toFixed( decimals ) ) : quantised );
  }

  return <div className={ `controlSlider${ range.provisional ? ' provisionalRange' : '' }${ inherited ? ' inheritedValue' : '' }` }>
    <div className="controlSliderHead">
      <span className="controlSliderName">
        <code>{ label }</code>
        { detail && <small>{ detail }</small> }
      </span>
      <input className={ `controlSliderNumber${ numberClassName ? ` ${ numberClassName }` : '' }` }
        aria-label={ numberLabel ?? `${ name } value` } type="number" value={ Number.isFinite( numeric ) ? display( numeric ) : '' }
        disabled={ disabled } step={ range.step || 'any' } placeholder={ placeholder }
        onChange={ ( event ) => {
          const text = event.target.value;
          if ( text === '' ) { if ( allowEmpty ) onChange( '' ); return; }
          const next = Number( text );
          if ( Number.isFinite( next ) ) onChange( next );
        } } />
    </div>
    <input className="controlSliderTrack" type="range" min="0" max="1" step="0.0001"
      aria-label={ `${ name } slider` } value={ position } disabled={ disabled }
      title={ range.provisional
        ? 'No declared range for this control — the slider range is provisional; the number box is not limited by it.'
        : `${ display( range.min ) } … ${ display( range.max ) }${ range.warp && range.warp !== 'lin' ? ` · ${ range.warp }` : '' }` }
      onChange={ ( event ) => commitSlider( unmap( range, Number( event.target.value ) ) ) } />
    <div className="controlSliderScale">
      <span>{ display( range.min ) }</span>
      { range.provisional
        ? <em>provisional</em>
        : inherited ? <em>inherited</em> : null }
      <span>{ display( range.max ) }</span>
    </div>
  </div>;
}
