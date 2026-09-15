import { useMemo, useState } from 'react';
import {
  commonGroup, duration, group, makeEvent, nudge, rippleFrom, setGap, sortScore, stretch, ungroup
} from '@awb/score';
import { projectSynthLifecycleLanes } from '../engine/synthLifecycleLanes.js';

const PX_PER_SECOND = 22;
const LEFT = 92;

const fmt = ( seconds ) => {
  const minutes = Math.floor( seconds / 60 );
  return `${ minutes }:${ String( Math.round( seconds % 60 ) ).padStart( 2, '0' ) }`;
};

export default function ScoreTimeline( { session, dispatch } ) {
  const [ layout, setLayout ] = useState( 'structure' );
  const [ step, setStep ] = useState( 1 );
  const [ gap, setGapValue ] = useState( 1 );
  const [ carryTail, setCarryTail ] = useState( true );
  const [ factor, setFactor ] = useState( 2 );
  const [ groupName, setGroupName ] = useState( 'group' );
  const entries = session.document.entries;
  const selected = new Set( session.selected );
  const structureLanes = useMemo( () => {
    const names = [ ...new Set( entries.map( ( entry ) => entry.path[ 0 ] ?? 'ungrouped' ) ) ];
    return names.length ? names : [ 'ungrouped' ];
  }, [ entries ] );
  const synthLanes = useMemo( () => projectSynthLifecycleLanes( entries ), [ entries ] );
  const lifecycleEnd = synthLanes.reduce( ( latest, lane ) => Math.max(
    latest, ...lane.events.map( ( event ) => event.time )
  ), 0 );
  const total = Math.max( 30, duration( entries ) + 12, lifecycleEnd + 12, session.playhead + 12 );
  const width = LEFT + total * PX_PER_SECOND + 40;
  const sharedGroup = commonGroup( entries, selected );

  const selectEntry = ( event, entryID ) => {
    event.stopPropagation();
    const additive = event.shiftKey || event.metaKey;
    const ids = additive
      ? ( selected.has( entryID )
        ? session.selected.filter( ( id ) => id !== entryID )
        : [ ...session.selected, entryID ] )
      : [ entryID ];
    dispatch( { type: 'SET_SELECTED', ids } );
  };
  const placePlayhead = ( event ) => {
    if ( event.target !== event.currentTarget ) return;
    const rect = event.currentTarget.getBoundingClientRect();
    dispatch( { type: 'SET_PLAYHEAD', time: Math.max( 0, ( event.clientX - rect.left - LEFT ) / PX_PER_SECOND ) } );
    dispatch( { type: 'SET_SELECTED', ids: [] } );
  };

  const apply = ( next ) => dispatch( { type: 'EDIT_ENTRIES', entries: next } );
  const add = () => {
    const entry = makeEvent(
      session.playhead,
      { type: 'note', def: 'substrate', freqA: 36, dur: 8 },
      { path: [] }
    );
    apply( sortScore( [ ...entries, entry ] ) );
    dispatch( { type: 'SET_SELECTED', ids: [ entry.id ] } );
  };

  return (
    <section className="scoreView">
      <div className="scoreToolbars">
        <div className="scoreToolbar">
          <span className="timeReadout">{ fmt( session.playhead ) }</span>
          <div className="layoutSwitch" aria-label="Timeline layout">
            <button className={ layout === 'structure' ? 'active' : '' }
              onClick={ () => setLayout( 'structure' ) }>Structure</button>
            <button className={ layout === 'synths' ? 'active' : '' }
              onClick={ () => setLayout( 'synths' ) }>Synth lifecycle</button>
          </div>
          <button onClick={ add }>+ note</button>
          <button disabled={ !selected.size }
            onClick={ () => apply( entries.filter( ( entry ) => !selected.has( entry.id ) ) ) }>Delete</button>
          <button disabled={ !session.undo.length } onClick={ () => dispatch( { type: 'UNDO' } ) }>Undo</button>
          <button disabled={ !session.redo.length } onClick={ () => dispatch( { type: 'REDO' } ) }>Redo</button>
          <span className="spacer" />
          <label>Step <input aria-label="Edit step" type="number" min="0.01" step="0.25" value={ step }
            onChange={ ( event ) => setStep( Number( event.target.value ) ) } /> s</label>
          <button disabled={ !selected.size }
            onClick={ () => apply( nudge( entries, selected, -step ) ) }>Earlier</button>
          <button disabled={ !selected.size }
            onClick={ () => apply( nudge( entries, selected, step ) ) }>Later</button>
          <button onClick={ () => apply( rippleFrom( entries, session.playhead, -step ) ) }>Ripple −</button>
          <button onClick={ () => apply( rippleFrom( entries, session.playhead, step ) ) }>Ripple +</button>
        </div>
        <div className="scoreToolbar structuralToolbar">
          <label>Gap <input aria-label="Gap seconds" type="number" min="0" step="0.25" value={ gap }
            onChange={ ( event ) => setGapValue( Number( event.target.value ) ) } /> s</label>
          <label className="checkLabel"><input type="checkbox" checked={ carryTail }
            onChange={ ( event ) => setCarryTail( event.target.checked ) } /> carry tail</label>
          <button disabled={ selected.size !== 2 }
            onClick={ () => apply( setGap( entries, session.selected[ 0 ], session.selected[ 1 ], gap, { ripple: carryTail } ) ) }>Set gap</button>
          <label>Stretch <input aria-label="Stretch factor" type="number" min="0.01" step="0.1" value={ factor }
            onChange={ ( event ) => setFactor( Number( event.target.value ) ) } /> ×</label>
          <button disabled={ !selected.size || !( factor > 0 ) }
            onClick={ () => apply( stretch( entries, selected, factor ) ) }>Apply stretch</button>
          <span className="spacer" />
          <label>Group <input aria-label="Group name" value={ groupName }
            onChange={ ( event ) => setGroupName( event.target.value ) } /></label>
          <button disabled={ !selected.size || !groupName.trim() }
            onClick={ () => apply( group( entries, selected, groupName.trim() ) ) }>Group</button>
          <button disabled={ !sharedGroup }
            onClick={ () => apply( ungroup( entries, selected ) ) }>Ungroup{ sharedGroup ? ` ${ sharedGroup }` : '' }</button>
        </div>
      </div>

      <div className="timelineScroll">
        <div className="timeline" style={ { width } }>
          <div className="ruler">
            { Array.from( { length: Math.floor( total / 5 ) + 1 }, ( _, index ) => index * 5 ).map( ( time ) => (
              <button key={ time } className="tick" style={ { left: LEFT + time * PX_PER_SECOND } }
                onClick={ () => dispatch( { type: 'SET_PLAYHEAD', time } ) }>{ fmt( time ) }</button>
            ) ) }
          </div>
          { layout === 'structure'
            ? structureLanes.map( ( lane ) => (
              <div key={ lane } className="lane" onClick={ placePlayhead }>
                <span className="laneName">{ lane }</span>
                { entries.filter( ( entry ) => ( entry.path[ 0 ] ?? 'ungrouped' ) === lane ).map( ( entry ) => (
                  <button key={ entry.id }
                    className={ `scoreEvent ${ entry.event.type }${ selected.has( entry.id ) ? ' selected' : '' }` }
                    style={ { left: LEFT + entry.time * PX_PER_SECOND } }
                    onClick={ ( event ) => selectEntry( event, entry.id ) }
                    title={ `${ entry.id } · ${ entry.time }s · ${ entry.path.join( '/' ) || 'ungrouped' }` }
                  >{ entry.event.def ?? entry.event.type }</button>
                ) ) }
              </div>
            ) )
            : synthLanes.map( ( lane ) => (
              <div key={ lane.id } className="lane synthLane" onClick={ placePlayhead }>
                <span className="laneName synthLaneName" title={ lane.path.join( '/' ) }>
                  <strong>{ lane.id === '__unassigned__' ? 'unassigned' : lane.id }</strong>
                  <small>{ lane.definition }{ lane.expansionCount > 1 ? ` ×${ lane.expansionCount }` : '' }</small>
                </span>
                { lane.events.map( ( marker, index ) => (
                  <button key={ `${ marker.entry.id }:${ marker.role }:${ index }` }
                    className={ `scoreEvent lifecycleEvent ${ marker.role }${ selected.has( marker.entry.id ) ? ' selected' : '' }` }
                    style={ { left: LEFT + marker.time * PX_PER_SECOND } }
                    onClick={ ( event ) => selectEntry( event, marker.entry.id ) }
                    title={ `${ marker.role } · ${ marker.entry.id } · ${ marker.time }s${ marker.synthetic ? ' · derived, not authored' : '' }` }
                  >{ marker.role === 'create'
                    ? `create ${ lane.expansionCount > 1 ? `×${ lane.expansionCount }` : '' }`
                    : marker.role.replace( '-', ' ' ) }</button>
                ) ) }
              </div>
            ) ) }
          <div className="playhead" style={ { left: LEFT + session.playhead * PX_PER_SECOND } } />
        </div>
      </div>
    </section>
  );
}
