import { useState } from 'react';

const TABS = [
  { id: 'document', label: 'Document', glyph: '▤' },
  { id: 'instruments', label: 'Instruments', glyph: '♫' },
  { id: 'runtime', label: 'Runtime', glyph: '◉' }
];

export default function ScoreStudioLeftRail( {
  collapsed, documentPanel, instrumentPanel, runtimePanel, onToggleCollapsed
} ) {
  const [ tab, setTab ] = useState( 'document' );

  function chooseTab( nextTab ) {
    if ( collapsed || tab === nextTab ) onToggleCollapsed();
    setTab( nextTab );
  }

  const active = TABS.find( ( entry ) => entry.id === tab ) ?? TABS[ 0 ];

  return (
    <div className="leftRailContent">
      <nav className="activityRail" aria-label="Score Studio context">
        { TABS.map( ( entry ) => (
          <button key={ entry.id } aria-label={ entry.label } title={ entry.label }
            className={ tab === entry.id ? 'active' : '' }
            aria-pressed={ tab === entry.id } aria-expanded={ tab === entry.id && !collapsed }
            onClick={ () => chooseTab( entry.id ) }>{ entry.glyph }</button>
        ) ) }
        <span className="spacer" />
        <button aria-label={ collapsed ? 'Expand left panel' : 'Collapse left panel' }
          title={ collapsed ? 'Expand left panel' : 'Collapse left panel' }
          onClick={ onToggleCollapsed }>{ collapsed ? '›' : '‹' }</button>
      </nav>
      <div className="railPanel" hidden={ collapsed }>
        <header><h2>{ active.label }</h2>
          { tab === 'runtime' && <span className="railHeaderNote">projection</span> }</header>
        <div className="railScroll">
          <div hidden={ tab !== 'document' }>{ documentPanel }</div>
          <div hidden={ tab !== 'instruments' }>{ instrumentPanel }</div>
          <div hidden={ tab !== 'runtime' }>{ runtimePanel }</div>
        </div>
      </div>
    </div>
  );
}
