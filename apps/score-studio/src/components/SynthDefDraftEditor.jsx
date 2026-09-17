import { useMemo, useState } from 'react';

const formatNumber = ( value ) => Number.isFinite( value ) ? Number( value.toPrecision( 7 ) ) : value;

function expressionText( expression ) {
  if ( !expression ) return 'unknown';
  if ( expression.kind === 'constant' ) return `${ formatNumber( expression.value ) }`;
  if ( expression.kind === 'control' ) return `\\${ expression.name }${ expression.channel === undefined ? '' : `[${ expression.channel }]` }`;
  if ( expression.kind === 'binary' ) return `(${ expressionText( expression.left ) } ${ expression.operator } ${ expressionText( expression.right ) })`;
  if ( expression.kind === 'unary' ) return `${ expression.operator }(${ expressionText( expression.value ) })`;
  return expression.ugen ? `${ expression.ugen } output` : expression.kind;
}

function evaluate( expression, values ) {
  if ( expression?.kind === 'constant' ) return expression.value;
  if ( expression?.kind === 'control' ) {
    const value = values[ expression.name ];
    return expression.channel === undefined ? value : value?.[ expression.channel ];
  }
  if ( expression?.kind !== 'binary' ) return null;
  const left = evaluate( expression.left, values );
  const right = evaluate( expression.right, values );
  if ( !Number.isFinite( left ) || !Number.isFinite( right ) ) return null;
  if ( expression.operator === '+' ) return left + right;
  if ( expression.operator === '-' ) return left - right;
  if ( expression.operator === '*' ) return left * right;
  if ( expression.operator === '/' || expression.operator === 'div' ) return right === 0 ? null : left / right;
  if ( expression.operator === 'min' ) return Math.min( left, right );
  if ( expression.operator === 'max' ) return Math.max( left, right );
  return null;
}

function EnvelopeProjection( { envelope, values } ) {
  const points = [];
  let time = 0;
  const initial = evaluate( envelope.envelope.initialLevel, values );
  if ( Number.isFinite( initial ) ) points.push( { time, level: initial } );
  for ( const stage of envelope.envelope.stages ) {
    const duration = evaluate( stage.duration, values );
    const level = evaluate( stage.target, values );
    if ( !Number.isFinite( duration ) || !Number.isFinite( level ) ) continue;
    time += Math.max( 0, duration );
    points.push( { time, level } );
  }
  const levels = points.map( ( point ) => point.level );
  const min = Math.min( 0, ...levels );
  const max = Math.max( 1, ...levels );
  const polyline = points.length > 1 ? points.map( ( point ) => {
    const x = time > 0 ? 8 + ( point.time / time ) * 224 : 8;
    const y = 62 - ( ( point.level - min ) / Math.max( 0.0001, max - min ) ) * 52;
    return `${ x },${ y }`;
  } ).join( ' ' ) : '';
  return <div className="compactEnvelope">
    <header><strong>{ envelope.targets.join( ', ' ) || 'unclassified envelope' }</strong>
      <span>{ envelope.editor.kind }</span></header>
    { polyline
      ? <svg viewBox="0 0 240 70" role="img" aria-label="Envelope projection"><polyline points={ polyline } /></svg>
      : <p>Envelope shape depends on runtime expressions that cannot be projected from scalar defaults.</p> }
    <small>{ envelope.envelope.stages.map( ( stage, index ) => `stage ${ index + 1 }: ${ expressionText( stage.target ) } over ${ expressionText( stage.duration ) }` ).join( ' · ' ) }</small>
  </div>;
}

export default function SynthDefDraftEditor( { focus } ) {
  const model = focus.description?.interface;
  const defaults = useMemo( () => Object.fromEntries( ( model?.controls ?? [] )
    .map( ( control ) => [ control.name, control.default ] ) ), [ model ] );
  const [ values, setValues ] = useState( defaults );
  if ( focus.error ) return <p className="error">{ focus.error }</p>;
  if ( !model ) return <p className="emptyCopy">Loading the exact compiled SynthDef interface…</p>;

  function updateScalar( name, value ) {
    setValues( ( current ) => ( { ...current, [ name ]: value } ) );
  }

  return <div className="synthDefDraft">
    { focus.signalKind !== 'audio' && <p className="nonAudioNotice"><strong>{ focus.signalKind } SynthDef</strong>
      { focus.signalKind === 'control'
        ? 'This graph writes control-rate output. It is available for inspection and composition, but it is not an audible audition target.'
        : 'This utility graph has no audio/control output path. It is available for inspection and composition, but Play will remain unavailable.' }</p> }
    <div className="synthDraftControls">
      { model.controls.map( ( control ) => control.numChannels === 1
        ? <label key={ control.name }><span><code>{ control.name }</code>
          <small>{ control.roles.join( ', ' ) || control.rate }{ control.spec?.unit ? ` · ${ control.spec.unit }` : '' }</small></span>
          <input aria-label={ `Draft ${ control.name }` } type="number" value={ values[ control.name ] }
            min={ control.spec?.min } max={ control.spec?.max } step={ control.spec?.step || 'any' }
            onChange={ ( event ) => {
              const next = Number( event.target.value );
              if ( Number.isFinite( next ) ) updateScalar( control.name, next );
            } } /></label>
        : <div className="draftArrayControl" key={ control.name }><span><code>{ control.name }</code>
          <small>{ control.numChannels } values · structural changes apply on a future audition</small></span>
          <code>{ JSON.stringify( values[ control.name ] ) }</code></div> ) }
    </div>
    <div className="synthDraftEnvelopes">
      { model.envelopes.length ? model.envelopes.map( ( envelope ) => <EnvelopeProjection
        key={ envelope.ugenIndex } envelope={ envelope } values={ values } /> )
        : <p className="emptyCopy">No EnvGen envelope found in the compiled graph.</p> }
    </div>
    <p className="boundaryNote">Draft only. Slice C adds isolated Play and Stop for audio definitions with a safe lifecycle and routing contract; changing these controls does not create or modify a score event.</p>
  </div>;
}
