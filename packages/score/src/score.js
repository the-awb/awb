// The seven verbs, on the score format that already exists.
//
// A score is a flat array of entries on ABSOLUTE time:
//
//   { id, time, path, event }
//
// - `time`   seconds from the top of the piece. The spelling is `time`, not `t` -- settled
//            by PTimelinePlayer, which is the thing that will read this (roadmap E1).
// - `id`     authored identity, stable across every edit here. NOT a server node id; the
//            renderer maps one to the other at spawn (E4).
// - `path`   the grouping structure, an array of segments. This is `~srcPath` under another
//            name: `Ppar([Pdef(\a), Pdef(\b)])` arrives already carrying one, and hand-authored
//            events get theirs from the editor. Grouping is a path PREFIX, so "move these
//            together" is a prefix match rather than a dependency graph.
// - `event`  the payload, untouched by every verb here: type, def, params.
//
// Nothing in this file knows about React, the engine, or playback. All seven verbs are pure:
// they take a score and return a new one, never mutating the input, and they are cheap enough
// that the editor can call them on every drag frame.
//
// Absolute time is what makes them cheap. Relative anchors in the stored score
// (`time: { after: 'x', offset: .25 }`) would make nudging one event a graph resolution and
// would give a live-recorded take -- which has no anchors at all -- a second kind of score.

// Nothing sits before the top of the piece. A move that would push something past it is
// LIMITED rather than clipped: the whole selection stops when its earliest member reaches 0,
// so relative spacing survives. Spacing is the entire point of this editor; piling three
// events onto 0 because one of them ran out of room would destroy the thing being edited.
const MIN_TIME = 0;

let nextAuthoredId = 1;
export function newEventId() {
  return `ev-${nextAuthoredId++}`;
}

// Call this on a score that came from anywhere this counter did not generate -- a file, a
// pattern, another machine -- BEFORE adding events to it.
//
// The counter is per process, so a document saved holding ev-1..ev-10 and reopened in a fresh
// page would hand the next added event `ev-1`, colliding with one already in the score. Every
// verb addresses events by id, so two events sharing one means nudging either moves both and
// `byId` silently returns whichever comes first.
//
// Found by extracting this into a package: inside one app, with one seeded document and no
// second source of scores, it had never had the chance to happen.
export function adoptIds(score) {
  for (const e of score) {
    const m = /^ev-(\d+)$/.exec(e.id);
    if (m) nextAuthoredId = Math.max(nextAuthoredId, Number(m[1]) + 1);
  }
  return score;
}

// Stable by construction: Array.prototype.sort has been stable since ES2019, so events that
// share a time keep the order they arrived in. Same-time ordering is a replay question (E4)
// and the verbs must not silently answer it by shuffling.
export function sortScore(score) {
  return [...score].sort((a, b) => a.time - b.time);
}

export function makeEvent(time, event, { id, path = [] } = {}) {
  return { id: id ?? newEventId(), time, path: [...path], event };
}

export function byId(score, id) {
  return score.find((e) => e.id === id) ?? null;
}

export function duration(score) {
  return score.reduce((max, e) => Math.max(max, e.time), 0);
}

const idSet = (ids) => (ids instanceof Set ? ids : new Set(ids));

// ---------------------------------------------------------------------------
// 1. select
// ---------------------------------------------------------------------------
// Every other verb takes ids, so this is the only place that knows how a selection is
// described. Clauses are ANDed; an empty query selects everything.
//
//   { ids }        explicit
//   { from, to }   a time window, both ends inclusive -- a drag over a block that starts
//                  exactly at `to` should catch it, which a half-open range would not
//   { after }      strictly later than, which is what "ripple from here" means
//   { path }       a group: this prefix and everything under it
//   { type }       event type ('note', 'set', ...)
export function select(score, query = {}) {
  const { ids, from, to, after, path, type } = query;
  const wanted = ids ? idSet(ids) : null;
  return score
    .filter((e) => {
      if (wanted && !wanted.has(e.id)) return false;
      if (from != null && e.time < from) return false;
      if (to != null && e.time > to) return false;
      if (after != null && !(e.time > after)) return false;
      if (path && !hasPrefix(e.path, path)) return false;
      if (type && e.event?.type !== type) return false;
      return true;
    })
    .map((e) => e.id);
}

export function hasPrefix(path, prefix) {
  if (prefix.length > path.length) return false;
  return prefix.every((seg, i) => path[i] === seg);
}

// ---------------------------------------------------------------------------
// 2. nudge
// ---------------------------------------------------------------------------
// Move the selection rigidly. Returns a new score; the selection's internal spacing is
// unchanged, and so is everything outside it.
export function nudge(score, ids, delta) {
  const sel = idSet(ids);
  if (!sel.size || !delta) return score;
  const applied = limitDelta(score, sel, delta);
  if (!applied) return score;
  return sortScore(score.map((e) => (sel.has(e.id) ? { ...e, time: e.time + applied } : e)));
}

// The rigid-move rule, in one place because nudge, ripple and set-gap all need it.
function limitDelta(score, sel, delta) {
  if (delta >= 0) return delta;
  let earliest = Infinity;
  for (const e of score) if (sel.has(e.id)) earliest = Math.min(earliest, e.time);
  if (earliest === Infinity) return 0;
  return Math.max(delta, MIN_TIME - earliest);
}

