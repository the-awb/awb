import { useState } from 'react';

export default function ScoreStudioLeftRail( {
  collapsed, documentPanel, onOpenInstrumentWorkspace, onToggleCollapsed
} ) {
  const [ tab, setTab ] = useState( 'document' );

  function chooseTab( nextTab ) {
    if ( collapsed ) onToggleCollapsed();
    setTab( nextTab );
  }

  return (
    <div className="leftRailContent">
      <nav className="activityRail" aria-label="Score Studio context">
        <button aria-label="Document" title="Document" className={ tab === 'document' ? 'active' : '' }
          onClick={ () => chooseTab( 'document' ) }>▤</button>
        <button aria-label="Instruments" title="Instruments" className={ tab === 'instruments' ? 'active' : '' }
          onClick={ () => chooseTab( 'instruments' ) }>♫</button>
        <span className="spacer" />
        <button aria-label={ collapsed ? 'Expand left panel' : 'Collapse left panel' }
          title={ collapsed ? 'Expand left panel' : 'Collapse left panel' }
          onClick={ onToggleCollapsed }>{ collapsed ? '\u203a' : '\u2039' }</button>
      </nav>
      { !collapsed && <div className="railPanel">
        <header><h2>{ tab === 'document' ? 'Document' : 'Instruments' }</h2></header>
        <div className="railScroll">
          { tab === 'document' ? documentPanel : (
            <section className="instrumentTabPlaceholder">
              <p className="boundaryNote">The existing instrument rack remains available while the compact, lazy inventory is built in Slice B.</p>
              <button onClick={ onOpenInstrumentWorkspace }>Open instrument workspace</button>
            </section>
          ) }
        </div>
      </div> }
    </div>
  );
}
