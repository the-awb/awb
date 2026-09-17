import { useState } from 'react';

export default function ScoreStudioLeftRail( { documentPanel, onOpenInstrumentWorkspace } ) {
  const [ tab, setTab ] = useState( 'document' );
  return (
    <div className="leftRailContent">
      <nav className="railTabs" aria-label="Score Studio context">
        <button className={ tab === 'document' ? 'active' : '' }
          onClick={ () => setTab( 'document' ) }>Document</button>
        <button className={ tab === 'instruments' ? 'active' : '' }
          onClick={ () => setTab( 'instruments' ) }>Instruments</button>
      </nav>
      <div className="railScroll">
        { tab === 'document' ? documentPanel : (
          <section className="instrumentTabPlaceholder">
            <h2>Instruments</h2>
            <p className="boundaryNote">The existing instrument rack remains available while the compact, lazy inventory is built in Slice B.</p>
            <button onClick={ onOpenInstrumentWorkspace }>Open instrument workspace</button>
          </section>
        ) }
      </div>
    </div>
  );
}
