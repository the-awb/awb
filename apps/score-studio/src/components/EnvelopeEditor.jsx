import { useEffect, useMemo, useRef, useState } from 'react';
import { normalizeScEnv, scEnvDuration, scEnvValueAt } from '@awb/sc-envelope';

const CURVES = [ 'step', 'lin', 'exp', 'sin', 'wel', 'sqr', 'cub', 'hold' ];
const TEMPLATES = Object.freeze( {
  asr: () => normalizeScEnv( {
    levels: [ 0, 1, 0 ], times: [ 0.1, 0.5 ], curves: [ 'sin', 'sin' ], releaseNode: 1
  } ),
  adsr: () => normalizeScEnv( {
    levels: [ 0, 1, 0.65, 0 ], times: [ 0.08, 0.2, 0.5 ],
    curves: [ 'sin', 'sin', 'sin' ], releaseNode: 2
  } ),
  percussion: () => normalizeScEnv( {
    levels: [ 0, 1, 0 ], times: [ 0.01, 0.6 ], curves: [ -4, -4 ]
  } ),
  triangle: () => normalizeScEnv( {
    levels: [ 0, 1, 0 ], times: [ 0.5, 0.5 ], curves: 'lin'
  } )
} );

const round = ( value ) => Math.round( value * 1000 ) / 1000;
const clamp = ( value, minimum, maximum ) => Math.min( maximum, Math.max( minimum, value ) );

