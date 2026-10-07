# AWB Core Tool

New SC live-set foundation on `integration/bw-sc`. `AWBCoreTool : Tool` replaces
AWBase's role as a convenience/ownership root for new sets. The original
AWBCore.sc, AWBase, Param, AWFollower, AWBlender and live class paths are unchanged.
This is a parallel implementation, not an installed migration of existing sets.

## Agreed boundary — 6 October 2026

The live-set root remains one concrete Tool with construction helpers, named
registries and native ownership. The public live-set root is now `AWBaseTool : AWBCoreTool`; the original
Core API remains available. AWBase-style logging and semantic track dictionaries
are added by that subclass. No generic Context or separate Base/adapter layer is needed.
Rack and Chain remain independently usable Tools. DynamicTrackContainer is to
be reduced to a named dictionary of existing controls plus MIDI/access helpers;
Rack, Chain and AWParam keep their authoritative controls, buses and state.
The direct rack measurement → follower → AWParam → Chain path is the next slice.

The user reports a newly compiled scsynth with mapping/live-control queries
(`getMappedn`, `getLive`, etc.). Verify its actual command/reply contract before
adapting readback; current private tests still use installed SC 3.12.2 and the
existing SendReply implementation.

## First slice

- `AWBCoreTool`: native ToolInstance/NodeManager ownership, ordered phase Groups,
  named parameters and owned/borrowed buses, custom cleanup, child native Tools,
  and tracked Event/Pattern/Stream/EventPreset/UGen-function playback.
- `AWParam`: full-precision native base value, normalized modulation depth,
  modulation shaping, independent server-side transitions for base and amount,
  effective output mapping, explicit readback and source connections.
- `AWMidiCCIn`: CC pickup against the **current unmodulated base**, coalescing
  incoming CC candidates while a server read is outstanding. External base edits
  rearm pickup; the source's own edits retain takeover.

The optional [live surface](../live-set/README.md) composes the rack, borrowed
delay views, FX AWParams and AWBase console. Existing child rack/Chain tools
retain their own panels and lifecycle. No old OSC receiver, Bitwig MIDI banks or global MIDI
initialization is introduced by opening Core. Native Tool registration and
NodeManager projection use the existing framework, not another tracking registry.

## Use

Add `apps/core/sc/classes` to a WIP/private SC class path alongside the current
Tool framework. Add `apps/chain/sc/classes` and `apps/rack/sc/classes` if using
those convenience wrappers. Do not add `sc/test`: its TestServer is only an OSC
fixture. The test runner constructs this private library without installing it.

```supercollider
~coreInstance = AWBCoreTool.open((name: "My set"), (server: s));
~core = ~coreInstance.tool;
~core.whenReady({
    ~cutoff = ~core.createParam(\cutoff, 1000, ControlSpec(20, 20000, \exp));
    ~cutoff.setBase(4000, 2, -4); // value, seconds, numeric Env curvature
    ~cutoff.setAmount(0.25, 1);  // independent envelope, same signature
});
```

`set` and `setI` alias `setBase`. `setM` converts 0..127 through the parameter's
ControlSpec, quantizing only at that MIDI boundary. Omitting the base at
construction uses the ControlSpec default. `setBase`/`setAmount` default duration
to **0** (immediate) and curve to their configured transition curve (initially 0).
`transitionCurves(base, amount)` changes those defaults; `setModCurve(curve)`
changes modulation shaping separately. Curves accept finite numeric SC Env
curvature within -16..16, or `\lin`/`\linear`. Named exponential/sine envelopes
are not accepted in this slice. Amount accepts -8..8 **fractions of full parameter
travel**, with negative values reversing modulation. Base must fit its range.
Only ascending linear or positive exponential ControlSpecs are supported.
ControlSpec step is deliberately 0 internally: GUI/MIDI stepping is a boundary
concern, not a loss of server precision.

Base interpolation runs in **normalized parameter space**: a linear transition
of a log frequency control sweeps perceptually across its range. Output and base
readback are converted back to native units. Modulation curves preserve polarity.
Input magnitude 0..1 is shaped; contributions beyond one range extend linearly,
so summing sources does not silently saturate *before* amount scaling. The final
normalized output clips to 0..1 before the ControlSpec warp.

