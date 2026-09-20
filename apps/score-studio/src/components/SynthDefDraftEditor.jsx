import { useEffect, useMemo, useState } from 'react';
import { scEnvAsControlArray, scEnvFromControlArray } from '@awb/sc-envelope';
import ControlSlider from './ControlSlider.jsx';
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
  focus, onAudition, onStopAudition, auditionCount = 0,
  onRuntimeSet, onRuntimeCommand, onRuntimeCopy
} ) {
  const model = focus.description?.interface;
  const defaults = useMemo( () => synthDefDraftValues( model, focus.initialValues ),
    [ focus.initialValues, model ] );
  const [ values, setValues ] = useState( defaults );
  const [ error, setError ] = useState( '' );
  if ( focus.stale ) return <p className="emptyCopy">The hosted SynthDef context changed. Refreshing this exact interface before it can be inspected or auditioned.</p>;
  if ( focus.error ) return <p className="error">{ focus.error }</p>;
  if ( !model ) return <p className="emptyCopy">Loading the exact compiled SynthDef interface…</p>;

  function updateControl( name, value, controlWidth = 1 ) {
    setValues( ( current ) => ( { ...current, [ name ]: value } ) );
    if ( focus.runtimeTarget && onRuntimeSet ) {
      Promise.resolve( onRuntimeSet( name, value, controlWidth ) )
        .then( ( applied ) => { if ( applied === false ) setError( 'That playing instance is no longer active.' ); } )
        .catch( ( nextError ) => setError( nextError.message ) );
    }
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

  async function runtimeCommand( action ) {
    setError( '' );
    try { await onRuntimeCommand( action ); }
    catch ( nextError ) { setError( nextError.message ); }
  }

  const runtimeState = focus.runtimeTarget?.state;
  const runtimeLive = [ 'running', 'started', 'paused', 'releasing', 'released', 'ending' ].includes( runtimeState );

  return <div className="synthDefDraft">
    { focus.signalKind !== 'audio' && <p className="nonAudioNotice"><strong>{ focus.signalKind } SynthDef</strong>
      { focus.signalKind === 'control'
        ? 'This graph writes control-rate output. It is available for inspection and composition, but it is not an audible audition target.'
        : 'This utility graph has no audio/control output path. It is available for inspection and composition, but Play will remain unavailable.' }</p> }
    <section className="synthDraftSection"><header><strong>Controls</strong>
      <small>Audition values for the selected definition or playing voice.</small></header>
      <div className="synthDraftControls">
      { model.controls.map( ( control ) => control.numChannels === 1 && !Array.isArray( values[ control.name ] )
        ? <ControlSlider key={ control.name } name={ control.name } value={ values[ control.name ] }
          detail={ [ control.roles.join( ', ' ) || control.rate, control.spec?.unit ].filter( Boolean ).join( ' · ' ) }
          min={ control.spec?.min } max={ control.spec?.max }
          warp={ control.spec?.warp } step={ control.spec?.step ?? 0 } unit={ control.spec?.unit }
          disabled={ Boolean( focus.runtimeTarget ) && !runtimeLive }
          onChange={ ( next ) => updateControl( control.name, next, control.numChannels ) } />
        : control.numChannels === 1
          ? <DraftExpandedControl key={ control.name } control={ control } value={ values[ control.name ] }
            disabled={ Boolean( focus.runtimeTarget ) && !runtimeLive }
            onChange={ ( value ) => updateControl( control.name, value, control.numChannels ) } />
          : <DraftArrayControl key={ control.name } control={ control } value={ values[ control.name ] }
            disabled={ Boolean( focus.runtimeTarget ) && !runtimeLive }
            onChange={ ( value ) => updateControl( control.name, value, control.numChannels ) } /> ) }
      </div>
    </section>
    <section className="synthDraftSection"><header><strong>Envelopes</strong>
      <small>Compiled envelope projections and editable controls where supported.</small></header>
      <div className="synthDraftEnvelopes">
      { editableEnvelope && envelopeValue && ( !focus.runtimeTarget || runtimeLive ) && <div className="compactEnvelopeEditor"><EnvelopeEditor
        value={ envelopeValue } maxSegments={ editableEnvelope.editor.maxSegments }
        onAudition={ play }
        onChange={ ( envelope ) => updateControl( editableEnvelope.editor.control,
          [ ...scEnvAsControlArray( envelope, editableEnvelope.editor.maxSegments ) ],
          model.controls.find( ( control ) => control.name === editableEnvelope.editor.control )?.numChannels ?? 1 ) } /></div> }
      { model.envelopes.length ? model.envelopes.map( ( envelope ) => <EnvelopeProjection
        key={ envelope.ugenIndex } envelope={ envelope } values={ values } /> )
        : <p className="emptyCopy">No EnvGen envelope found in the compiled graph.</p> }
      </div>
    </section>
    { focus.runtimeTarget ? <div className="liveVoiceActions">
      <span className="liveVoiceBadge"><strong>Live voice</strong>
        synth { focus.runtimeTarget.nodeID } · { runtimeState ?? 'ended' }</span>
      <button disabled={ !runtimeLive || [ 'releasing', 'released', 'ending' ].includes( runtimeState ) }
        onClick={ () => runtimeCommand( runtimeState === 'paused' ? 'resume' : 'pause' ) }>
        { runtimeState === 'paused' ? 'Resume' : 'Pause' }</button>
      <button disabled={ !runtimeLive || [ 'releasing', 'released', 'ending' ].includes( runtimeState ) }
        onClick={ () => runtimeCommand( 'release' ) }>Release</button>
      <button disabled={ !runtimeLive } onClick={ () => runtimeCommand( 'free' ) }>Free</button>
      <button disabled={ !onRuntimeCopy } onClick={ onRuntimeCopy }>Audition copy</button>
    </div> : <div className="focusAuditionActions">
      <button disabled={ focus.signalKind !== 'audio' || !onAudition } onClick={ play }>Play</button>
      <button disabled={ auditionCount === 0 } onClick={ onStopAudition }>Stop ({ auditionCount })</button>
      <span>Each Play creates a fresh owned realization.</span>
    </div> }
    { error && <p className="error">{ error }</p> }
    <p className="boundaryNote">{ focus.runtimeTarget
      ? 'Live instance. Control changes and lifecycle commands address this synth node only; they do not rewrite the authored score event.'
      : 'Draft only. Auditioning does not create or modify a score event.' }</p>
  </div>;
}

function DraftExpandedControl( { control, value, onChange, disabled = false } ) {
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
    <input aria-label={ `Draft ${ control.name }` } value={ text } disabled={ disabled }
      onChange={ ( event ) => setText( event.target.value ) } onBlur={ commit }
      onKeyDown={ ( event ) => { if ( event.key === 'Enter' ) { event.preventDefault(); commit(); } } } />
    { error && <small className="error">{ error }</small> }
  </label>;
}

function DraftArrayControl( { control, value, onChange, disabled = false } ) {
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
    <input aria-label={ `Draft ${ control.name }` } value={ text } disabled={ disabled }
      onChange={ ( event ) => setText( event.target.value ) } onBlur={ commit }
      onKeyDown={ ( event ) => { if ( event.key === 'Enter' ) { event.preventDefault(); commit(); } } } />
    { error && <small className="error">{ error }</small> }
  </label>;
}