// ---------------------------------------------------------------------------
// 3. ripple from here
// ---------------------------------------------------------------------------
// Open or close a gap at a point in time: everything at or after `time` moves, everything
// before it stays. This is a selection concept over absolute storage -- an O(n) map, on an n
// that is a few hundred at forty minutes.
//
// At-or-after, not strictly-after: dropping the playhead exactly on an event and pushing
// should take that event with you. `select({ after })` is there for the other reading.
export function rippleFrom(score, time, delta) {
  const ids = score.filter((e) => e.time >= time).map((e) => e.id);
  return nudge(score, ids, delta);
}

// ---------------------------------------------------------------------------
// 4. set gap
// ---------------------------------------------------------------------------
// The verb Will actually asked for: "tweaking spacing between events is very fiddly in code
// when you aren't using a strict grid". Two events, one number, and the LATER of the two is
// the one that moves -- the pair is named, not ordered, because on a timeline you select two
// blocks and the earlier one is obviously the anchor.
//
// `ripple` decides what happens to everything downstream. Off: only the second event moves,
// which closes or opens one gap and leaves the rest of the piece where it was. On: the whole
// tail moves with it, which preserves every gap after this one. Both are wanted often enough
// that guessing would be wrong half the time.
export function setGap(score, idA, idB, gap, { ripple = false } = {}) {
  const a = byId(score, idA);
  const b = byId(score, idB);
  if (!a || !b || a.id === b.id) return score;
  const [first, second] = a.time <= b.time ? [a, b] : [b, a];
  const delta = (first.time + gap) - second.time;
  if (!delta) return score;
  const ids = ripple
    ? score.filter((e) => e.time >= second.time).map((e) => e.id)
    : [second.id];
  return nudge(score, ids, delta);
}

// ---------------------------------------------------------------------------
// 5. stretch
// ---------------------------------------------------------------------------
// Scale a region about a fixed point: the same map as nudge with a multiply. `origin`
// defaults to the earliest selected event, so stretching a passage grows it forwards and
// leaves its start where the ear expects it.
//
// Factor must be positive and finite. Zero collapses the passage onto a point and negative
// runs it backwards; both are almost certainly a bad number arriving from a slider, and
// neither is worth quietly performing.
export function stretch(score, ids, factor, { origin } = {}) {
  const sel = idSet(ids);
  if (!sel.size) return score;
  if (!(factor > 0) || !Number.isFinite(factor)) {
    throw new Error(`stretch: factor must be positive and finite, got ${factor}`);
  }
  const times = score.filter((e) => sel.has(e.id)).map((e) => e.time);
  if (!times.length) return score;
  const about = origin ?? Math.min(...times);
  return sortScore(score.map((e) => (sel.has(e.id)
    ? { ...e, time: Math.max(MIN_TIME, about + (e.time - about) * factor) }
    : e)));
}

// ---------------------------------------------------------------------------
// 6. group
// ---------------------------------------------------------------------------
// Grouping PREPENDS a segment, it does not append one. A group is a common prefix, so
// wrapping ['a'] and ['b'] gives ['g','a'] and ['g','b'] -- and `select({ path: ['g'] })`
// then finds both, along with anything added inside the group later. Appending would give
// two unrelated paths that merely end the same way, and prefix matching would find nothing.
//
// Existing structure inside the group is preserved, which is what makes groups nest.
export function group(score, ids, name) {
  const sel = idSet(ids);
  if (!sel.size || !name) return score;
  return score.map((e) => (sel.has(e.id) ? { ...e, path: [name, ...e.path] } : e));
}

// ---------------------------------------------------------------------------
// 7. ungroup
// ---------------------------------------------------------------------------
// Strips the outermost segment the selection has in common -- the inverse of group, one
// level at a time, so ungrouping a nested group leaves the inner one intact.
//
// It throws rather than no-ops when the selection shares no prefix, because a silent
// no-op on a structural edit is indistinguishable from the edit having worked. The editor
// disables the button using `commonGroup()` instead of catching this.
export function ungroup(score, ids) {
  const sel = idSet(ids);
  if (!sel.size) return score;
  const shared = commonGroup(score, sel);
  if (!shared) {
    throw new Error('ungroup: the selection shares no outermost group');
  }
  return score.map((e) => (sel.has(e.id) ? { ...e, path: e.path.slice(1) } : e));
}

// The outermost segment every selected event shares, or null. Also what the UI needs to
// label the button.
export function commonGroup(score, ids) {
  const sel = idSet(ids);
  let shared = null;
  for (const e of score) {
    if (!sel.has(e.id)) continue;
    const seg = e.path[0];
    if (!seg) return null;
    if (shared === null) shared = seg;
    else if (shared !== seg) return null;
  }
  return shared;
}

// Every distinct group prefix in the score, outermost first -- for drawing group spans and
// for the "select the group this event is in" click.
export function groups(score) {
  const seen = new Map();
  for (const e of score) {
    for (let i = 1; i <= e.path.length; i++) {
      const key = e.path.slice(0, i).join('/');
      if (!seen.has(key)) seen.set(key, { key, path: e.path.slice(0, i), from: e.time, to: e.time });
      const g = seen.get(key);
      g.from = Math.min(g.from, e.time);
      g.to = Math.max(g.to, e.time);
    }
  }
  return [...seen.values()].sort((a, b) => a.path.length - b.path.length || a.from - b.from);
}
