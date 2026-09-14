// The renderer contract.
//
// A score is authored intent, and every engine that can act on it is one renderer of it. This
// is how a renderer says what it understands, and how a score gets checked against it BEFORE
// anything tries to play it.
//
// The failure it exists to catch is the one this project keeps meeting: scsynth ignores unknown
// control names in `/n_set` silently -- no `/fail`, no warning, the knob does nothing and the
// picture stays confident. An event type nobody handles is the same trap one level up. Neither
// program is in an error state, so nothing surfaces it.
//
// **The core stays payload-blind.** Nothing here names an event field. It reads `event` only
// through key names a renderer supplied, so it can check a payload it cannot interpret -- which
// is what keeps this package usable for a chronology that has nothing to do with audio.

// `handles` maps an event type to what a renderer needs in order to act on it:
//
//   { note: { required: ['def'] }, set: { required: ['target'] } }
//
// `required` is a list of keys, not a schema. Types, ranges and relationships belong to the
// renderer -- the moment this grows a validation language it stops being a contract and starts
// being a second, worse copy of the thing it is describing.
export function defineRenderer({ name, handles = {} } = {}) {
  if (!name) throw new Error('defineRenderer: a renderer needs a name');
  for (const [type, spec] of Object.entries(handles)) {
    if (spec?.required && !Array.isArray(spec.required)) {
      throw new Error(`defineRenderer: ${name}.handles.${type}.required must be an array of keys`);
    }
  }
  return { name, handles: { ...handles } };
}

// Missing means absent OR explicitly undefined. A key set to undefined is exactly as useless to
// a renderer as one that was never there, and JSON drops it on the way to disk anyway, so a
// score would otherwise pass in memory and fail after a save and a reload.
const missingKeys = (event, spec) => (spec.required ?? []).filter((k) => event[k] === undefined);

// Check a score against the renderers that will play it. Pure, O(n), and cheap enough to run on
// every edit.
//
// Two verdicts rather than one, because they need different responses:
//
//   rejected   a renderer claims this type but cannot act on this event -- always a bug
//   unhandled  no renderer claims this type at all -- UNVERIFIED, not broken
//
// The second follows `ugen-allowlist.json`: absence is reported as unverified rather than
// broken, because the renderer that handles it may simply not be loaded. Calling an unknown
// type fatal would be wrong often enough that people learn to ignore the check, which costs
// more than the check ever saved.
export function checkScore(score, renderers = []) {
  const rejected = [];
  const unhandled = [];

  for (const entry of score) {
    const event = entry.event ?? {};
    const type = event.type;
    const claiming = renderers.filter((r) => Object.hasOwn(r.handles, type));

    if (!claiming.length) {
      unhandled.push({ id: entry.id, time: entry.time, type });
      continue;
    }

    // One renderer being able to act on it is enough; a score played through several is
    // covered if any of them can. Only report when NONE can.
    const misses = [];
    let accepted = false;
    for (const r of claiming) {
      const missing = missingKeys(event, r.handles[type]);
      if (missing.length) misses.push({ renderer: r.name, missing });
      else accepted = true;
    }
    if (!accepted) rejected.push({ id: entry.id, time: entry.time, type, misses });
  }

  return {
    // nothing is malformed
    ok: rejected.length === 0,
    // ...and nothing will be silently dropped either
    complete: rejected.length === 0 && unhandled.length === 0,
    rejected,
    unhandled,
  };
}

// One line a UI can show. Empty string when there is nothing to say, so a panel can render it
// unconditionally.
export function describeCheck(report) {
  const parts = [];
  if (report.rejected.length) {
    const first = report.rejected[0];
    parts.push(`${report.rejected.length} event${report.rejected.length > 1 ? 's' : ''} `
      + `no renderer can act on (${first.type} at ${first.time.toFixed(2)}s `
      + `needs ${first.misses.map((m) => m.missing.join(', ')).join(' / ')})`);
  }
  if (report.unhandled.length) {
    const types = [...new Set(report.unhandled.map((u) => u.type ?? 'no type'))];
    parts.push(`${report.unhandled.length} unhandled (${types.join(', ')})`);
  }
  return parts.join(' · ');
}
