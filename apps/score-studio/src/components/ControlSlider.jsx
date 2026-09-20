import { useEffect, useRef, useState } from 'react';
import { map, quantise, sliderRange, unmap } from '../engine/controlRange.js';

const display = ( value ) => Number.isFinite( value )
  ? String( Number( value.toPrecision( 6 ) ) ) : String( value ?? '' );

// A numeric control as a fader plus a number box, used for SynthDef controls and for the declared
// payload fields of a score event. The fader is mapped through the control's ControlSpec warp so an
// exponential frequency control moves the way it does in sclang, and it sweeps a working window
// rather than the declared legality bound, which for a frequency is 20..25000 Hz.
//
// The number box stays authoritative: it takes any value the control declares, the fader re-anchors
// around whatever is typed, and clearing it (where the caller allows) falls back to the inherited
// value.
export default function ControlSlider( {
  name, label = name, detail = '', value, fallback, placeholder,
  min, max, warp, step = 0, decimals, unit,
  disabled = false, inherited = false, allowEmpty = false, numberClassName, numberLabel, onChange
} ) {
  const numeric = Number.isFinite( value ) ? value
    : value === '' || value === undefined || value === null ? undefined : Number( value );
  const shown = Number.isFinite( numeric ) ? numeric : fallback;

  // The window is anchored on the value the control arrived with. Re-deriving it from the live
  // value during a drag would move the ground under the thumb, so it is only re-anchored when the
  // value changes from somewhere other than this fader.
  const [ anchor, setAnchor ] = useState( shown );
  const emittedRef = useRef( shown );
  useEffect( () => {
    if ( shown === emittedRef.current ) return;
    emittedRef.current = shown;
    setAnchor( shown );
  }, [ shown ] );

  const range = sliderRange( { min, max, warp, step, anchor, unit, name } );
  const position = map( range, shown );

  function emit( next ) {
    emittedRef.current = next;
    onChange( next );
  }

  const scaleNote = range.provisional ? 'provisional'
    : range.windowed ? 'zoomed' : inherited ? 'inherited' : null;
  const trackTitle = range.provisional
    ? 'No declared range for this control - the fader range is provisional; the number box is not limited by it.'
    : range.windowed
      ? `Fader sweeps ${ display( range.min ) } … ${ display( range.max ) }${ range.warp === 'exp' ? ' · exponential' : '' }. Declared range is ${ display( range.declared.min ) } … ${ display( range.declared.max ) }; type any value in the box and the fader re-centres.`
      : `${ display( range.min ) } … ${ display( range.max ) }${ range.warp && range.warp !== 'lin' ? ` · ${ range.warp }` : '' }`;

  return <div className={ `controlSlider${ range.provisional ? ' provisionalRange' : '' }${ range.windowed ? ' windowedRange' : '' }${ inherited ? ' inheritedValue' : '' }` }>
    <div className="controlSliderHead">
      <span className="controlSliderName">
        <code>{ label }</code>
        { detail && <small>{ detail }</small> }
      </span>
      <input className={ `controlSliderNumber${ numberClassName ? ` ${ numberClassName }` : '' }` }
        aria-label={ numberLabel ?? `${ name } value` } type="number"
        value={ Number.isFinite( numeric ) ? display( numeric ) : '' }
        disabled={ disabled } step={ step || 'any' } placeholder={ placeholder }
        min={ range.declared?.min } max={ range.declared?.max }
        onChange={ ( event ) => {
          const text = event.target.value;
          if ( text === '' ) { if ( allowEmpty ) emit( '' ); return; }
          const next = Number( text );
          if ( !Number.isFinite( next ) ) return;
          // Typed values re-anchor the window: the fader follows where you put the control.
          setAnchor( next );
          emit( next );
        } } />
    </div>
    <input className="controlSliderTrack" type="range" min="0" max="1" step="0.0001"
      aria-label={ `${ name } slider` } value={ position } disabled={ disabled } title={ trackTitle }
      onChange={ ( event ) => emit( quantise( range, unmap( range, Number( event.target.value ) ), decimals ) ) } />
    <div className="controlSliderScale">
      <span>{ display( range.min ) }</span>
      { scaleNote && <em>{ scaleNote }</em> }
      <span>{ display( range.max ) }</span>
    </div>
  </div>;
}
