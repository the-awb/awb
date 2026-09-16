// Synths on the server that this app did not create — the ones made in the Console.
//
// They arrive for free: /notify is per server rather than per client, so the app hears the /n_go
// for everything sclang starts. What /n_go does NOT carry is the def name or the controls, so each
// one is a prompt to run /g_queryTree and read them back (see useInstrumentVoices.refreshTree).
//
// They are deliberately NOT instruments. An instrument owns its node, its params drive both /n_set
// and the shader, and it can be saved in a session. These are observed: the app knows what they
// are and can stop them, but it did not choose their parameters and has no field model for them,
// so they make sound and no light. Showing that plainly beats either hiding them or pretending
// they are the same kind of thing.
import { resolveInstrumentColor } from '@awb/field-engine';
import { externalToInstrument } from '../../engine/externalInstrument.js';

export default function ExternalNodes({ nodes, selectedId, speakers, colorOffset = 0, onSelect, onRelease, onFree }) {
  if (!nodes || nodes.length === 0) return null;

  // Which externals the canvas actually draws, and in what order - it appends them after the
  // instruments, skipping any def it has no model for, so a node's colour slot is its position
  // among the DRAWABLE ones rather than its position in this list.
  const drawableIndex = new Map();
  for (const n of nodes) {
    if (externalToInstrument(n, speakers)) drawableIndex.set(n.id, drawableIndex.size);
  }

  return (
    <>
      <h2 style={{ marginTop: 14 }}>From the console</h2>
      <p className="note" style={{ marginTop: 0 }}>
        Running on the same server, made outside the app. Click one to edit its controls — read
        back from the server, so they work even for a def the app never compiled. A def the app
        knows is also drawn in the field; one it doesn&apos;t is audible only, and says so.
      </p>
      <div className="instList">
        {nodes.map((n) => (
          <div
            key={n.id}
            className={'instRow' + (n.id === selectedId ? ' selected' : '')}
            onClick={() => onSelect(n.id)}
          >
            {(() => {
              // The dot carries the colour it is DRAWN in, so a blob in the field can be traced
              // back to the row that made it. The canvas appends externals after the instruments
              // in tree order, so the index it colours by is the same arithmetic here; a def with
              // no field model has no colour to show and stays blue.
              const drawn = drawableIndex.get(n.id);
              const color = drawn == null ? '#7fb8ff'
                : resolveInstrumentColor(externalToInstrument(n, speakers), colorOffset + drawn);
              return (
                <span
                  className="instLive"
                  title={drawn == null ? 'Sounding on the server — not drawn, no field model for this def' : 'Sounding, and drawn in this colour'}
                  style={{ color }}
                >●</span>
              );
            })()}
            <span className="instType">\{n.defName}</span>
            <span
              className="instFreq"
              title={`node ${n.id}, in group ${n.parentId}`}
              style={{ fontFamily: 'monospace', fontSize: 10, color: '#777' }}
            >
              {n.id}
            </span>
            {Object.hasOwn(n.controls, 'gate') && (
              <button
                title="Release — gate 0, let the envelope finish"
                onClick={(e) => { e.stopPropagation(); onRelease(n.id); }}
              >Rel</button>
            )}
            <button
              className="remove"
              title={`Free node ${n.id} — immediate, no release`}
              onClick={(e) => { e.stopPropagation(); onFree(n.id); }}
            >✕</button>
          </div>
        ))}
      </div>
    </>
  );
}
