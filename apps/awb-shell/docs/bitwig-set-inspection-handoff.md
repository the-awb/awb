# Bitwig set documentation: investigation handoff

Status: Stage 1 reviewed; Willy authorized a custom one-shot mapper on 4 October 2026.
Implementation and offline checks are prepared in [Stage 2](bitwig-set-inspection-stage2/README.md); expanded live capture awaits controller activation.
Requested by Willy, 4 October 2026.

## Purpose

Establish how to document existing Bitwig sets accurately and repeatably. Investigate
Beat Twin and Bitwig Control Deck first, then discuss the evidence with Willy before
choosing to use either unchanged, adapt one, or build a small inspector.

The immediate product is documentation of an existing set: its channels, routing,
FX chains and relevant settings. SC migration is a later consumer of that information;
it must not determine or distort what the inspector reports.

This is a separate handoff from the active AWB mixer, SC bridge, follower and audio/GUI
load-testing work. It must not change that workstream's test conditions or shared host.

## Target and evidence already available

- Repository: `/Users/willy/awb`.
- Main installed Bitwig: `/Applications/Bitwig Studio.app`, version **4.3.10**, verified
  from its application plist. Another installation reports 4.1; do not silently use it.
- Target template bundle:
  `/Users/willy/Documents/Bitwig Studio/Library/Templates/awb 5.2 (ef script).bwtemplate`.
- Project inside that bundle: `template.bwproject`, 3,447,457 bytes at initial inspection.
  SHA-256: `c41ab2729aa00efa82586602705380d5b880542b2e7ecc1e26de1308d5cdae94`.
- The template's name includes “5.2”; that is not evidence of the installed Bitwig version.
- The project is binary. Read access and extraction of metadata/name strings are proven.
  Complete track hierarchy, device order, routing and parameter extraction are not proven.
- Strings include Splutter, Sparkle, Decimate, Fuzz, Reverb and Mast, plus named buses.
  Treat them as investigation clues, not a decoded routing model.
- The bundled 4.3.10 API documentation mentions API versions 15 and 16. This is a clue for
  compatibility investigation, not proof that a modern controller loads or every method works.
- DAWproject is unavailable in the installed 4.3.10 release. Do not require an upgrade for
  this investigation. Binary parsing and newer-version exports remain fallback options.

Reverify paths, version and hash at handoff execution. Record any changes rather than
silently replacing the target with a newer project or auto-backup.

## Questions to answer

1. What can each candidate actually inspect on Bitwig 4.3.10?
2. Can it enumerate the whole set, including groups, FX/return tracks, nested containers
   and long device chains, rather than just a visible bank or selected device?
3. Which routing, parameter and modulation details are readable through this version's API?
4. Can observations be captured into a coherent local snapshot with explicit coverage?
5. How much work would unchanged use, a bounded adaptation, or a custom inspector require?

## Candidates to inspect first

### Beat Twin

- Repository: <https://github.com/LaurentHuzard/beat-twin>.
- Controller source:
  <https://github.com/LaurentHuzard/beat-twin/blob/main/bitwig-controller/BeatTwin/BeatTwin.control.js>.
- API audit:
  <https://github.com/LaurentHuzard/beat-twin/blob/main/docs/BITWIG_CONTROLLER_API_COVERAGE.md>.
- Source reviewed initially selects API 15 and creates banks of eight tracks, eight sends
  and eight devices per track. It observes send levels and device state. Investigate bank
  navigation, FX/master access, nested traversal and parameter coverage separately.
- It offers reads by default. Its broader package includes substantial musical tooling;
  determine whether the inspection path is separable without adopting that workflow.
- The README requires Node 26+; its API audit uses Bitwig 6.1.1 and does not establish
  earliest compatible releases. A lower selected API number alone is insufficient proof.

### Bitwig Control Deck

- Repository: <https://github.com/remymazmanian/bitwig-control-deck>.
- Controller source:
  <https://github.com/remymazmanian/bitwig-control-deck/blob/main/controller/ControlDeck.control.js>.
- Source reviewed initially selects API 18; the README targets Bitwig 6 and Node 20+.
- It implements track/device listing, nested-device listing and direct parameter
  identifiers, names, normalized values and display strings for the cursor device.
- Inspect how it navigates nested structures, waits for observations, distinguishes
  devices and reports bank limits. Do not assume it exports the full routing graph.
- Its installer manages controller files and background services. Investigation does not
  require running that installer or deploying its dashboard/native wrapper.

Record exact repository commits and licenses before evaluating code. Separate README
claims, source-implemented behavior, local API support and successful live results.

## Stage 1: establish what is possible

### Source and installed-API review

Build a capability table for both projects against the API bundled with Bitwig 4.3.10.
For each capability, record the relevant controller method, version constraint, current
implementation and limitations. Identify methods that prevent startup as well as methods
that would fail only when a tool is called. Do not just lower `loadAPI()` and declare success.

Prefer a small isolated checkout and the existing local documentation. Preserve dirty AWB
work, the live controller extension and original template. Do not merge or commit shared
work as part of this handoff.

### Bounded live proof, where practical