```text
source writers → modulation input bus → shape × amount + current base → output bus
```

One AWParam owns **two mono control buses and one processing Synth**, plus its
container/source Groups. Base and amount state stay inside that Synth. One-segment
transitions use ordinary control-rate UGens and LocalIn/LocalOut state, with
explicit command serials. They capture the previous control sample on retrigger;
there is no server read round trip and no OSC stream of intermediate values.
This also handles identical-target retriggers and edits on adjacent control
blocks. Precision/timing is control-block bounded, not audio sample interpolation.
These are persistent processors; the earlier minimal static-Param CPU figures
are **not measurements of this fuller processor**.

### Modulation and mapping

Write with `Out.kr` to `param.inputBus` from nodes in `param.sourceGroup`. That
Group executes before the processor. The processor clears the input **after**
consuming the sum, preventing stale values after the last writer is removed.
Never use `ReplaceOut.kr` for a contributor that should sum with other writers.

For existing mono control buses:

```supercollider
~cutoff.addModulation(\cello, followerBus, 0.5, 0);
~cutoff.addModulation(\gesture, gestureBus, -0.2, -4);
~cutoff.removeModulation(\gesture);
~cutoff.mapTo(filterSynth, \cutoff);
```

Each borrowed-source connection adds one route Synth, no extra buses. Source
signals are normalized -1..1 (unipolar 0..1 is fine); connection input is clipped
to that range. Connections apply their own depth/curve before summing. The source
bus and its generating Synth remain the caller's property. Sources must execute
before the connection to get same-block values; reading a later control producer
uses its previous control value. Core's default group order is **a starting
layout**, not an automatic dependency solver:

`input → voices → routing → detectors → parameters → fx → output`

Provide a different `groups:` array for a different graph. Cyclic modulation or
parameters controlling earlier voices may intentionally entail a control-block
latency. Rack and Chain keep their internal execution order.

`mapTo` accepts control-rate Synth controls; `asMap`, `asControlInput`, `asNodeArg`,
`asBus` and `kr` support ordinary SC integration. Freeing a Param unmaps destinations
it still owns, restoring their stored scalar value; an older Param cannot unmap
a destination reassigned to another AWParam. Borrowed destination nodes are not
freed. Bus IDs are released after server sync, never immediately reused while
old writers may still exist. Server quit invalidates the owned resources.

### Registered modulation sources — 6 October 2026

Core now owns an `AWModulationRegistry`. A named `AWModulationSource` borrows a
mono control bus and its producing Synth or Group. Registration does not transfer
ownership or start DSP. Declare the actual producing scheduling unit; the registry
cannot infer which synths write a bus. A Group declaration means its whole subtree
must finish before a same-block reader.

```supercollider
~core.registerModulationSource(\celloEnvelope, follower.outputBus, follower.group);
~cutoff.addModulation(\cello, ~core.modulationSource(\celloEnvelope), 0.5, 0,
    action: { |connection, error|
        if(error.notNil) { error.reportError };
    }
);
~cutoff.mapToChecked(filterSynth, \cutoff,
    action: { |mapping, error| if(error.notNil) { error.reportError } }
);
```

Registered connections return a **record**, rather than the Synth returned by a
plain Bus connection. Its `status` is `pending`, `connected` or `removed`; `node`
is absent until the order check succeeds, and `error` explains rejection/removal.
Treat the completion callback as readiness for the connection. IDs are reserved
while pending, and removal/closure cancels validation. Validation sends
`/g_queryTree 0 0` and parses the real controls-free reply into subtree intervals.
A missing producer/processor, malformed reply or one-second timeout fails without
creating a route. Plain Bus `addModulation` and ordinary `mapTo` retain their
existing unchecked-order behaviour.

Default timing is `\sameBlock`. A later producer/consumer or a same-block cycle
is rejected. Set `timing: \previousBlock` deliberately to **permit** a previous
block's control value; this is not an inserted delay and an earlier producer will
still supply the current value. Route synths must always remain in the parameter's
source Group before its processor. No automatic node or Group movement is done.
A producer Group containing that route Group cannot serve as a same-block source;
register the individual writer instead.

A source generated specifically for one Param can be built and owned there:

