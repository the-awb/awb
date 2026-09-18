import { useState } from 'react';

export default function ScoreStudioLeftRail( {
  collapsed, documentPanel, instrumentPanel, onToggleCollapsed
} ) {
  const [ tab, setTab ] = useState( 'document' );

  function chooseTab( nextTab ) {
    if ( collapsed || tab === nextTab ) onToggleCollapsed();
    setTab( nextTab );
  }

  return (
    <div className="leftRailContent">
      <nav className="activityRail" aria-label="Score Studio context">
        <button aria-label="Document" title="Document" className={ tab === 'document' ? 'active' : '' }
          aria-pressed={ tab === 'document' } aria-expanded={ tab === 'document' && !collapsed }
          onClick={ () => chooseTab( 'document' ) }>▤</button>
        <button aria-label="Instruments" title="Instruments" className={ tab === 'instruments' ? 'active' : '' }
          aria-pressed={ tab === 'instruments' } aria-expanded={ tab === 'instruments' && !collapsed }
          onClick={ () => chooseTab( 'instruments' ) }>♫</button>
        <span className="spacer" />
        <button aria-label={ collapsed ? 'Expand left panel' : 'Collapse left panel' }
          title={ collapsed ? 'Expand left panel' : 'Collapse left panel' }
          onClick={ onToggleCollapsed }>{ collapsed ? '\u203a' : '\u2039' }</button>
      </nav>
      <div className="railPanel" hidden={ collapsed }>
        <header><h2>{ tab === 'document' ? 'Document' : 'Instruments' }</h2></header>
        <div className="railScroll">
          <div hidden={ tab !== 'document' }>{ documentPanel }</div>
          <div hidden={ tab !== 'instruments' }>{ instrumentPanel }</div>
        </div>
      </div>
    </div>
  );
}
