# @awb/score

Canonical source lives in the `~/awb` workspace. Applications consume a built private artifact;
they do not keep an editable copy of this package.

Private workspace package: the score format and the seven editing verbs.

- `@awb/score` — pure, dependency-free. No React, no three, no SuperCollider, no DOM.

A score is a flat array on absolute time:

```js
{ id, time, path, event }
```

| | |
|---|---|
| `time` | seconds from the top of the piece. **`time`, not `t`** — `PTimelinePlayer` spells it this way, and it is the thing that will read these scores |
| `id` | authored identity, stable across every edit. Not a runtime node id; a renderer maps one to the other at spawn |
| `path` | grouping, as an array of segments. `~srcPath` under another name. **A group is a path PREFIX** |
| `event` | the payload. **Nothing in this package reads or writes it** |

## The seam

The verbs edit **time and structure**. They never touch an event's payload, which is what lets
the same core hold a synthesis score, a parameter automation list, or any other chronology
without knowing it has changed field.

So the meaning of an event lives **outside** this package. `note` / `set` / `release`, `target`,
`addAction` are SuperCollider vocabulary and belong next to whatever spawns synths. Keeping this
core payload-blind is the whole reason it is reusable; a host that needs the audio semantics
composes them on top rather than finding them in here.

## The seven verbs

```js
select(score, query)                      // ids: { ids, from, to, after, path, type }, ANDed
nudge(score, ids, delta)                  // move a selection rigidly
rippleFrom(score, time, delta)            // open or close a gap at a point
setGap(score, idA, idB, gap, { ripple })  // space two events
stretch(score, ids, factor, { origin })   // scale a region about a fixed point
group(score, ids, name)                   // wrap into a prefix
ungroup(score, ids)                       // strip one level
```

Every verb is pure: a new score out, the input untouched, and cheap enough to call on each frame
of a drag. Absolute time is what makes that true — nudging one event is an assignment, and ripple
and stretch are an `O(n)` map over an `n` of a few hundred at forty minutes. Relative anchors in
the *stored* score would make playback resolve a dependency graph, and would give a live-recorded
take, which has no anchors at all, a second kind of score.

Supporting calls: `makeEvent`, `newEventId`, `adoptIds`, `sortScore`, `byId`, `duration`, and
`commonGroup` / `groups` / `hasPrefix` for what a UI must ask before offering a verb.

## Five behaviours that are decisions, not details

The tests pin each, and each is a way this could be silently wrong:

1. **A move past zero is limited, not clipped.** Clamping events individually piles a selection
   onto 0 and destroys its spacing — the one thing an arranger exists to edit. The whole
   selection stops when its earliest member reaches 0.
2. **`group` prepends.** A group is a *prefix*, so wrapping `['a']` and `['b']` gives `['g','a']`
   and `['g','b']` and a prefix match finds both, plus anything added inside later. Appending
   would give two paths that merely end alike, and prefix selection would find nothing.
3. **`ungroup` throws** on a selection sharing no outermost group, rather than returning the
   score unchanged. A silent no-op on a structural edit is indistinguishable from success; ask
   `commonGroup()` and disable the control instead.
4. **`setGap` names a pair, it does not order one.** The later of the two moves, so swapping the
   arguments changes nothing. `{ ripple: true }` carries the tail.
5. **Sorting is by `time` alone**, relying on `Array.prototype.sort` being stable, so events
   sharing an instant keep their order. Same-time ordering is a replay question and a verb must
   not answer it by shuffling.

`adoptIds(score)` exists because the id counter is per process: call it on any score that arrived
from a file, a pattern or another machine before adding events, or a fresh page will reissue ids
the score already holds. Two events sharing an id means nudging either moves both.

## The renderer contract

A score is authored intent; every engine that can act on it is one renderer of it. A renderer
declares which event types it understands and which keys it cannot act without:

```js
const sc = defineRenderer({
  name: 'supercollider',
  handles: {
    note:    { required: ['def'] },
    set:     { required: ['target'] },
    release: { required: ['target'] },
  },
});

const report = checkScore(score, [sc]);   // { ok, complete, rejected, unhandled }
describeCheck(report);                    // one line for a UI, '' when there is nothing to say
```

**This is still payload-blind.** Nothing in the package names an event field; it reads `event`
only through key names a renderer supplied. That is what lets it check a payload it cannot
interpret.

**Two verdicts, because they need different responses:**

| | meaning | |
|---|---|---|
| `rejected` | a renderer claims the type but cannot act on this event — a `set` with no `target` | always a bug, `ok: false` |
| `unhandled` | no renderer claims the type at all | **unverified, not broken** — `ok` stays true |

The second follows the same rule as this project's UGen allow-list: absence is reported as
unverified rather than broken, because the renderer that handles it may simply not be loaded.
`ok` means nothing is malformed; `complete` means nothing will be silently dropped. A live editor
can warn on `complete: false` and carry on; a render-to-audio path should insist on it.

An event is fine if **any** claiming renderer can act on it, so a score played through several
renderers is covered by their union.

`required` is a list of keys, not a schema — present and not `undefined`. Types, ranges and
relationships belong to the renderer. The moment this grows a validation language it stops being
a contract and becomes a second, worse copy of the thing it describes.

**What it does not do: it checks the vocabulary, not the engine.** `{ type: 'note', def:
'substrate' }` passes whether or not any server has heard of `\substrate`. That is a runtime
question and belongs to a runtime check.

## Tests

```
npm test        # node test/score-verbs.mjs
```

46 assertions across two files (`score-verbs.mjs`, `renderers.mjs`), no browser and no build step. They state the exact times they expect, because a
verb that moves the right events by nearly the right amount looks perfect on a timeline drawn at
six pixels a second and is wrong in the material.

The suite catches a thrown error as a failure rather than letting it kill the run — a verb that
throws where it should not otherwise prints nothing at all, which reads as an empty harness.

## Not in here yet

Delta ↔ absolute conversion, anchors (free-running cycles derived from the material's own beat
frequencies) and the same-time ordering rules for deterministic replay are all pure, and belong
here when they are built. Evaluating an envelope shape into engine arguments does not.
