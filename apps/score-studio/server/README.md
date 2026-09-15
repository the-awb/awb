# Browser-to-OSC transport boundary

## What already existed

`~/lissajous-viz/bridge/osc-bridge.js` is a working generic `osc-js` BridgePlugin process. It
relays arbitrary OSC between a browser WebSocket and fixed UDP input/output ports. The paired
`src/oscClient.js` is application-specific: it recognizes only
`/lissajous/<groupID>/<field>` messages.

`awbCollider/examples/nodemanager-osc-client.mjs` and
`examples/score-timeline-osc-client.mjs` are reusable **Node-to-sclang UDP clients**. They do not
provide a browser WebSocket endpoint. `field_modelling` has architecture notes for these routes but
does not contain another Node relay implementation.

These are complementary pieces, not competing protocol definitions:

```text
browser protocol client
  <-> WebSocket/OSC relay
  <-> local UDP
  <-> desktop sclang protocol implementation
```

## Decision

Generic WebSocket/UDP relay mechanics belong in `~/awb`, not in a field, Lissajous or score
protocol. Each application keeps its own address vocabulary, validation, state and UI:

- Lissajous owns `/lissajous/...` parameter handling.
- NodeManager owns `/awb/nm/...` inspection and provenance semantics.
- Score Timeline owns `/awb/timeline/...` revision, command, transport and realization semantics.

The first AWB implementation is the Score Studio sidecar in this directory. It proves two useful
improvements over the older fixed-port relay: one UDP reply socket per browser connection and a
fresh capability token for every invocation. It deliberately permits only `/awb/timeline/...`
browser messages. That restriction is Score Studio host policy, not a generic relay rule.

Do not make Score Studio depend on `lissajous-viz`, copy its browser client, or replace the working
Lissajous bridge in place. Once a second AWB-hosted protocol consumes the relay, extract the proven
socket/token/codec core into a small shared package here, then cut Lissajous over through its normal
packed-artifact process. Until that second consumer exists, the contained sidecar is cheaper and
more honest than a prematurely generic package.

## Score Studio wire format

WebSocket frames in both directions are:

```json
{ "address": "/awb/timeline/...", "args": ["OSC-safe", 1, 2.5] }
```

The sidecar binds only to loopback, checks a random token in the WebSocket URL, rejects other OSC
namespaces and non-scalar arguments, caps frames at 64 KiB, and forwards replies only to the
browser connection whose UDP socket received them. It owns no score, revision, retry, clock or
realization logic.

Canonical protocol evidence remains separate:

- `packages/score/fixtures/connector-v1/score.json` — complete host-neutral score document;
- `packages/score/fixtures/connector-v1/sc-normalized.json` — expected desktop projection;
- `packages/score/fixtures/connector-v1/osc-transcript.json` — frozen protocol-v1 exchange;
- `test/hosted-transport.mjs` — WebSocket, UDP, snapshot recovery, idempotent retry, transport,
  realization and incomplete-projection replay integration test.
- `test/hosted-real-sclang.mjs` — the same hosted client and sidecar against the real desktop
  bridge, loading all eleven `sonic-attunement-01` events, receiving its bounded generated SC
  projection and seeking to 773 seconds without starting playback.
- `test/hosted-real-browser.mjs` — the complete Chromium editor → WebSocket sidecar → UDP →
  desktop sclang path over the same real score, paired JSON/SC download and seek.
