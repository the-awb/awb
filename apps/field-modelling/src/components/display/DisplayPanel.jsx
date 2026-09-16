import NumberSlider from '../NumberSlider.jsx';

// Only scene-wide display timing and gain live here. Geometry and paint style
// belong to each first-class surface in the RHS inspector.
export default function DisplayPanel({ display, dispatch }) {
  const update = (key) => (value) => dispatch({ type: 'UPDATE_DISPLAY', key, value });
  const timeScale = Math.pow(10, display.timeScaleExp);
  const timeScaleLabel = timeScale >= 0.01 ? `${(timeScale * 100).toFixed(0)}%` : `1/${Math.round(1 / timeScale)}`;
  return (
    <div className="panel">
      <h2>Display</h2>
      <NumberSlider label="Display gain" value={display.gain} min={0.2} max={4} step={0.1} decimals={2} unit="×" onChange={update('gain')} />
      <NumberSlider label="Wavefront time" value={display.timeScaleExp} min={-4} max={0} step={0.05} decimals={2} unit="" onChange={update('timeScaleExp')} />
      <p className="note" style={{ marginTop: 0 }}>Wavefront playback: {timeScaleLabel}</p>
      <div className="seg"><button className={display.playing ? 'on' : ''} onClick={() => update('playing')(!display.playing)}>{display.playing ? 'Pause' : 'Play'}</button></div>

      <div className="row" style={{ marginTop: 10 }}>
        <label>Visual sync</label>
        <div className="boolSlot">
          <button
            className={display.phaseSync !== false ? 'on' : ''}
            title={display.phaseSync !== false
              ? 'Re-measuring phase off the engine every 30s'
              : 'Only measuring when an instrument starts or a frequency changes'}
            onClick={() => update('phaseSync')(display.phaseSync === false)}
          >
            {display.phaseSync !== false ? 'Every 30s' : 'On change'}
          </button>
        </div>
      </div>
      <p className="note" style={{ marginTop: 0 }}>
        Phase is measured from the engine&apos;s own output rather than assumed, so the picture
        shows where the sound actually is. The lock drifts as the engine glitches, so re-measuring
        keeps it honest — about 8&nbsp;ms each time. Switch to <em>On change</em> if things get slow.
      </p>
    </div>
  );
}
