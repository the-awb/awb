import { useEffect, useRef, useState } from 'react';

const MIN_BOTTOM_HEIGHT = 180;
const MAX_BOTTOM_HEIGHT = 560;

export default function PanelLayout( { left, centre, right, bottom } ) {
  const [ collapsed, setCollapsed ] = useState( { left: false, right: false, bottom: false } );
  const [ bottomHeight, setBottomHeight ] = useState( 300 );
  const dragRef = useRef( null );

  useEffect( () => {
    function move( event ) {
      if ( !dragRef.current ) return;
      const delta = dragRef.current.startY - event.clientY;
      setBottomHeight( Math.min( MAX_BOTTOM_HEIGHT,
        Math.max( MIN_BOTTOM_HEIGHT, dragRef.current.startHeight + delta ) ) );
    }
    function stop() { dragRef.current = null; }
    window.addEventListener( 'pointermove', move );
    window.addEventListener( 'pointerup', stop );
    return () => {
      window.removeEventListener( 'pointermove', move );
      window.removeEventListener( 'pointerup', stop );
    };
  }, [] );

  function toggle( panel ) {
    setCollapsed( ( current ) => ( { ...current, [ panel ]: !current[ panel ] } ) );
  }

  return (
    <div className={ `panelLayout ${ collapsed.left ? 'leftCollapsed' : '' } ${ collapsed.right ? 'rightCollapsed' : '' } ${ collapsed.bottom ? 'bottomCollapsed' : '' }` }
      style={ { '--bottom-panel-height': `${ bottomHeight }px` } }>
      <aside className="studioRail leftRail">
        <button className="railCollapse" aria-label={ collapsed.left ? 'Expand left panel' : 'Collapse left panel' }
          title={ collapsed.left ? 'Expand left panel' : 'Collapse left panel' }
          onClick={ () => toggle( 'left' ) }>{ collapsed.left ? '\u203a' : '\u2039' }</button>
        { !collapsed.left && left }
      </aside>
      <main className="workspace">{ centre }</main>
      <aside className="studioRail rightRail">
        <button className="railCollapse" aria-label={ collapsed.right ? 'Expand right panel' : 'Collapse right panel' }
          title={ collapsed.right ? 'Expand right panel' : 'Collapse right panel' }
          onClick={ () => toggle( 'right' ) }>{ collapsed.right ? '\u2039' : '\u203a' }</button>
        { !collapsed.right && right }
      </aside>
      <section className="bottomPanel">
        { !collapsed.bottom && <div className="bottomResizeHandle" role="separator"
          aria-label="Resize edit panel" aria-orientation="horizontal"
          onPointerDown={ ( event ) => {
            event.preventDefault();
            dragRef.current = { startY: event.clientY, startHeight: bottomHeight };
          } } /> }
        <button className="bottomCollapse" aria-label={ collapsed.bottom ? 'Expand edit panel' : 'Collapse edit panel' }
          title={ collapsed.bottom ? 'Expand edit panel' : 'Collapse edit panel' }
          onClick={ () => toggle( 'bottom' ) }>{ collapsed.bottom ? '\u2303 Edit' : '\u2304' }</button>
        { !collapsed.bottom && bottom }
      </section>
    </div>
  );
}