```supercollider
SynthDef(\gestureWriter, { |out=0, rate=0.2|
    Out.kr(out, SinOsc.kr(rate)); // additive control-rate writer
}).add;
s.sync;
~gesture = ~cutoff.createModulationWriter(\gesture, \gestureWriter, [\rate, 0.2]);
~cutoff.removeModulationWriter(\gesture);
```

The helper requires a known SynthDef with a control-rate output-bus argument. It
assigns that argument to `inputBus`, places the writer inside `sourceGroup`, and
records native ownership. Callers must supply an additive **Out.kr** SynthDef;
the helper does not rewrite its signal graph or convert audio to control rate.
Per-writer shaping can live in that SynthDef; borrowed sources continue to use
per-connection depth/curve in the existing route Synth.

```supercollider
~core.validateModulationOrder({ |reports, error| reports.postln });
// Explicit opt-in to detach invalid routes/mappings or free misplaced owned writers:
~core.validateModulationOrder({ |reports, error| reports.postln }, true);
~core.unregisterModulationSource(\celloEnvelope);
```

Audits check source → route → processor, registered helper writers and checked
processor → destination mappings. They report only by default. Run an audit
after deliberately rearranging external nodes; order is not continuously polled
and a successful snapshot cannot prevent later external edits. Invalidation of a
registered producer via its node-end notification removes all of its connections,
while preserving the borrowed bus. Unregistration behaves the same way. Param,
route and destination closure remove their own connection/mapping records; root
closure releases the registry and pending callbacks. Sources shared by other
parameters are not owned or freed by the recipient. Runtime registration is
inspectable through Core `content`, but is not yet whole-set preset persistence.

Standalone Params may use `AWModulationRegistry(server)` directly; register a
source there and pass its descriptor to `addModulation`. For checked destination
mapping, pass `registry:` explicitly. The coordinator owns only bookkeeping,
not borrowed sources. Score/capture transports have no live node-tree reply;
registered connections require an explicit `queryFunction` order fixture and
otherwise fail, rather than pretending to have verified server order.

### Readback and MIDI

```supercollider
~cutoff.getBase({ |value, error| if(error.isNil) { value.postln } });
~cutoff.getEffective({ |value, error| /* resulting native control value */ });
~cutoff.getState({ |state, error| /* base, amount, effective, observedAt */ });
~cutoff.watch(8); // optional observations; stopWatching stops periodic replies
~cc = ~cutoff.createMidiSource(midiSourceUID, 0, 21, passthru: true);
// Or pass your existing MIDISource object instead of the raw UID.
~cutoff.removeSource(~cc); // detaches and frees the MIDI callback
```

`baseTarget` and `amountTarget` are requests, not assertions about current value.
`cachedBase`, `cachedAmount` and `cachedEffective` are nil until observed, then
refer to `snapshot.observedAt` (language receive time). Reads are asynchronous.
A query temporarily enables 64 Hz replies; concurrent callbacks share the same
request and rate returns to the watch setting after completion. Command serials
prevent an older reply from satisfying a read after a newer target command.
Callbacks receive `(value, error)` or `(state, error)`, including explicit timeout
and close errors. Periodic watching defaults to 8 Hz when requested and is limited
to 30 Hz. There is no polling by default apart from the Synth's initial reply.
This per-Param SendReply observer is a first pass; a shared batched observer is a
later transport/cost investigation. Control readback only; no audio value queries.

MIDI is an attached source, like the legacy `Param` pattern. `createMidiSource`
returns an `AWMidiCCIn` and uses the same argument order:
`(midiInClient, chanIn, ccIn, lo=0, hi=127, passthru=false)`.
`passthru: true` enables pickup; the default writes directly, matching the old
API. `lo`/`hi` remap the CC range before pickup and writing. MIDI initialization
remains the caller's responsibility. `addSource` can attach an existing source;
`removeSource` disposes it, or `removeSource(source, false)` detaches it for reuse.
After reattachment, call the source's `midiDef` to reinstall its MIDI callback.
The optional final `install=false` argument to `createMidiSource` allows manual
CC injection without registering a callback (used by the private tests).
Closing the parameter frees its attached sources. These are language-side input
objects; they allocate no extra buses or Synths.

MIDI pickup uses one-CC-step proximity or crossing of the observed base. Once
latched, CC edits write immediately and cancel the base transition. Changes made
elsewhere rearm pickup. MIDI input hardware was not exercised by the private tests.

