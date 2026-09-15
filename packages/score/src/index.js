// @awb/score — the public surface.
//
// Everything here is pure and dependency-free: no React, no three, no SuperCollider, no DOM.
// The verbs edit TIME and STRUCTURE; they never read or write an event's payload, which is what
// lets the same module hold a synthesis score, a parameter automation list or any other
// chronology without knowing it has changed field.
//
// What deliberately does NOT live here: the meaning of an event. `note` / `set` / `release`,
// `target`, `addAction` are SuperCollider vocabulary and belong next to whatever spawns synths.
// Keeping this core payload-blind is the whole reason it is reusable.
export {
  // the score itself
  makeEvent, newEventId, adoptIds, sortScore, byId, duration,

  // the seven verbs
  select, nudge, rippleFrom, setGap, stretch, group, ungroup,

  // what a UI needs to ask before offering a verb
  commonGroup, groups, hasPrefix,
} from './score.js';

// The renderer contract: how an engine declares what it understands, and how a score is checked
// against it before anything tries to play it. Still payload-blind — nothing here names an event
// field; a renderer supplies the key names.
export { defineRenderer, checkScore, describeCheck } from './renderers.js';

// Canonical persisted score document. Runtime transport and realizations deliberately do not live
// in this object; they belong to the active hosted or standalone execution session.
export {
  SCORE_SCHEMA,
  validateScoreDocument,
  assertScoreDocument,
  createScoreDocument,
  reviseScoreDocument,
  serializeScoreDocument,
  parseScoreDocument,
  hashScoreDocument,
} from './document.js';
