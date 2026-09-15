import { useEffect, useMemo, useRef, useState } from 'react';
import {
  commonGroup, duration, group, makeEvent, nudge, rippleFrom, setGap, sortScore, stretch, ungroup
} from '@awb/score';
import { projectSynthLifecycleLanes } from '../engine/synthLifecycleLanes.js';
import { formatTimelineTime, timelineTicks } from '../engine/timelineScale.js';

const LEFT = 92;
const MIN_ZOOM = 1;
const MAX_ZOOM = 160;

function retainLaneOrder( orderRef, names ) {
  const present = new Set( names );
  orderRef.current = [
    ...orderRef.current.filter( ( name ) => present.has( name ) ),
    ...names.filter( ( name ) => !orderRef.current.includes( name ) )
  ];
  return orderRef.current;
}

export default function ScoreTimeline( { session, dispatch } ) {
  const [ layout, setLayout ] = useState( 'structure' );
  const [ step, setStep ] = useState( 1 );
  const [ gap, setGapValue ] = useState( 1 );
  const [ carryTail, setCarryTail ] = useState( true );
  const [ factor, setFactor ] = useState( 2 );
  const [ groupName, setGroupName ] = useState( 'group' );
  const [ pxPerSecond, setPxPerSecond ] = useState( 22 );
  const [ expandedSynths, setExpandedSynths ] = useState( new Set() );
  const [ drag, setDrag ] = useState( null );
  const [ envelopeDrag, setEnvelopeDrag ] = useState( null );
  const [ durationDrag, setDurationDrag ] = useState( null );
  const scrollRef = useRef( null );
  const dragRef = useRef( null );
  const removeDragListenersRef = useRef( () => {} );
  const removeHandleListenersRef = useRef( () => {} );
  const scoreIDRef = useRef( null );
  const structureOrderRef = useRef( [] );
  const synthOrderRef = useRef( [] );
  const entries = session.document.entries;
  if ( scoreIDRef.current !== session.document.scoreID ) {
    scoreIDRef.current = session.document.scoreID;
    structureOrderRef.current = [];
    synthOrderRef.current = [];
  }
  const selected = new Set( session.selected );
  const visibleEntries = useMemo(
    () => drag ? nudge( entries, drag.ids, drag.delta ) : entries,
    [ entries, drag ]
  );
  const structureNames = [ ...new Set( entries.map( ( entry ) => entry.path[ 0 ] ?? 'ungrouped' ) ) ];
  const structureLanes = retainLaneOrder( structureOrderRef, structureNames.length ? structureNames : [ 'ungrouped' ] );
  const baseSynthLanes = useMemo( () => projectSynthLifecycleLanes( entries ), [ entries ] );
  const stableSynthOrder = new Map(
    retainLaneOrder( synthOrderRef, baseSynthLanes.map( ( lane ) => lane.id ) )
      .map( ( laneID, index ) => [ laneID, index ] )
  );
  const synthLanes = useMemo( () => projectSynthLifecycleLanes( visibleEntries ).sort( ( a, b ) =>
    ( stableSynthOrder.get( a.id ) ?? Number.MAX_SAFE_INTEGER )
      - ( stableSynthOrder.get( b.id ) ?? Number.MAX_SAFE_INTEGER )
  ), [ visibleEntries, stableSynthOrder ] );
  const lifecycleEnd = synthLanes.reduce( ( latest, lane ) => Math.max(
    latest, lane.endTime ?? 0, ...lane.events.map( ( event ) => event.time )
  ), 0 );
  const total = Math.max( 30, duration( visibleEntries ) + 12, lifecycleEnd + 12, session.playhead + 12 );
  const width = LEFT + total * pxPerSecond + 40;
  const ruler = timelineTicks( total, pxPerSecond );
  const sharedGroup = commonGroup( entries, selected );

  const placePlayhead = ( event ) => {
    if ( event.target !== event.currentTarget ) return;
    const rect = event.currentTarget.getBoundingClientRect();
    dispatch( { type: 'SET_PLAYHEAD', time: Math.max( 0, ( event.clientX - rect.left - LEFT ) / pxPerSecond ) } );
    dispatch( { type: 'SET_SELECTED', ids: [] } );
  };

  const apply = ( next ) => dispatch( { type: 'EDIT_ENTRIES', entries: next } );
  const beginDrag = ( event, entryID ) => {
    if ( event.button !== 0 ) return;
    event.preventDefault();
    event.stopPropagation();
    const additive = event.shiftKey || event.metaKey;
    let ids;
    if ( additive ) {
      ids = selected.has( entryID )
        ? session.selected.filter( ( id ) => id !== entryID )
        : [ ...session.selected, entryID ];
    } else ids = selected.has( entryID ) ? session.selected : [ entryID ];
    dispatch( { type: 'SET_SELECTED', ids } );
    if ( !ids.includes( entryID ) ) return;
    event.currentTarget.setPointerCapture( event.pointerId );
    const next = { pointerId: event.pointerId, startX: event.clientX, ids, delta: 0 };
    dragRef.current = next;
    setDrag( next );
    removeDragListenersRef.current();
    const move = ( pointerEvent ) => {
      const current = dragRef.current;
      if ( !current ) return;
      pointerEvent.preventDefault();
      const delta = Math.round( ( pointerEvent.clientX - current.startX ) / pxPerSecond * 1000 ) / 1000;
      const moved = { ...current, delta };
      dragRef.current = moved;
      setDrag( moved );
    };
    const end = ( pointerEvent ) => {
      const current = dragRef.current;
      if ( !current ) return;
      pointerEvent.preventDefault();
      removeDragListenersRef.current();
      dragRef.current = null;
      setDrag( null );
      if ( current.delta ) apply( nudge( entries, current.ids, current.delta ) );
    };
    window.addEventListener( 'pointermove', move );
    window.addEventListener( 'pointerup', end );
    window.addEventListener( 'pointercancel', end );
    window.addEventListener( 'mousemove', move );
    window.addEventListener( 'mouseup', end );
    removeDragListenersRef.current = () => {
      window.removeEventListener( 'pointermove', move );
      window.removeEventListener( 'pointerup', end );
      window.removeEventListener( 'pointercancel', end );
      window.removeEventListener( 'mousemove', move );
      window.removeEventListener( 'mouseup', end );
      removeDragListenersRef.current = () => {};
    };
  };
  useEffect( () => () => {
    removeDragListenersRef.current();
    removeHandleListenersRef.current();
  }, [] );
  const dragProps = ( entryID ) => ( {
    onPointerDown: ( event ) => beginDrag( event, entryID ),
    onDragStart: ( event ) => event.preventDefault()
  } );
  const beginEnvelopeDrag = ( event, lane, edge ) => {
    const control = edge === 'attack' ? lane.envelope?.attackControl : lane.envelope?.releaseControl;
    if ( event.button !== 0 || !control ) return;
    event.preventDefault();
    event.stopPropagation();
    dispatch( { type: 'SET_SELECTED', ids: [ lane.id ] } );
    removeHandleListenersRef.current();
    const initial = lane.envelope[ edge ];
    const startX = event.clientX;
    const move = ( pointerEvent ) => {
      const value = Math.max( 0, Math.round( ( initial + ( pointerEvent.clientX - startX ) / pxPerSecond ) * 100 ) / 100 );
      setEnvelopeDrag( { laneID: lane.id, edge, value } );
    };
    const end = ( pointerEvent ) => {
      const value = Math.max( 0, Math.round( ( initial + ( pointerEvent.clientX - startX ) / pxPerSecond ) * 100 ) / 100 );
      removeHandleListenersRef.current();
      setEnvelopeDrag( null );
      apply( entries.map( ( entry ) => entry.id === lane.id
        ? { ...entry, event: { ...entry.event, [ control ]: value } }
        : entry ) );
      dispatch( { type: 'SET_SELECTED', ids: [ lane.id ] } );
    };
    window.addEventListener( 'pointermove', move );
    window.addEventListener( 'pointerup', end );
    window.addEventListener( 'pointercancel', end );
    removeHandleListenersRef.current = () => {
      window.removeEventListener( 'pointermove', move );
      window.removeEventListener( 'pointerup', end );
      window.removeEventListener( 'pointercancel', end );
      removeHandleListenersRef.current = () => {};
    };
  };
  const beginDurationDrag = ( event, lane ) => {
    if ( event.button !== 0 || !lane.gateMarker ) return;
    event.preventDefault();
    event.stopPropagation();
    removeHandleListenersRef.current();
    const initial = lane.gateReleaseTime;
    const startX = event.clientX;
    const move = ( pointerEvent ) => {
      const time = Math.max( lane.startTime, Math.round( ( initial + ( pointerEvent.clientX - startX ) / pxPerSecond ) * 1000 ) / 1000 );
      setDurationDrag( { laneID: lane.id, time } );
    };
    const end = ( pointerEvent ) => {
      const time = Math.max( lane.startTime, Math.round( ( initial + ( pointerEvent.clientX - startX ) / pxPerSecond ) * 1000 ) / 1000 );
      const marker = lane.gateMarker;
      removeHandleListenersRef.current();
      setDurationDrag( null );
      if ( marker.synthetic ) {
        apply( entries.map( ( entry ) => {
          if ( entry.id !== lane.id ) return entry;
          const sustain = time - lane.startTime;
          if ( entry.event.sustain !== undefined ) {
            return { ...entry, event: { ...entry.event, sustain } };
          }
          const legato = Number( entry.event.legato ?? 0.8 );
          return Number.isFinite( legato ) && legato > 0
            ? { ...entry, event: { ...entry.event, dur: sustain / legato } }
            : { ...entry, event: { ...entry.event, sustain } };
        } ) );
        dispatch( { type: 'SET_SELECTED', ids: [ lane.id ] } );
      } else {
        apply( entries.map( ( entry ) => entry.id === marker.entry.id ? { ...entry, time } : entry ) );
        dispatch( { type: 'SET_SELECTED', ids: [ marker.entry.id ] } );
      }
    };
    window.addEventListener( 'pointermove', move );
    window.addEventListener( 'pointerup', end );
    window.addEventListener( 'pointercancel', end );
    removeHandleListenersRef.current = () => {
      window.removeEventListener( 'pointermove', move );
      window.removeEventListener( 'pointerup', end );
      window.removeEventListener( 'pointercancel', end );
      removeHandleListenersRef.current = () => {};
    };
  };
  const changeZoom = ( requested ) => {
    const next = Math.max( MIN_ZOOM, Math.min( MAX_ZOOM, requested ) );
    const scroll = scrollRef.current;
    const centreTime = scroll
      ? Math.max( 0, ( scroll.scrollLeft + scroll.clientWidth / 2 - LEFT ) / pxPerSecond )
      : 0;
    setPxPerSecond( next );
    requestAnimationFrame( () => {
      if ( scroll ) scroll.scrollLeft = Math.max( 0, LEFT + centreTime * next - scroll.clientWidth / 2 );
    } );
  };
  const fitTimeline = () => {
    const available = ( scrollRef.current?.clientWidth ?? 800 ) - LEFT - 40;
    changeZoom( available / Math.max( total, 1 ) );
  };
  const toggleSynth = ( laneID ) => setExpandedSynths( ( current ) => {
    const next = new Set( current );
    if ( next.has( laneID ) ) next.delete( laneID );
    else next.add( laneID );
    return next;
  } );
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
          <span className="timeReadout">{ formatTimelineTime( session.playhead, 0.001 ) }</span>
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
          <div className="zoomControls" aria-label="Timeline zoom">
            <button aria-label="Zoom out" disabled={ pxPerSecond <= MIN_ZOOM }
              onClick={ () => changeZoom( pxPerSecond / 1.6 ) }>−</button>
            <button aria-label="Fit timeline" onClick={ fitTimeline }>Fit</button>
            <button aria-label="Zoom in" disabled={ pxPerSecond >= MAX_ZOOM }
              onClick={ () => changeZoom( pxPerSecond * 1.6 ) }>+</button>
            <output>{ Math.round( pxPerSecond ) } px/s</output>
          </div>
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

      <div className="timelineScroll" ref={ scrollRef }>
        <div className="timeline" style={ { width } }>
          <div className="ruler">
            { ruler.values.map( ( time ) => (
              <button key={ time } className="tick" style={ { left: LEFT + time * pxPerSecond } }
                onClick={ () => dispatch( { type: 'SET_PLAYHEAD', time } ) }>{ formatTimelineTime( time, ruler.step ) }</button>
            ) ) }
          </div>
          { layout === 'structure'
            ? structureLanes.map( ( lane ) => (
              <div key={ lane } className="lane" onClick={ placePlayhead }>
                <span className="laneName">{ lane }</span>
                { visibleEntries.filter( ( entry ) => ( entry.path[ 0 ] ?? 'ungrouped' ) === lane ).map( ( entry ) => (
                  <button key={ entry.id }
                    className={ `scoreEvent ${ entry.event.type }${ selected.has( entry.id ) ? ' selected' : '' }${ drag?.ids.includes( entry.id ) ? ' dragging' : '' }` }
                    style={ { left: LEFT + entry.time * pxPerSecond } }
                    { ...dragProps( entry.id ) }
                    title={ `${ entry.id } · ${ entry.time }s · ${ entry.path.join( '/' ) || 'ungrouped' }` }
                  >{ entry.event.def ?? entry.event.type }</button>
                ) ) }
              </div>
            ) )
            : synthLanes.map( ( lane ) => {
              const unassigned = lane.id === '__unassigned__';
              const expanded = unassigned || expandedSynths.has( lane.id );
              const endTime = lane.endTime ?? Math.max( lane.startTime + 1, lifecycleEnd );
              const shownAttack = envelopeDrag?.laneID === lane.id && envelopeDrag.edge === 'attack'
                ? envelopeDrag.value : lane.envelope?.attack ?? 0;
              const shownRelease = envelopeDrag?.laneID === lane.id && envelopeDrag.edge === 'release'
                ? envelopeDrag.value : lane.envelope?.release ?? 0;
              const shownGate = durationDrag?.laneID === lane.id ? durationDrag.time : lane.gateReleaseTime;
              const envelopeEnd = shownGate === null ? endTime : shownGate + shownRelease;
              const shownEnd = lane.freeTime === null ? envelopeEnd : Math.min( envelopeEnd, lane.freeTime );
              const attackEnd = Math.min( shownEnd, lane.startTime + shownAttack );
              const releaseStart = shownGate === null ? shownEnd : Math.min( shownEnd, shownGate );
              const triggers = lane.events.filter( ( marker ) => marker.role !== 'create' );
              return (
                <div key={ lane.id } className={ `lane synthLane${ expanded ? ' expanded' : '' }` } onClick={ placePlayhead }>
                  <span className="laneName synthLaneName" title={ lane.path.join( '/' ) }>
                    { !unassigned && <button className="synthDisclosure" aria-label={ `${ expanded ? 'Collapse' : 'Expand' } ${ lane.id }` }
                      onClick={ ( event ) => { event.stopPropagation(); toggleSynth( lane.id ); } }>{ expanded ? '▾' : '▸' }</button> }
                    <span>
                      <strong>{ unassigned ? 'unassigned' : lane.id }</strong>
                      <small>{ lane.definition }{ lane.expansionCount > 1 ? ` ×${ lane.expansionCount }` : '' }</small>
                    </span>
                  </span>
                  { !unassigned && <button
                    className={ `synthBar${ selected.has( lane.id ) ? ' selected' : '' }${ drag?.ids.includes( lane.id ) ? ' dragging' : '' }` }
                    style={ {
                      left: LEFT + lane.startTime * pxPerSecond,
                      width: Math.max( 12, ( shownEnd - lane.startTime ) * pxPerSecond )
                    } }
                    title={ `${ lane.id } · ${ lane.startTime }s to ${ lane.endTime ?? 'open' } · gate ${ shownGate ?? 'open' } · drag to move create` }
                    { ...dragProps( lane.id ) }
                  >{ lane.definition }{ lane.expansionCount > 1 ? ` ×${ lane.expansionCount }` : '' }</button> }
                  { !unassigned && shownGate !== null && <button className="durationHandle"
                    aria-label={ `Adjust ${ lane.id } duration` }
                    style={ { left: LEFT + shownGate * pxPerSecond } }
                    title="Drag the gate boundary to adjust note duration"
                    onPointerDown={ ( pointerEvent ) => beginDurationDrag( pointerEvent, lane ) } /> }
                  { !unassigned && lane.envelope && <div className="synthEnvelope" style={ {
                    left: LEFT + lane.startTime * pxPerSecond,
                    width: Math.max( 12, ( shownEnd - lane.startTime ) * pxPerSecond )
                  } } title={ `Amplitude envelope: attack ${ shownAttack }s, release ${ shownRelease }s${ lane.envelope.derived ? ' (derived controls; edit in the event inspector)' : '' }` }>
                    <span className="envelopeAttack" style={ { width: Math.max( 0, ( attackEnd - lane.startTime ) * pxPerSecond ) } } />
                    <span className="envelopeHold" style={ { left: Math.max( 0, ( attackEnd - lane.startTime ) * pxPerSecond ), width: Math.max( 0, ( releaseStart - attackEnd ) * pxPerSecond ) } } />
                    <span className="envelopeRelease" style={ { left: Math.max( 0, ( releaseStart - lane.startTime ) * pxPerSecond ), width: Math.max( 0, ( shownEnd - releaseStart ) * pxPerSecond ) } } />
                    { lane.envelope.attackControl && <button className="envelopeHandle attack" aria-label={ `Adjust ${ lane.id } attack` }
                      style={ { left: Math.max( 0, ( attackEnd - lane.startTime ) * pxPerSecond ) } }
                      onPointerDown={ ( pointerEvent ) => beginEnvelopeDrag( pointerEvent, lane, 'attack' ) } /> }
                    { lane.envelope.releaseControl && shownGate !== null && <button className="envelopeHandle release" aria-label={ `Adjust ${ lane.id } release` }
                      style={ { left: Math.max( 0, ( shownEnd - lane.startTime ) * pxPerSecond ) } }
                      onPointerDown={ ( pointerEvent ) => beginEnvelopeDrag( pointerEvent, lane, 'release' ) } /> }
                  </div> }
                  { triggers.map( ( marker, index ) => marker.synthetic || !expanded
                    ? <span key={ `${ marker.entry.id }:${ marker.role }:${ index }` }
                      className={ `synthTriggerTick ${ marker.role }` }
                      style={ { left: LEFT + marker.time * pxPerSecond } }
                      title={ `${ marker.role.replace( '-', ' ' ) } · ${ marker.time }s${ marker.synthetic ? ' · derived, not authored' : '' }` } />
                    : <button key={ `${ marker.entry.id }:${ marker.role }:${ index }` }
                      className={ `expandedTrigger ${ marker.role }${ selected.has( marker.entry.id ) ? ' selected' : '' }${ drag?.ids.includes( marker.entry.id ) ? ' dragging' : '' }` }
                      style={ { left: LEFT + marker.time * pxPerSecond } }
                      title={ `${ marker.role } · ${ marker.entry.id } · ${ marker.time }s · drag to move authored entry` }
                      { ...dragProps( marker.entry.id ) }
                    >{ marker.role }</button> ) }
                </div>
              );
            } ) }
          <div className="playhead" style={ { left: LEFT + session.playhead * pxPerSecond } } />
        </div>
      </div>
    </section>
  );
}
