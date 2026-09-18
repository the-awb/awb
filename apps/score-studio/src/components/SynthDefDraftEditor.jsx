import { useEffect, useMemo, useState } from 'react';
import { scEnvAsControlArray, scEnvFromControlArray } from '@awb/sc-envelope';
import EnvelopeEditor from './EnvelopeEditor.jsx';
import { formatScValue, parseScValue } from '../engine/scValueSyntax.js';
import { scRef, unwrapScRef } from '../engine/scEventSemantics.js';
import { synthDefDraftValues } from '../engine/synthDefDraftValues.js';

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

export default function SynthDefDraftEditor( {
  focus, onAudition, onStopAudition, auditionCount = 0
} ) {
  const model = focus.description?.interface;
  const defaults = useMemo( () => synthDefDraftValues( model, focus.initialValues ),
    [ focus.initialValues, model ] );
  const [ values, setValues ] = useState( defaults );
  const [ error, setError ] = useState( '' );
  if ( focus.stale ) return <p className="emptyCopy">The hosted SynthDef context changed. Refreshing this exact interface before it can be inspected or auditioned.</p>;
  if ( focus.error ) return <p className="error">{ focus.error }</p>;
  if ( !model ) return <p className="emptyCopy">Loading the exact compiled SynthDef interface…</p>;

  function updateScalar( name, value ) {
    setValues( ( current ) => ( { ...current, [ name ]: value } ) );
  }

  const editableEnvelope = model.envelopes.find( ( envelope ) => envelope.editor.kind === 'envArray' );
  let envelopeValue = null;
  if ( editableEnvelope ) {
    try { envelopeValue = scEnvFromControlArray( values[ editableEnvelope.editor.control ] ); }
    catch { /* an invalid draft remains editable through its raw array field */ }
  }

  async function play() {
    setError( '' );
    try { await onAudition( { definition: focus.name, params: values, model } ); }
    catch ( nextError ) { setError( nextError.message ); }
  }

  return <div className="synthDefDraft">
    { focus.signalKind !== 'audio' && <p className="nonAudioNotice"><strong>{ focus.signalKind } SynthDef</strong>
      { focus.signalKind === 'control'
        ? 'This graph writes control-rate output. It is available for inspection and composition, but it is not an audible audition target.'
        : 'This utility graph has no audio/control output path. It is available for inspection and composition, but Play will remain unavailable.' }</p> }
    <div className="synthDraftControls">
      { model.controls.map( ( control ) => control.numChannels === 1 && !Array.isArray( values[ control.name ] )
        ? <label key={ control.name }><span><code>{ control.name }</code>
          <small>{ control.roles.join( ', ' ) || control.rate }{ control.spec?.unit ? ` · ${ control.spec.unit }` : '' }</small></span>
          <input aria-label={ `Draft ${ control.name }` } type="number" value={ values[ control.name ] }
            min={ control.spec?.min } max={ control.spec?.max } step={ control.spec?.step || 'any' }
            onChange={ ( event ) => {
              const next = Number( event.target.value );
              if ( Number.isFinite( next ) ) updateScalar( control.name, next );
            } } /></label>
        : control.numChannels === 1
          ? <DraftExpandedControl key={ control.name } control={ control } value={ values[ control.name ] }
            onChange={ ( value ) => setValues( ( current ) => ( { ...current, [ control.name ]: value } ) ) } />
          : <DraftArrayControl key={ control.name } control={ control } value={ values[ control.name ] }
            onChange={ ( value ) => setValues( ( current ) => ( { ...current, [ control.name ]: value } ) ) } /> ) }
    </div>
    <div className="synthDraftEnvelopes">
      { editableEnvelope && envelopeValue && <div className="compactEnvelopeEditor"><EnvelopeEditor
        value={ envelopeValue } maxSegments={ editableEnvelope.editor.maxSegments }
        onAudition={ play }
        onChange={ ( envelope ) => updateScalar( editableEnvelope.editor.control,
          [ ...scEnvAsControlArray( envelope, editableEnvelope.editor.maxSegments ) ] ) } /></div> }
      { model.envelopes.length ? model.envelopes.map( ( envelope ) => <EnvelopeProjection
        key={ envelope.ugenIndex } envelope={ envelope } values={ values } /> )
        : <p className="emptyCopy">No EnvGen envelope found in the compiled graph.</p> }
    </div>
    <div className="focusAuditionActions">
      <button disabled={ focus.signalKind !== 'audio' || !onAudition } onClick={ play }>Play</button>
      <button disabled={ auditionCount === 0 } onClick={ onStopAudition }>Stop ({ auditionCount })</button>
      <span>Each Play creates a fresh owned realization.</span>
    </div>
    { error && <p className="error">{ error }</p> }
    <p className="boundaryNote">Draft only. Auditioning does not create or modify a score event.</p>
  </div>;
}

function DraftExpandedControl( { control, value, onChange } ) {
  const [ text, setText ] = useState( () => formatScValue( value ) );
  const [ error, setError ] = useState( '' );
  useEffect( () => setText( formatScValue( value ) ), [ value ] );
  function commit() {
    try {
      const parsed = parseScValue( text );
      if ( !Array.isArray( parsed ) || parsed.length === 0
        || parsed.some( ( item ) => !Number.isFinite( item ) ) ) {
        throw new Error( 'Voice array must contain one or more finite numbers.' );
      }
      onChange( parsed ); setError( '' );
    } catch ( nextError ) { setError( nextError.message ); }
  }
  return <label className="draftArrayControl"><span><code>{ control.name }</code>
    <small>{ value.length } expanded voices</small></span>
    <input aria-label={ `Draft ${ control.name }` } value={ text }
      onChange={ ( event ) => setText( event.target.value ) } onBlur={ commit }
      onKeyDown={ ( event ) => { if ( event.key === 'Enter' ) { event.preventDefault(); commit(); } } } />
    { error && <small className="error">{ error }</small> }
  </label>;
}

function DraftArrayControl( { control, value, onChange } ) {
  const [ text, setText ] = useState( () => formatScValue( scRef( value ) ) );
  const [ error, setError ] = useState( '' );
  useEffect( () => setText( formatScValue( scRef( value ) ) ), [ value ] );
  function commit() {
    try {
      const parsed = unwrapScRef( parseScValue( text ) );
      if ( !Array.isArray( parsed ) || parsed.length !== control.numChannels
        || parsed.some( ( item ) => !Number.isFinite( item ) ) ) {
        throw new Error( `Ref array must contain ${ control.numChannels } finite numbers.` );
      }
      onChange( parsed ); setError( '' );
    } catch ( nextError ) { setError( nextError.message ); }
  }
  return <label className="draftArrayControl"><span><code>{ control.name }</code>
    <small>{ control.numChannels } literal values</small></span>
    <input aria-label={ `Draft ${ control.name }` } value={ text }
      onChange={ ( event ) => setText( event.target.value ) } onBlur={ commit }
      onKeyDown={ ( event ) => { if ( event.key === 'Enter' ) { event.preventDefault(); commit(); } } } />
    { error && <small className="error">{ error }</small> }
  </label>;
}