Use a disposable Bitwig project with known contents, followed by an isolated copy of the
target template. Verify actual host observations and controller logs. If a candidate
cannot load unchanged, record the exact failure. A minimal compatibility probe is allowed
to test specific API questions; it must not become an unreviewed production adaptation.

Start with track identity, one device and one parameter. Then test a group, a nested FX
container, a send and bank pagination. Compare recovered values with Bitwig's display.
Keep playback stopped unless audio is needed to establish a specific fact.

Use inspection operations only. Selection/navigation may move Bitwig's UI cursor; record
that side effect and restore selection when possible. Do not change sound parameters,
clips, routing or project state to make the target easier to inspect. Any invented fixture
content belongs only in the disposable test project. Never save over the original set.

Avoid installing unrelated services or replacing Willy's live extension. Coordinate any
Bitwig launch, audio-device use or background inspection process with the main load tests;
do not run them concurrently. Disable/remove inspection services when the proof ends.

### Documentation coverage to investigate

| Area | Desired information | Important boundary |
| --- | --- | --- |
| Identity | Project path/hash, Bitwig version, extractor version, timestamp | Identify the exact source and live capture conditions |
| Tracks | Names, types, order, groups/parents, FX/returns and master | Visible bank is not the whole project |
| Routing | Inputs, outputs, send destinations/levels and pre/post behavior where available | A send index or display label alone does not prove its destination |
| Devices | Ordered chains, nested layers/slots, types, enabled/bypassed states | FX Layer/Selector/Grid structures may need different traversal |
| Parameters | Exposed IDs, names, normalized values, display values/units, remote pages | Normalized values are not physical values; remote controls are not all parameters |
| Modulation | Sources, assignments, amounts, follower/sidechain targets where readable | Explicitly report unavailable mappings and hidden internal state |
| Dependencies | Plugin identity/version where exposed, samples/IRs and external assets where discoverable | A path or name is not proof that the dependency is installed or licensed |
| Gain and timing | Track/send levels, wet/dry, relevant latency/delay settings and sidechains | Do not infer gain law, latency or signal order from a name |

Mark each field as observed, unavailable through the API, unimplemented, unresolved, or
truncated. Preserve actual zero, false and empty values separately from missing data.
Report enabled and disabled devices; do not silently omit the latter.

Observed controller values are asynchronous host caches. Explain how navigation changes
bindings, how values are allowed to settle, and how stale or partial captures are detected.
Declare bank sizes, pagination, timeouts and traversal limits in output. Test beyond a
bank boundary and include duplicate track/device names so index/name assumptions are exposed.
Do not invent stable IDs where the API only supplies positions or cursor-relative identity.

## Stage 1 deliverables

1. A concise capability comparison with source references, pinned commits and live proof.
2. Reproduction steps, host logs and exact failures for compatibility probes.
3. A sample local JSON snapshot and a readable Markdown set description if extraction
   succeeds. If it does not, provide the verified partial result with its gaps.
4. A proposed output schema covering hierarchy, routing edges, devices, parameters,
   dependencies, provenance and coverage. This remains a proposal until discussion.
5. Three bounded options: use a candidate unchanged, adapt a candidate, or write our own.
   For each, state work required, dependency footprint, unsupported areas and maintenance
   implications. Recommend one based on evidence, not catalogue size or popularity.

If exploration reaches an API limit, document that limit and propose a concrete alternative:
manual annotation, targeted UI inspection, binary extraction or export through a newer
Bitwig installation. Do not spend an open-ended period reverse-engineering the project.

## Stage 2: discuss with Willy before implementation

The investigator stops after presenting Stage 1 evidence. Discuss:

- Is the documented set detailed enough to understand and reproduce its routing and FX?
- Which unavailable details matter, and which can remain manually annotated?
- Should the result be a one-shot CLI export, an MCP inspector, or another interface?
- Should we use, adapt or build, and what exact first implementation is authorized?
- Where should snapshots and human annotations live, and how should later captures update them?

No production inspector, MCP registration, SC importer/exporter or migration is approved
merely by completing the investigation. Choose that work with Willy at this checkpoint.

## Intended eventual behavior

After an implementation choice, aim for an on-demand local capture of an open Bitwig set
that produces structured data plus readable documentation and an explicit coverage report.
An unchanged set should produce comparable musical content after incidental timestamps and
session metadata are removed. Human annotations must survive refresh; machine-observed and
human-entered facts must remain distinguishable.

The immediate scope does not require continuous Bitwig feedback, a replacement controller,
project writes, or universal `.bwproject` round-trip support. Future SC migration may use the
documented topology, but must label recreated DSP, approximations and unsupported devices.
SC compositional scenes must not be conflated with Bitwig launcher scenes or mixer presets.

## Relationship to the main mixer work

The main work remains: integrated bidirectional SC bridge cost; mixer combined with 32
medium transparency knobs, eight waveforms, and both; an eight-instrument/eight-FX rack
(five fixed FX slots, three dynamic); the AWBFollower control-input layer; and a first SC
recreation of the existing FX routing once sufficiently documented.

This handoff supplies the last item with evidence. It does not gate the first four or
change their current renderer, audio bridge, MOTU routing, or performance test baseline.
