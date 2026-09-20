import { cloneElement, useEffect, useRef, useState } from 'react';

const MIN_RIGHT_WIDTH = 300;
const MAX_RIGHT_WIDTH = 640;
const MIN_BOTTOM_HEIGHT = 180;
const MAX_BOTTOM_HEIGHT = 560;

// The focus rail is the tall column on the right: a property sheet reads down, so it wants height,
// and the timeline wants back the height a bottom drawer would have taken from it. The bottom slot
// stays supported for anything that genuinely wants the full width.
export default function PanelLayout( { left, centre, right, bottom = null } ) {
  const [ collapsed, setCollapsed ] = useState( { left: false, right: false, bottom: false } );
  const [ rightWidth, setRightWidth ] = useState( 380 );
  const [ bottomHeight, setBottomHeight ] = useState( 300 );
  const dragRef = useRef( null );

  useEffect( () => {
    function move( event ) {
      const drag = dragRef.current;
      if ( !drag ) return;
      if ( drag.axis === 'x' ) {
        setRightWidth( Math.min( MAX_RIGHT_WIDTH,
          Math.max( MIN_RIGHT_WIDTH, drag.startWidth + ( drag.startX - event.clientX ) ) ) );
      } else {
        setBottomHeight( Math.min( MAX_BOTTOM_HEIGHT,
          Math.max( MIN_BOTTOM_HEIGHT, drag.startHeight + ( drag.startY - event.clientY ) ) ) );
      }
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
    <div className={ `panelLayout ${ bottom ? 'hasBottom' : '' } ${ collapsed.left ? 'leftCollapsed' : '' } ${ collapsed.right ? 'rightCollapsed' : '' } ${ collapsed.bottom ? 'bottomCollapsed' : '' }` }
      style={ { '--bottom-panel-height': `${ bottomHeight }px`, '--right-panel-width': `${ rightWidth }px` } }>
      <aside className="studioRail leftRail">
        { cloneElement( left, {
          collapsed: collapsed.left,
          onToggleCollapsed: () => toggle( 'left' )
        } ) }
      </aside>
      <main className="workspace">{ centre }</main>
      <aside className="studioRail rightRail focusPanel">
        { !collapsed.right && <div className="rightResizeHandle" role="separator"
          aria-label="Resize focus panel" aria-orientation="vertical"
          onPointerDown={ ( event ) => {
            event.preventDefault();
            dragRef.current = { axis: 'x', startX: event.clientX, startWidth: rightWidth };
          } } /> }
        <button className="railCollapse" aria-label={ collapsed.right ? 'Expand focus panel' : 'Collapse focus panel' }
          title={ collapsed.right ? 'Expand focus panel' : 'Collapse focus panel' }
          onClick={ () => toggle( 'right' ) }>{ collapsed.right ? '‹' : '›' }</button>
        { !collapsed.right && right }
      </aside>
      { bottom && <section className="bottomPanel">
        { !collapsed.bottom && <div className="bottomResizeHandle" role="separator"
          aria-label="Resize edit panel" aria-orientation="horizontal"
          onPointerDown={ ( event ) => {
            event.preventDefault();
            dragRef.current = { axis: 'y', startY: event.clientY, startHeight: bottomHeight };
          } } /> }
        <button className="bottomCollapse" aria-label={ collapsed.bottom ? 'Expand edit panel' : 'Collapse edit panel' }
          title={ collapsed.bottom ? 'Expand edit panel' : 'Collapse edit panel' }
          onClick={ () => toggle( 'bottom' ) }>{ collapsed.bottom ? '⌃ Edit' : '⌄' }</button>
        { !collapsed.bottom && bottom }
      </section> }
    </div>
  );
}
