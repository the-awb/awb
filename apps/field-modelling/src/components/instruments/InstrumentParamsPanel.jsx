import InstrumentDetail from './InstrumentDetail.jsx';
import SurfaceDetail from '../surfaces/SurfaceDetail.jsx';

// RHS toolbar mirroring the LHS files panel: always on-screen regardless of
// which dock tab is open, holding the full param controls for whichever
// instrument is selected in the (now dock-side) instruments list.
export default function InstrumentParamsPanel({ open, onToggle, instrument, colorIndex, speakers, selectedSurfaceId, surfaces, dispatch }) {
  return (
    <div className={'rhs' + (open ? '' : ' collapsed')}>
      <button className="rhsToggle" onClick={onToggle} title={open ? 'Collapse' : 'Expand'}>
        {open ? '›' : '‹'}
      </button>
      {open && (
        <div className="rhsBody">
          {selectedSurfaceId
            ? <SurfaceDetail id={selectedSurfaceId} surface={surfaces[selectedSurfaceId]} dispatch={dispatch} />
            : <InstrumentDetail instrument={instrument} colorIndex={colorIndex} speakers={speakers} dispatch={dispatch} />}
        </div>
      )}
    </div>
  );
}
