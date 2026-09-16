import { INSTRUMENT_TYPE_KEYS, instrumentType } from '@awb/instruments';
import { mainFreq } from '../../engine/instrumentState.js';
import { resolveInstrumentColor } from '@awb/field-engine';
import RuntimeNodes from './RuntimeNodes.jsx';

// Deliberately minimal: identify each instrument by type + main frequency,
// plus the instrument-level mute/solo/remove. Full param + per-channel
// controls live in InstrumentDetail for whichever row is selected.
export default function InstrumentsPanel({ instruments, speakers, selectedId, selectedNodeId, dispatch,
  isSounding, runtimeNodes = [], onRuntimeCommand }) {
  return (
    <div className="panel">
      <h2>Instruments</h2>
      <div className="instList">
        {instruments.length === 0 && <p className="note" style={{ marginTop: 0 }}>No instruments yet.</p>}
        {instruments.map((inst, idx) => {
          const def = instrumentType(inst.type);
          const freq = mainFreq(inst, speakers);
          return (
            <div
              key={inst.id}
              className={'instRow' + (inst.id === selectedId ? ' selected' : '')}
              onClick={() => dispatch({ type: 'SELECT_INSTRUMENT', id: inst.id })}
            >
              <input
                type="color" className="instSwatch" title="Multi-hue colour"
                value={resolveInstrumentColor(inst, idx)}
                onClick={(e) => e.stopPropagation()}
                onChange={(e) => dispatch({ type: 'SET_INSTRUMENT_COLOR', id: inst.id, color: e.target.value })}
              />
              {/* Whether this instrument has a synth on the server right now. Not the same as
                  "not muted": it needs a SynthDef behind it and an engine to put it on, and after
                  a mute it stays lit through the release. */}
              <span
                className="instLive"
                title={isSounding?.(inst.id) ? 'Sounding on the server'
                  : def.synthDef ? 'Not sounding — modelled in the field only'
                    : 'No SynthDef — this type is modelled in the field only'}
                style={{ color: isSounding?.(inst.id) ? '#9ad18f' : '#4c525c' }}
              >●</span>
              <span className="instType">{def.label}</span>
              <span className="instFreq">{freq.toFixed(1)} Hz</span>
              <button
                className={'highlightBtn' + (inst.highlight ? ' on' : '')}
                title={inst.highlight ? 'Remove from highlight set' : 'Add to highlight set'}
                aria-label={`${inst.highlight ? 'Remove from' : 'Add to'} highlight: ${def.label}`}
                onClick={(e) => { e.stopPropagation(); dispatch({ type: 'SET_INSTRUMENT_HIGHLIGHT', id: inst.id, highlight: !inst.highlight }); }}
              >◆</button>
              <button
                className={'lrBtn' + (inst.lActive !== false ? ' on' : '')}
                title="Left speaker"
                onClick={(e) => { e.stopPropagation(); dispatch({ type: 'SET_INSTRUMENT_L_ACTIVE', id: inst.id, active: inst.lActive === false }); }}
              >L</button>
              <button
                className={'lrBtn' + (inst.rActive !== false ? ' on' : '')}
                title="Right speaker"
                onClick={(e) => { e.stopPropagation(); dispatch({ type: 'SET_INSTRUMENT_R_ACTIVE', id: inst.id, active: inst.rActive === false }); }}
              >R</button>
              {/* Envelope release, not a hard stop: gate 0, and the sound fades over releaseT
                  (12s on Substrate, 30s on Substrate 2) before the synth frees itself. The ✕ is
                  the hard stop - /n_free, gone on the next control block. */}
              <button
                title={inst.playing === false
                  ? 'Start this instrument — a fresh envelope from the beginning'
                  : 'Release — the envelope fades out, then the synth frees itself'}
                onClick={(e) => {
                  e.stopPropagation();
                  dispatch({ type: 'SET_INSTRUMENT_PLAYING', id: inst.id, playing: inst.playing === false });
                }}
              >{inst.playing === false ? 'Play' : 'Rel'}</button>
              <button
                title="Silence it instantly, without releasing — the synth keeps running"
                className={inst.mute ? 'on' : ''}
                onClick={(e) => { e.stopPropagation(); dispatch({ type: 'SET_INSTRUMENT_MUTE', id: inst.id, mute: !inst.mute }); }}
              >Mute</button>
              <button
                className={inst.solo ? 'on' : ''}
                onClick={(e) => { e.stopPropagation(); dispatch({ type: 'SET_INSTRUMENT_SOLO', id: inst.id, solo: !inst.solo }); }}
              >Solo</button>
              <button
                className="remove" title="Remove — frees the synth immediately, no release"
                onClick={(e) => { e.stopPropagation(); dispatch({ type: 'REMOVE_INSTRUMENT', id: inst.id }); }}
              >✕</button>
            </div>
          );
        })}
      </div>
      <RuntimeNodes nodes={ runtimeNodes } selectedID={ selectedNodeId } speakers={ speakers }
        colorOffset={ instruments.length }
        onSelect={ ( id ) => dispatch( { type: 'SELECT_NODE', id } ) }
        onCommand={ onRuntimeCommand } />
      <div className="seg addRow">
        {INSTRUMENT_TYPE_KEYS.map((k) => (
          <button key={k} onClick={() => dispatch({ type: 'ADD_INSTRUMENT', instType: k })}>
            + {instrumentType(k).label}
          </button>
        ))}
      </div>
    </div>
  );
}
