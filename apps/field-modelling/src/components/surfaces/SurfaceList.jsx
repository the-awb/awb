const ORDER = ['horizontal', 'spherical', 'body'];

export default function SurfaceList({ surfaces, selectedId, dispatch }) {
  return (
    <div className="panel">
      <h2>Surfaces</h2>
      <div className="instList">
        {ORDER.map((id) => {
          const surface = surfaces[id];
          return (
            <div
              key={id} className={'instRow' + (selectedId === id ? ' selected' : '')}
              onClick={() => dispatch({ type: 'SELECT_SURFACE', id })}
            >
              <span className="surfaceGlyph">◫</span>
              <span className="instType">{surface.label}</span>
              <button
                className={surface.visible ? 'on' : ''}
                onClick={(event) => {
                  event.stopPropagation();
                  dispatch({ type: 'UPDATE_SURFACE', id, key: 'visible', value: !surface.visible });
                }}
              >{surface.visible ? 'On' : 'Off'}</button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
