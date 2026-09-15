import { useMemo, useState } from 'react';
import { duration, makeEvent, nudge, sortScore } from '@awb/score';

const PX_PER_SECOND = 22;
const LEFT = 92;

const fmt = ( seconds ) => {
  const minutes = Math.floor( seconds / 60 );
  return `${ minutes }:${ String( Math.round( seconds % 60 ) ).padStart( 2, '0' ) }`;
};

export default function ScoreTimeline( { session, dispatch } ) {
  const [ step, setStep ] = useState( 1 );
  const entries = session.document.entries;
  const selected = new Set( session.selected );
  const lanes = useMemo( () => {
    const names = [ ...new Set( entries.map( ( entry ) => entry.path[ 0 ] ?? 'ungrouped' ) ) ];
    return names.length ? names : [ 'ungrouped' ];
  }, [ entries ] );
  const total = Math.max( 30, duration( entries ) + 12, session.playhead + 12 );
  const width = LEFT + total * PX_PER_SECOND + 40;

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
      <div className="scoreToolbar">
        <span className="timeReadout">{ fmt( session.playhead ) }</span>
        <button onClick={ add }>+ note</button>
        <button
          disabled={ !selected.size }
          onClick={ () => apply( entries.filter( ( entry ) => !selected.has( entry.id ) ) ) }
        >Delete</button>
        <button disabled={ !session.undo.length } onClick={ () => dispatch( { type: 'UNDO' } ) }>Undo</button>
        <span className="spacer" />
        <label>Step <input type="number" min="0.01" step="0.25" value={ step }
          onChange={ ( event ) => setStep( Number( event.target.value ) ) } /> s</label>
        <button disabled={ !selected.size }
          onClick={ () => apply( nudge( entries, selected, -step ) ) }>Earlier</button>
        <button disabled={ !selected.size }
          onClick={ () => apply( nudge( entries, selected, step ) ) }>Later</button>
      </div>

      <div className="timelineScroll">
        <div className="timeline" style={ { width } }>
          <div className="ruler">
            { Array.from( { length: Math.floor( total / 5 ) + 1 }, ( _, index ) => index * 5 ).map( ( time ) => (
              <button key={ time } className="tick" style={ { left: LEFT + time * PX_PER_SECOND } }
                onClick={ () => dispatch( { type: 'SET_PLAYHEAD', time } ) }>{ fmt( time ) }</button>
            ) ) }
          </div>
          { lanes.map( ( lane ) => (
            <div key={ lane } className="lane" onClick={ ( event ) => {
              if ( event.target !== event.currentTarget ) return;
              const rect = event.currentTarget.getBoundingClientRect();
              dispatch( { type: 'SET_PLAYHEAD', time: Math.max( 0, ( event.clientX - rect.left - LEFT ) / PX_PER_SECOND ) } );
              dispatch( { type: 'SET_SELECTED', ids: [] } );
            } }>
              <span className="laneName">{ lane }</span>
              { entries.filter( ( entry ) => ( entry.path[ 0 ] ?? 'ungrouped' ) === lane ).map( ( entry ) => (
                <button key={ entry.id }
                  className={ `scoreEvent ${ entry.event.type }${ selected.has( entry.id ) ? ' selected' : '' }` }
                  style={ { left: LEFT + entry.time * PX_PER_SECOND } }
                  onClick={ ( event ) => {
                    event.stopPropagation();
                    const additive = event.shiftKey || event.metaKey;
                    const ids = additive
                      ? ( selected.has( entry.id )
                        ? session.selected.filter( ( id ) => id !== entry.id )
                        : [ ...session.selected, entry.id ] )
                      : [ entry.id ];
                    dispatch( { type: 'SET_SELECTED', ids } );
                  } }
                  title={ `${ entry.id } · ${ entry.time }s · ${ entry.path.join( '/' ) || 'ungrouped' }` }
                >{ entry.event.def ?? entry.event.type }</button>
              ) ) }
            </div>
          ) ) }
          <div className="playhead" style={ { left: LEFT + session.playhead * PX_PER_SECOND } } />
        </div>
      </div>
    </section>
  );
}
