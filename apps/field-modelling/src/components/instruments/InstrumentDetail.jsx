import NumberSlider from '../NumberSlider.jsx';
import {
  instrumentBooleanFields,
  instrumentFields,
  instrumentType
} from '@awb/instruments';
import { getPath } from '../../engine/instrumentState.js';
import { resolveInstrumentColor } from '@awb/field-engine';

// Full param controls for whichever instrument is selected in the list, plus
// (for types where it means something) a per-channel on/off table. No solo
// here -- solo/mute lives one level up, on the instrument itself
// (InstrumentsPanel); channels only ever get a plain on/off, since a "beat"
// oscillator in isolation isn't a meaningful thing to solo -- it's defined by
// its relationship to the carrier, not as a standalone sound.
//
// L/R here dispatches the same SET_INSTRUMENT_L/R_ACTIVE actions as the list
// row's buttons -- one piece of state, shown in both places. Types whose
// channels map 1:1 onto a single speaker (basic, substrate) have no separate
// channel table at all: a per-channel toggle there would just be a second,
// driftable copy of L/R. Substrate 2's base/pulse/beat blend across both
// speakers at once, so its table is real, independent information.
export default function InstrumentDetail({ instrument, colorIndex, speakers, dispatch }) {
  if (!instrument) {
    return (
      <div className="panel">
        <h2>Instrument</h2>
        <p className="note" style={{ marginTop: 0 }}>Select an instrument to edit it.</p>
      </div>
    );
  }

  const def = instrumentType(instrument.type);
  const fields = instrumentFields(instrument.type, speakers);
  const booleanFields = instrumentBooleanFields(instrument.type, speakers);
  const channelSlots = Object.keys(instrument.channels);
  return (
    <div className="panel">
      <h2 style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
        <input
          type="color" className="instSwatch" title="Multi-hue colour"
          value={resolveInstrumentColor(instrument, colorIndex)}
          onChange={(e) => dispatch({ type: 'SET_INSTRUMENT_COLOR', id: instrument.id, color: e.target.value })}
        />
        {def.label}
      </h2>
      {def.note && <p className="note" style={{ marginTop: 0 }}>{def.note}</p>}

      <div className="row">
        <label>Speakers</label>
        <div className="seg">
          <button
            className={'lrBtn' + (instrument.lActive !== false ? ' on' : '')}
            onClick={() => dispatch({ type: 'SET_INSTRUMENT_L_ACTIVE', id: instrument.id, active: instrument.lActive === false })}
          >L</button>
          <button
            className={'lrBtn' + (instrument.rActive !== false ? ' on' : '')}
            onClick={() => dispatch({ type: 'SET_INSTRUMENT_R_ACTIVE', id: instrument.id, active: instrument.rActive === false })}
          >R</button>
        </div>
      </div>

      <NumberSlider
        label="Amp" value={instrument.amp} min={0} max={2} step={0.01} decimals={2} unit="×"
        onChange={(v) => dispatch({ type: 'SET_INSTRUMENT_AMP', id: instrument.id, amp: v })}
      />

      {fields.map((f) => (
        <NumberSlider
          key={f.path.join('.')}
          label={f.label}
          value={getPath(instrument.params, f.path) ?? f.defaultValue}
          min={f.min} max={f.max} step={f.step} decimals={f.decimals} unit={f.unit}
          onChange={(v) => dispatch({ type: 'UPDATE_INSTRUMENT_PARAM', id: instrument.id, path: f.path, value: v })}
        />
      ))}

      {booleanFields.map((bf) => {
        const val = getPath(instrument.params, bf.path);
        return (
          <div className="row" key={bf.path.join('.')}>
            <label>{bf.label}</label>
            <div className="boolSlot">
              <button
                className={val ? 'on' : ''}
                onClick={() => dispatch({ type: 'UPDATE_INSTRUMENT_PARAM', id: instrument.id, path: bf.path, value: !val })}
              >
                {val ? bf.onLabel : bf.offLabel}
              </button>
            </div>
          </div>
        );
      })}

      {channelSlots.length > 0 && (
        <>
          <h2 style={{ marginTop: 16 }}>Channels</h2>
          <table className="chTable">
            <tbody>
              {channelSlots.map((slot) => (
                <tr key={slot}>
                  <td className="chName">{slot}</td>
                  <td>
                    <button
                      className={instrument.channels[slot].active ? 'on' : ''}
                      onClick={() => dispatch({
                        type: 'SET_CHANNEL_ACTIVE', id: instrument.id, slot,
                        active: !instrument.channels[slot].active,
                      })}
                    >
                      {instrument.channels[slot].active ? 'On' : 'Off'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}
    </div>
  );
}