### Live-set ownership and playback

```supercollider
~voiceBus = ~core.createBus(\voice, \audio, 2);
~core.playTracked((instrument: \myVoice, out: ~voiceBus.index, freq: 220));
~core.playTracked(Pbind(\instrument, \myVoice, \out, ~voiceBus.index, \dur, 0.25));
// Event Stream and EventPreset data are accepted too.
~core.playTracked({ SinOsc.ar(220) * 0.05 }, (out: ~voiceBus.index));

~chain = ~core.openChain(\fuzz, AWBChainFuzz.managedConfig,
    (input: ~voiceBus, output: fxBus));
~rack = ~core.openRack(\rack, rackConfiguration);
~core.closeTool(\fuzz);
~coreInstance.close;
```

Register each child's factories/SynthDefs beforehand. Wrappers return the native
child ToolInstance; `.tool` is the rack/Chain. Child instances retain ownership of
their own graphs; Core controls containment and parent lifecycle. The rack's root
is adopted into the routing phase because its current constructor does not accept
a target. No rack internals or Chain control setters are rewritten in this slice.
Root closure closes children before releasing its own resources. Manually closing
a child is supported; closing an externally freed root closes the Core instance.

Tracked notes require an **explicit `out`** and always use the Core's selected
server/group. There is no automatic direct-to-Master route. Pattern emissions are
Core-owned as well as associated with their tracked stream. NodeManager supplies
node-end observation; Core removes finished playback/resource records.
EventPresets are consumed as musical Event data under Core ownership, without
invoking their older Playlist bookkeeping. Custom Event types remain responsible
for their own semantics. UGen Functions require a live server; score/capture
transport rejects them explicitly.

`borrowBus` registers a reference without taking ownership. `ownResource(id,
object, cleanup)` registers custom cleanup; `addSynth` registers a named owned
Synth. Never put borrowed resources under an owned parent Group unless you intend
that parent closure to destroy them. Named allocated buses stay until Core closes.

Preset promotion currently reconstructs **Core groups and parameter targets**, not
a full live-set graph or intermediate envelope state. Its metadata labels that
scope and lists runtime buses/child Tools. Custom factories, bus connections,
playback, MIDI bindings and modulation connections are not silently serialized.
The eventual set manifest must explicitly describe those links.

## Migration boundary

| Existing role | New direction | Status |
| --- | --- | --- |
| AWBase root/convenience collections | AWBCoreTool and native owned resources | First slice implemented |
| Param value/MIDI controller | AWParam with attached AWMidiCCIn source | New implementation; old code unchanged |
| AWBlender | Specialised processing strategy alongside AWParam's additive default | Existing weighted formula not migrated |
| AWFollower | Owned follower processor borrowing rack detector/control buses | Not migrated |
| BasicContainer / DynamicTrackContainer | Channel/Chain references, language-side parameter collections | Not migrated |
| DelayContainer | Explicit Chain factory/control bindings | Not migrated |
| Scene | Compositional set definitions referencing separate mix presets | Not migrated |

Migrate one real follower → blender/Param → Chain control path first. Verify MIDI
pickup, modulation depth/curve and output against the old path before expanding
to the complete BaseLaunch. A new Core/Param editor, direct AWParam-backed Chain
GUI bindings, specialised processing, whole-set persistence, MIDI output and the
live hardware performance run remain subsequent slices. Engine mapping/live-value
query changes are a separate workstream; this implementation needs no engine patch.

## Verification

```sh
python3 apps/core/sc/test/run.py --output /private/tmp/awb-core-tests
```

The private runner uses installed SC 3.12.2, current Tool framework/Chain/rack
classes, an offline 44.1 kHz/64-sample render and an emulated OSC server peer.
No audio interface, Bitwig set, existing sclang session or live class path is
changed. Contracts verify native ownership, validation, mapping and child wrappers.
Offline audio verifies actual parameter DSP, independent/interrupted/curved
transitions, adjacent-block retriggering, additive routing and cleanup. UDP tests
exercise the language responder, coalesced reads, timeout/close behaviour and
tracked stream ownership; the emulated peer is **not a live scsynth DSP test**.
Source hashes and logs are saved beside the rendered audio. A live server/MIDI
hardware run and full processor CPU measurement are still unrun.

