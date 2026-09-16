import NumberSlider from '../NumberSlider.jsx';
import { RESERVED_CONTROLS } from '@awb/sc-wasm/core';
import { instrumentBooleanFields, instrumentFields, typeForSynthDef } from '@awb/instruments';

// The full control surface for a synth the app did not make.
//
// THE DIVISION OF LABOUR. The /g_queryTree reply says which controls exist and what each one is
// holding right now; the instrument type says how to DRAW the ones it recognises. Neither alone is
// enough. The tree has no ranges, and the type table has no idea what the server currently holds.
//
// That gives two tiers, and the difference is real rather than cosmetic:
//
//   a def we know      \substrate from the console is the same def an instrument plays. We have its
//                      curated ranges, labels and units, so it gets the same sliders - being made
//                      in the console changes who started it, not what it is.
//
//   a def we don't     `{ }.play` compiles a `temp__0` that exists only inside sclang. There is no
//                      manifest entry and no bounds, so a number box is the honest control: it
//                      knows the value and admits it doesn't know the range.
//
// Two kinds of control are shown but not editable, in either tier, because /n_set cannot express
// them and a box that pretends otherwise is worse than none:
//
//   mapped to a bus     reports as a string ("c1"). Writing a number would silently break the
//                       mapping, and nothing here could put it back.
//   multichannel        arrives as one entry per channel and parses to an array (\substrate's
//                       difF[6]). Setting one needs /n_setn.
//
// A known def IS drawn. Its field projection knows what \substrate does, and being started from the
// console changes who started it, not what it does. See engine/externalInstrument.js for what had
// to be true for that - the short version is that absolute phase was never known for instruments
// either, so a node joining the same accumulator is on identical footing.
//
// An unknown def is not drawn and cannot be: there is no field model for a def the app has never
// seen, and inventing one would put light in the room that answers to nothing.
export default function ExternalNodeDetail({ node, speakers, onSetControl, onRelease, onFree }) {
  if (!node) {
    return (
      <div className="panel">
        <h2>Node</h2>
        <p className="note" style={{ marginTop: 0 }}>That synth has ended.</p>
      </div>
    );
  }

  const known = typeForSynthDef(node.defName);
  const type = known?.descriptor;
  const present = new Set(Object.keys(node.controls));
  const numeric = (name) => typeof node.controls[name] === 'number';

  // Only single-segment paths are control names, and only controls the server actually reports can
  // be drawn - a curated field naming something this synth hasn't got would render a slider bound
  // to undefined. A bus-mapped one falls through to `rest`, which shows it read-only.
  const fields = type
    ? instrumentFields(known.key, speakers).filter((f) => f.path.length === 1 && present.has(f.path[0]) && numeric(f.path[0]))
    : [];
  const bools = type
    ? instrumentBooleanFields(known.key, speakers).filter((b) => b.path.length === 1 && present.has(b.path[0]) && numeric(b.path[0]))
    : [];

  const drawn = new Set([...fields.map((f) => f.path[0]), ...bools.map((b) => b.path[0])]);
  const rest = [...present].filter((n) => !RESERVED_CONTROLS.has(n) && !drawn.has(n));
  const hasGate = present.has('gate');

  return (
    <div className="panel">
      <h2>\{node.defName}</h2>
      <p className="note" style={{ marginTop: 0 }}>
        {known
          ? <>Made in the console, on node <code>{node.id}</code> — but it is the same def as a{' '}
            {type.label} instrument, so it gets the same controls <em>and</em> it is drawn in the
            field. The values here are read back from the server, not from what the app believes it
            sent.</>
          : <>Made outside the app, on node <code>{node.id}</code> in group <code>{node.parentId}</code>.
            The app never compiled this def, so these are the controls the server reports: values,
            but no ranges. Audible, and not drawn — there is no field model for a def nothing here
            has ever seen.</>}
      </p>

      <div className="row">
        <label>Stop</label>
        <div className="seg">
          {hasGate && (
            <button onClick={() => onRelease(node.id)} title="gate 0 — let the envelope release">
              Rel
            </button>
          )}
          <button onClick={() => onFree(node.id)} title="/n_free — immediate, no release">
            Free
          </button>
        </div>
      </div>

      {fields.map((f) => (
        <NumberSlider
          key={f.path[0]}
          label={f.label}
          value={node.controls[f.path[0]]}
          min={f.min} max={f.max} step={f.step} decimals={f.decimals} unit={f.unit}
          onChange={(v) => onSetControl(node.id, f.path[0], v)}
        />
      ))}

      {bools.map((b) => {
        // The app spells these as booleans; the server has only floats. 0/1 across the wire, which
        // is what controlsFor does for an instrument too.
        const on = node.controls[b.path[0]] >= 0.5;
        return (
          <div className="row" key={b.path[0]}>
            <label>{b.label}</label>
            <div className="boolSlot">
              <button className={on ? 'on' : ''} onClick={() => onSetControl(node.id, b.path[0], on ? 0 : 1)}>
                {on ? b.onLabel : b.offLabel}
              </button>
            </div>
          </div>
        );
      })}

      {rest.length === 0 && fields.length === 0 && bools.length === 0 && (
        <p className="note">This def has no settable controls.</p>
      )}

      {rest.length > 0 && known && (
        <h2 style={{ marginTop: 16 }}>
          <span className="note" style={{ margin: 0, fontWeight: 'normal' }}>
            {rest.length} more control{rest.length === 1 ? '' : 's'} — no field model behind these
          </span>
        </h2>
      )}

      {rest.map((name) => {
        const value = node.controls[name];
        const mapped = typeof value === 'string';
        const multi = Array.isArray(value);
        const locked = mapped || multi;
        const why = mapped
          ? `Mapped to bus ${value} — setting a number here would break the mapping`
          : multi
            ? `${value.length} channels — setting one needs /n_setn, which this panel does not send`
            : undefined;
        return (
          <div className="row" key={name}>
            <label title={why || name}>{name}{multi ? `[${value.length}]` : ''}</label>
            <input
              type={locked ? 'text' : 'number'}
              step="any"
              value={multi ? value.join(', ') : value}
              readOnly={locked}
              title={why}
              onChange={(e) => {
                if (locked) return;
                const raw = e.target.value;
                if (raw !== '' && Number.isFinite(Number(raw))) onSetControl(node.id, name, Number(raw));
              }}
              style={{
                width: 90, background: '#222', color: locked ? '#777' : '#ccc',
                border: '1px solid #444', borderRadius: 3, padding: '1px 4px',
                fontSize: 11, fontFamily: 'monospace',
              }}
            />
          </div>
        );
      })}
    </div>
  );
}
