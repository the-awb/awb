// The compiled SynthDef manifest, cached for the whole page.
//
// tools/compile-synthdefs.mjs writes public/synthdefs/manifest.json when it runs the .sc file
// through real sclang: every def's controls, with the names and defaults taken from sclang's own
// SynthDesc rather than parsed out of the source. So this is the authoritative list of what a def
// actually has, and it is what lets the instrument panel offer the WHOLE def rather than the
// handful of params someone remembered to write down.
//
// A browser can't list a directory over HTTP, which is why the manifest exists at all.

let promise = null;

// The URL is passed in rather than derived. The extracted code built it from
// import.meta.env.BASE_URL, a Vite-specific global, which a package must not depend on.
export function loadSynthDefManifest(manifestUrl) {
  if (!promise) {
    if (!manifestUrl) throw new Error('loadSynthDefManifest: manifestUrl is required');
    promise = fetch(manifestUrl)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`manifest ${r.status}`))))
      .then((json) => {
        const byName = new Map();
        for (const patch of json.patches || []) {
          for (const def of patch.defs || []) byName.set(def.name, def);
        }
        return byName;
      })
      .catch((e) => { promise = null; throw e; });
  }
  return promise;
}

// Controls the app has no business offering as a knob.
//
//   out   - the output bus, always 0 here
//   gate  - the release, driven by starting and stopping rather than by a fader
//
// Multichannel controls are excluded separately: an array default can't drive a single number
// input, and setting one needs /n_setn rather than /n_set. \substrate2 has two (difF[6],
// difFTime[5]). Absent numChannels means 1, so an older manifest still reads correctly.
export const RESERVED_CONTROLS = new Set(['out', 'gate']);

export function settableControls(def) {
  return (def?.controls || []).filter(
    (c) => !RESERVED_CONTROLS.has(c.name) && (c.numChannels ?? 1) === 1,
  );
}