Registration slice verification: 70 existing Core contracts, 49 registration
contracts, 38 actual offline DSP assertions, 31 existing language/UDP assertions
and 13 registry UDP assertions pass in `/private/tmp/awb-core-modulation-final-20261006`.
The tree fixture and UDP peer exercise protocol/ordering/lifecycle semantics; the
actual offline render verifies registered source routing and helper-owned writers.
A fresh real-time scsynth tree-query run, hardware MIDI, GUI integration and load
measurement remain unrun. No live classes are installed. This implementation is
recorded in the registration commit checkpoint. The public AWBaseTool rename
remains a separate pending change.


## Continuous SelectN and first Verb profile

`AWSelectN(count, basePole, target, server, options)` is a reusable component,
not another Tool host. It owns one Synth, a child Group, and one contiguous
control-bus allocation of `count` outputs (2..32). `AWSelectN.prepare(server, count)`
loads the width-specific definition before live creation. Position is 0..1;
`setPosition` can set it directly, or an AWParam can map to `select.synth`'s
`position`. `busAt(index)` returns a borrowed mono view; never free the view.
Close the selector to release the entire allocation. Ownership callbacks use the
same `ownFunction`/`disownFunction`/`sendFunction` contract as AWParam.

With `basePole: false`, position traverses N triangular poles, starting at the
first. With `basePole: true`, zero has no active pole and the N poles span
1/N..1. Between poles two weights crossfade linearly. The policy is explicit;
it does not claim exact Bitwig Select-4 compatibility without host comparison.

The first set-specific consumer is `AWBVerbMixProfile` in
`apps/rack/sc/sets/awb52`: one selector AWParam, Select-4 and five branch AWParams,
with twenty independent depth routes. The complete profile Group and its
consumer are ordered together by construction. External registered producers
retain the existing tree-check contract; plain borrowed buses remain unchecked.
AWFollower/AWBlender are unchanged. The native rack owns these component nodes;
no new standalone ToolInstance is added. See that folder's README for captured
matrix/gain semantics, attachment and opt-in use.

Private verification also compiles this set-specific controller without a VST
dependency and renders its parameter DSP through scsynth. In
`/private/tmp/awb-verb-select-20261006-final`, the existing 201 Core/registration
checks pass, plus 25 selector/profile contracts and 64 offline audio assertions.
The new audio checks cover profile poles, continuous normalized interpolation,
pre-processing gain, tails, borrowed blender input, server-timed transitions and
closure. The blender input is a synthetic KR stand-in, not a live BaseLaunch run.
A real-time performance measurement, hardware MIDI and dedicated profile panel
are still unrun/unimplemented. No live classes are installed.


## Tail-gated effect Groups

`AWFXTailGate(sourceAudioBus, mixKRBus, destinationAudioBus, parentGroup,
settings, options)` borrows its source, mono effective mix, destination and optional
`options[\levelBus]`; it owns stereo/multichannel input/output pipes, state and
measurement KR buses, a processor Group and two always-running guards. Call
`AWFXTailGate.prepare(server, width)` before live creation, then
`gate.createProcessor(defName, args)` to create an owned processor with fixed
`in`/`out` pipes. Argument pairs cannot override those pipes. Native ownership
callbacks match AWParam; this component does not open another ToolInstance.

A zero effective mix closes ingress, preserves the audible tail, then pauses the
processor Group once `minTail` and a sustained quiet window have elapsed. Initial
zero pauses immediately; reselection resumes before input. Defaults are minTail
0.1 s, no hard cap (`maxTail: 0`), quietDb -90, quietHold 0.25 s and fade 0.02 s.
A positive hard cap explicitly permits fading out a nondecaying tail. Pausing
retains/freeze states; it does not free buffers or unload plugins. `free` releases
only owned nodes and buses, including on server/root closure.

The first consumer is Verb's five independent branches. Its convolution minimums
cover the used IR length; details and per-branch overrides are in the set README.
Private verification in `/private/tmp/awb-tail-gate-20261006-final` adds 15 contracts
and 35 actual offline DSP checks: stopped/resumed DSP progress, retained tails,
server modulation, interrupted drains, timed transitions, hard caps and cleanup.
No CPU reduction or hardware timing result is inferred from those functional tests.