export default function EnvelopeEditor( {
  value, onChange, maxSegments = 4, disabled = false, onAudition, auditioning = false
} ) {
  const [ view, setView ] = useState( 'curve' );
  const [ form, setForm ] = useState( 'adsr' );
  const [ raw, setRaw ] = useState( JSON.stringify( value, null, 2 ) );
  const [ rawError, setRawError ] = useState( '' );
  const svgRef = useRef( null );
  const total = Math.max( scEnvDuration( value ), 0.001 );
  const points = useMemo( () => {
    let elapsed = 0;
    return value.levels.map( ( level, index ) => {
      if ( index > 0 ) elapsed += value.times[ index - 1 ];
      return { index, time: elapsed, level };
    } );
  }, [ value ] );
  const path = useMemo( () => {
    const samples = Math.max( 80, value.times.length * 50 );
    return Array.from( { length: samples + 1 }, ( _, index ) => {
      const time = total * index / samples;
      const level = scEnvValueAt( value, time );
      return `${ index ? 'L' : 'M' }${ 24 + time / total * 552 },${ 164 - clamp( level, 0, 1 ) * 140 }`;
    } ).join( ' ' );
  }, [ total, value ] );

  useEffect( () => { setRaw( JSON.stringify( value, null, 2 ) ); }, [ value ] );

  function change( envelope ) {
    setForm( 'custom' );
    onChange( envelope );
  }

  function replace( patch ) {
    change( normalizeScEnv( { ...value, ...patch } ) );
  }

  function updateLevel( index, level ) {
    const levels = [ ...value.levels ];
    levels[ index ] = round( clamp( level, 0, 1 ) );
    replace( { levels } );
  }

  function updateTime( index, time ) {
    const times = [ ...value.times ];
    times[ index ] = round( Math.max( 0, time ) );
    replace( { times } );
  }

  function updateCurve( index, curve ) {
    const curves = [ ...value.curves ];
    curves[ index ] = curve;
    replace( { curves } );
  }

  function curveAvailable( curve, index ) {
    if ( curve !== 'exp' ) return true;
    const start = value.levels[ index ];
    const end = value.levels[ index + 1 ];
    return start !== 0 && end !== 0 && Math.sign( start ) === Math.sign( end );
  }

  function beginPointDrag( event, point ) {
    if ( disabled ) return;
    event.preventDefault();
    const start = { x: event.clientX, y: event.clientY, times: [ ...value.times ], levels: [ ...value.levels ] };
    const bounds = svgRef.current.getBoundingClientRect();
    const move = ( pointer ) => {
      const levels = [ ...start.levels ];
      levels[ point.index ] = round( clamp(
        start.levels[ point.index ] - ( pointer.clientY - start.y ) / bounds.height,
        0, 1
      ) );
      const times = [ ...start.times ];
      if ( point.index > 0 && point.index < value.levels.length - 1 ) {
        const before = point.index - 1;
        const after = point.index;
        const pair = start.times[ before ] + start.times[ after ];
        const shift = ( pointer.clientX - start.x ) / bounds.width * total;
        times[ before ] = round( clamp( start.times[ before ] + shift, 0, pair ) );
        times[ after ] = round( pair - times[ before ] );
      }
      change( normalizeScEnv( { ...value, levels, times } ) );
    };
    const end = () => {
      window.removeEventListener( 'pointermove', move );
      window.removeEventListener( 'pointerup', end );
      window.removeEventListener( 'pointercancel', end );
    };
    window.addEventListener( 'pointermove', move );
    window.addEventListener( 'pointerup', end );
    window.addEventListener( 'pointercancel', end );
  }

  function addSegment() {
    if ( value.times.length >= maxSegments ) return;
    const levels = [ ...value.levels ];
    levels.splice( levels.length - 1, 0, levels.at( -2 ) ?? 0.5 );
    const times = [ ...value.times ];
    times.splice( times.length - 1, 0, 0.25 );
    const curves = [ ...value.curves ];
    curves.splice( curves.length - 1, 0, 'lin' );
    replace( { levels, times, curves, releaseNode: null, loopNode: null } );
  }

  function removeSegment() {
    if ( value.times.length <= 1 ) return;
    const levels = [ ...value.levels ];
    levels.splice( levels.length - 2, 1 );
    replace( {
      levels, times: value.times.slice( 0, -1 ), curves: value.curves.slice( 0, -1 ),
      releaseNode: null, loopNode: null
    } );
  }

  function applyRaw() {
    try {
      change( normalizeScEnv( JSON.parse( raw ) ) );
      setRawError( '' );
    } catch ( error ) { setRawError( error.message ); }
  }

  return <section className="envelopeEditor">
    <header className="envelopeEditorHeader">
      <div><strong>Editable amplitude envelope</strong><small>{ value.times.length } segments · { round( total ) }s fixed path</small></div>
      <div className="envelopeTemplates">
        <label>Form<select aria-label="Envelope form" disabled={ disabled } value={ form }
          onChange={ ( event ) => {
            setForm( event.target.value );
            if ( event.target.value !== 'custom' ) onChange( TEMPLATES[ event.target.value ]() );
          } }>
          <option value="asr">ASR</option><option value="adsr">ADSR</option>
          <option value="percussion">Percussion</option><option value="triangle">Triangle</option>
          <option value="custom">Custom</option>
        </select></label>
        <button disabled={ disabled || !onAudition } onClick={ onAudition }>{ auditioning ? 'Audition again' : 'Audition' }</button>
      </div>
    </header>
    <nav className="envelopeEditorTabs">
      { [ 'curve', 'segments', 'raw' ].map( ( mode ) => <button key={ mode }
        className={ view === mode ? 'active' : '' } onClick={ () => setView( mode ) }>{ mode }</button> ) }
    </nav>
    { view === 'curve' && <div className="envelopeCurveEditor">
      <svg ref={ svgRef } viewBox="0 0 600 180" role="img" aria-label="Editable envelope curve">
        <line x1="24" y1="164" x2="576" y2="164" /><line x1="24" y1="24" x2="24" y2="164" />
        <path d={ path } />
        { points.map( ( point ) => <g key={ point.index }>
          { value.releaseNode === point.index && <line className="releaseMarker"
            x1={ 24 + point.time / total * 552 } y1="20" x2={ 24 + point.time / total * 552 } y2="168" /> }
          <circle cx={ 24 + point.time / total * 552 } cy={ 164 - clamp( point.level, 0, 1 ) * 140 }
            r="6" tabIndex="0" onPointerDown={ ( event ) => beginPointDrag( event, point ) }>
            <title>Level { point.index }: { point.level } at { round( point.time ) }s</title>
          </circle>
        </g> ) }
      </svg>
      <p>Drag points vertically for level. Drag internal points horizontally to divide adjacent segment time.</p>
    </div> }
    { view === 'segments' && <div className="envelopeSegments">
      { value.times.map( ( time, index ) => <div className="envelopeSegment" key={ index }>
        <strong>{ index + 1 }</strong>
        <label>target<input type="number" min="0" max="1" step="0.01" disabled={ disabled }
          value={ value.levels[ index + 1 ] } onChange={ ( event ) => updateLevel( index + 1, Number( event.target.value ) ) } /></label>
        <label>time<input type="number" min="0" step="0.01" disabled={ disabled }
          value={ time } onChange={ ( event ) => updateTime( index, Number( event.target.value ) ) } /></label>
        <label>curve<select value={ typeof value.curves[ index ] === 'number' ? 'curve' : value.curves[ index ] }
          disabled={ disabled } onChange={ ( event ) => updateCurve( index, event.target.value === 'curve' ? -4 : event.target.value ) }>
          { CURVES.map( ( curve ) => <option value={ curve } key={ curve }
            disabled={ !curveAvailable( curve, index ) }>{ curve }</option> ) }
          <option value="curve">numeric</option>
        </select></label>
        { typeof value.curves[ index ] === 'number' && <label>curvature<input type="number" step="0.1"
          disabled={ disabled } value={ value.curves[ index ] }
          onChange={ ( event ) => updateCurve( index, Number( event.target.value ) ) } /></label> }
      </div> ) }
      <div className="envelopeStructure">
        <label>Release node<select value={ value.releaseNode ?? '' } disabled={ disabled }
          onChange={ ( event ) => replace( { releaseNode: event.target.value === '' ? null : Number( event.target.value ), loopNode: null } ) }>
          <option value="">none</option>{ value.times.map( ( _, index ) => <option key={ index } value={ index }>level { index }</option> ) }
        </select></label>
        <button disabled={ disabled || value.times.length >= maxSegments } onClick={ addSegment }>Add segment</button>
        <button disabled={ disabled || value.times.length <= 1 } onClick={ removeSegment }>Remove segment</button>
      </div>
    </div> }
    { view === 'raw' && <div className="envelopeRaw">
      <textarea aria-label="Envelope JSON" value={ raw } disabled={ disabled }
        onChange={ ( event ) => setRaw( event.target.value ) } />
      <button disabled={ disabled } onClick={ applyRaw }>Apply JSON</button>
      { rawError && <p className="error">{ rawError }</p> }
    </div> }
  </section>;
}
