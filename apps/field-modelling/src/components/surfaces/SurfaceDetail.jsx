import NumberSlider from '../NumberSlider.jsx';
import { SURFACE_SETUPS } from '@awb/field-engine';

function StyleControls({ id, surface, dispatch }) {
  const update = (key, value) => dispatch({ type: 'UPDATE_SURFACE', id, key, value });
  return (
    <>
      <div className="seg" style={{ marginBottom: 10 }}>
        <button className={!surface.visible ? 'on' : ''} onClick={() => update('visible', false)}>Off</button>
        <button className={surface.visible ? 'on' : ''} onClick={() => update('visible', true)}>On</button>
      </div>
      <NumberSlider label="Opacity" value={(surface.opacity ?? 1) * 100} min={0} max={100} step={1} decimals={0} unit=" %" onChange={(value) => update('opacity', value / 100)} />
      <div className="seg" style={{ marginBottom: 10 }}>
        <button className={surface.colorMode !== 'multi' ? 'on' : ''} onClick={() => update('colorMode', 'composite')}>Composite</button>
        <button className={surface.colorMode === 'multi' ? 'on' : ''} onClick={() => update('colorMode', 'multi')}>Multi-hue</button>
      </div>
      {surface.colorMode === 'multi' && (
        <div className="seg" style={{ marginBottom: 10 }}>
          <button className={!surface.highlight ? 'on' : ''} onClick={() => update('highlight', false)}>Balanced</button>
          <button className={surface.highlight ? 'on' : ''} onClick={() => update('highlight', true)}>Highlight selected</button>
        </div>
      )}
      <div className="seg" style={{ marginBottom: 10, opacity: surface.colorMode === 'multi' ? 0.45 : 1 }}>
        <button className={surface.mode === 'abs' ? 'on' : ''} disabled={surface.colorMode === 'multi'} onClick={() => update('mode', 'abs')}>Level</button>
        <button className={surface.mode === 'rel' ? 'on' : ''} disabled={surface.colorMode === 'multi'} onClick={() => update('mode', 'rel')}>Contrast</button>
        <button className={surface.mode === 'wav' ? 'on' : ''} disabled={surface.colorMode === 'multi'} onClick={() => update('mode', 'wav')}>Wavefronts</button>
      </div>
      <div className="seg" style={{ marginBottom: 10 }}>
        <button className={surface.contour === 0 ? 'on' : ''} onClick={() => update('contour', 0)}>Gradient</button>
        <button className={surface.contour === 1 ? 'on' : ''} onClick={() => update('contour', 1)}>Overlay</button>
        <button className={surface.contour === 2 ? 'on' : ''} onClick={() => update('contour', 2)}>Lines</button>
      </div>
      {surface.contour > 0 && <NumberSlider label="Contours" value={surface.contourN} min={4} max={40} step={1} decimals={0} unit=" levels" onChange={(value) => update('contourN', value)} />}
    </>
  );
}

export default function SurfaceDetail({ id, surface, dispatch }) {
  if (!surface) return null;
  const update = (key, value) => dispatch({ type: 'UPDATE_SURFACE', id, key, value });
  const sphereMinRadius = id === 'spherical'
    ? Math.sqrt((surface.width * 0.5) ** 2 + (surface.height * 0.5) ** 2) + 0.02
    : 0;
  const sphereMaxWidth = id === 'spherical'
    ? Math.max(0.4, 2 * Math.sqrt(Math.max(0.04, surface.radius ** 2 - (surface.height * 0.5) ** 2)) - 0.04)
    : 4;
  const sphereMaxHeight = id === 'spherical'
    ? Math.max(0.4, 2 * Math.sqrt(Math.max(0.04, surface.radius ** 2 - (surface.width * 0.5) ** 2)) - 0.04)
    : 3;
  return (
    <div className="panel" style={{ marginTop: 0 }}>
      <h2>{surface.label}</h2>
      {id === 'horizontal' && <>
        <NumberSlider label="Radius" value={surface.radius} min={0.25} max={10} step={0.05} decimals={2} unit=" m" onChange={(value) => update('radius', value)} />
        <NumberSlider label="Height" value={surface.height} min={0.05} max={2} step={0.02} decimals={2} unit=" m" onChange={(value) => update('height', value)} />
      </>}
      {id === 'spherical' && <>
        <NumberSlider label="Radius" value={Math.max(surface.radius, sphereMinRadius)} min={sphereMinRadius} max={10} step={0.05} decimals={2} unit=" m" onChange={(value) => update('radius', value)} />
        <NumberSlider label="Width" value={Math.min(surface.width, sphereMaxWidth)} min={0.4} max={Math.min(4, sphereMaxWidth)} step={0.05} decimals={2} unit=" m" onChange={(value) => update('width', value)} />
        <NumberSlider label="Height" value={Math.min(surface.height, sphereMaxHeight)} min={0.4} max={Math.min(3, sphereMaxHeight)} step={0.05} decimals={2} unit=" m" onChange={(value) => update('height', value)} />
      </>}
      {id === 'body' && <>
        <div className="row"><label htmlFor="body-setup">Setup</label><select id="body-setup" value={surface.setupId} onChange={(event) => update('setupId', event.target.value)}>{SURFACE_SETUPS.filter((setup) => setup.id !== 'none').map((setup) => <option key={setup.id} value={setup.id}>{setup.label}</option>)}</select></div>
        <div className="seg" style={{ marginBottom: 10 }}><button className={surface.showSites ? 'on' : ''} onClick={() => update('showSites', !surface.showSites)}>Body sites</button></div>
      </>}
      <StyleControls id={id} surface={surface} dispatch={dispatch} />
      {id === 'body' && <p className="note">Incident free-field pressure on an acoustically transparent body; no scattering or skin impedance yet.</p>}
    </div>
  );
}
