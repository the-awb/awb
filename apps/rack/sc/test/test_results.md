# Send rack test results — 2026-10-03

Delivered implementation verified with the real AWB framework in isolation. No hardware audio server was opened.

| Boundary | Result |
|---|---|
| Tool/ToolInstance/NodeManager contracts and lifecycle | 47/47 passed |
| Node model, runtime, mix editor and real sclang OSC bridge | 26/26 passed |
| Offline mono/stereo scsynth audio | 22 windows, 88 value/output assertions passed |
| HTML/SVG and Three.js interaction checks | Both passed |
| Standard AWB Shell runtime, preload, SC identity/owner, file grants and sparse recall | Passed |
| Vite production build | Passed |

Amount edits caused zero React app/rack/host renders in both views. Tests exercised full/selected snapshots, live amount editing, keyboard navigation, persistent fader/mute/solo sends, empty FX, tail-preserving replacement, follower curves/reset, packed/direct voice profiles, intentional persistent-channel bus overrides, stereo limiting, library ownership and cleanup.

The Shell check verified `toolSessionID` equals the actual SC ToolInstance ID and the owner PID equals its sclang process. Generic native host discovery and Qt embedding remain outside this first pass. Realtime device performance and real-set migration remain untested.

[Evidence and machine-readable results](../../test/artifacts/sc-send-rack/results.json)

Re-run from `apps/rack`:

```sh
python3 sc/test/run.py --gui --shell
```

The ordinary `npm test` skips the actual SC process test unless the isolated runner supplies its class configuration; the counts above include that test.

## Post-refactor verification — 4 October 2026

Against the exact `a2f3a80` framework sources: 47 contracts, 88 offline audio
assertions and 26 Node tests passed. Both renderer and normal Shell gates passed
after the comparison shell incorporated `0c200e6`. Launch/readiness now use
`toolInstanceID` and `--tool-instance`; OSC binding uses `instance.instanceID`.
GUI evidence is in `/private/tmp/awb-native-tool-instance-validation-20261004/test/artifacts/`.
Real sclang was used; server command dispatch in GUI/OSC tests is stubbed. Hardware
audio cost and live-set migration remain unmeasured. The older result above is retained
as historical evidence for the former compatibility runtime.
