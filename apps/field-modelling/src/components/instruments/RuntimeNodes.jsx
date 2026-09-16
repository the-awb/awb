import { resolveInstrumentColor } from '@awb/field-engine';
import { drawableRuntimeInstruments } from '../../engine/instrumentPresentation.js';

export default function RuntimeNodes( { nodes, selectedID, speakers, colorOffset = 0, onSelect, onCommand } ) {
  if ( !nodes?.length ) return null;
  const drawable = new Map( drawableRuntimeInstruments( nodes, speakers )
    .map( ( instrument, index ) => [ instrument.runtimeEntryID, { instrument, index } ] ) );
  return <>
    <h2 style={ { marginTop: 14 } }>Runtime synths</h2>
    <p className="note" style={ { marginTop: 0 } }>
      Reported by NodeManager. Known external definitions are projected into the Field; unknown definitions
      remain audible but are not modelled.
    </p>
    <div className="instList">
      { nodes.map( ( node ) => {
        const field = drawable.get( node.entryID );
        const color = field ? resolveInstrumentColor( field.instrument, colorOffset + field.index ) : '#7fb8ff';
        return <div key={ node.entryID }
          className={ `instRow${ node.entryID === selectedID ? ' selected' : '' }` }
          onClick={ () => onSelect?.( node.entryID ) }>
          <span className="instLive" title={ field ? 'Sounding and modelled in this colour' : 'Audible only' }
            style={ { color } }>●</span>
          <span className="instType">{ node.synthDefName }</span>
          <span className="instFreq" title={ node.entryID }>{ node.ownership }</span>
          { node.actions?.release && <button onClick={ ( event ) => {
            event.stopPropagation(); onCommand?.( node.entryID, 'release' );
          } }>Rel</button> }
          { node.actions?.free && <button className="remove" onClick={ ( event ) => {
            event.stopPropagation(); onCommand?.( node.entryID, 'free' );
          } }>✕</button> }
        </div>;
      } ) }
    </div>
  </>;
}
