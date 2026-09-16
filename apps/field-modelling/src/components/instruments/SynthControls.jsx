import { useEffect, useState } from 'react';
import { instrumentType } from '@awb/instruments';
import { loadSynthDefManifest, settableControls } from '@awb/sc-wasm/core';
import { synthDefManifestUrl } from '../../engine/scAssets.js';

// Every remaining control on the SynthDef this instrument is playing.
//
// The curated params above this are the ones the FIELD MODEL reads - they have real ranges, units
// and slider bounds, and moving them changes the picture as well as the sound. These are the rest
// of the def: they reach the synth and nothing else. Both are real controls with real names, which
// is the whole point of the parameter surface; the split is about what the shader knows, not about
// what SuperCollider will accept.
//
// This is what makes the instruments panel a control surface for the synth rather than a summary
// of it - previously the full set was only reachable from the Sound tab's patch library, which
// played a def with no instrument behind it.
//
// A param that is ABSENT from instrument.params is not sent at all, so the synth keeps the def's
// own default. Editing one adds it. That keeps saved sessions small and keeps "unchanged" honest.
export default function SynthControls({ instrument, curated, dispatch }) {
  const [defs, setDefs] = useState(null);
  const [error, setError] = useState(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    let live = true;
    loadSynthDefManifest(synthDefManifestUrl()).then(
      (m) => { if (live) setDefs(m); },
      (e) => { if (live) setError(e.message); },
    );
    return () => { live = false; };
  }, []);

  const type = instrumentType(instrument.type);
  if (!type.synthDef) {
    return (
      <p className="note">
        No SynthDef behind this type — it is modelled in the field only, and makes no sound.
      </p>
    );
  }
  if (error) return <p className="note">Could not read the SynthDef manifest: {error}</p>;
  if (!defs) return <p className="note">Reading the SynthDef…</p>;

  const def = defs.get(type.synthDef);
  if (!def) return <p className="note">\{type.synthDef} is not in the compiled manifest.</p>;

  const rest = settableControls(def).filter(
    (c) => !curated.has(c.name) && c.name !== type.gainControl,
  );
  if (rest.length === 0) return null;

  return (
    <>
      <h2 style={{ marginTop: 16, display: 'flex', alignItems: 'center', gap: 6 }}>
        <button
          onClick={() => setOpen(!open)}
          title={open ? 'Hide' : `Show all ${rest.length} remaining controls of \\${def.name}`}
          style={{ background: 'none', border: 'none', color: '#777', cursor: 'pointer', padding: 0, fontSize: 10 }}
        >
          {open ? '▾' : '▸'}
        </button>
        <span>\{def.name}</span>
        <span className="note" style={{ margin: 0, fontWeight: 'normal' }}>{rest.length} more</span>
      </h2>

      {open && (
        <>
          <p className="note" style={{ marginTop: 0 }}>
            These reach the synth but not the field model — they change what you hear, not what you
            see. Blank means the def&apos;s own default.
          </p>
          {rest.map((c) => {
            const set = Object.hasOwn(instrument.params, c.name);
            const value = set ? instrument.params[c.name] : '';
            return (
              <div className="row" key={c.name}>
                <label title={`${c.name} — default ${c.default}${c.rate ? `, ${c.rate}` : ''}`}>{c.name}</label>
                <input
                  type="number" step="any" value={value} placeholder={String(c.default)}
                  onChange={(e) => {
                    const raw = e.target.value;
                    if (raw === '') {
                      dispatch({ type: 'CLEAR_INSTRUMENT_PARAM', id: instrument.id, name: c.name });
                    } else if (Number.isFinite(Number(raw))) {
                      dispatch({ type: 'UPDATE_INSTRUMENT_PARAM', id: instrument.id, path: [c.name], value: Number(raw) });
                    }
                  }}
                  style={{
                    width: 84, background: '#222', color: set ? '#ccc' : '#777',
                    border: '1px solid #444', borderRadius: 3, padding: '1px 4px',
                    fontSize: 11, fontFamily: 'monospace',
                  }}
                />
              </div>
            );
          })}
        </>
      )}
    </>
  );
}
