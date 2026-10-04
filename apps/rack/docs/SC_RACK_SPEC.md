# SC send rack — agreed first implementation

Approved by the user's routing discussion, “ready to build”, and requirement to use Tool as the base (2026-10-03).

AWBSendRackTool subclasses the real Tool. ToolDefinition/ToolRegistry/ToolLauncher construct a real ToolInstance; that instance owns and projects the rack's graph through NodeManager. The normal Node rack is its Shell view, opened from sclang. No Param intermediary and no second runtime registry.

Stable, named private audio buses identify destinations for the rack's entire lifetime. Fixed FX have semantic IDs; dynamic FX/follower capacity is reserved at creation. Unassigned FX are silent. The explicit clean destination is mast; voices/channels have zero send gains by default and no automatic dry/master route.

Persistent channels expose an input Bus and a post-fader/mute/solo recording tap. Their send matrix uses one strip Synth per channel. Level, mute and solo act before every send, including follower sends. Audio recording can be attached to the tap; ToolInstance already supplies semantic recording.

Direct voices return audio from a source function and bypass strips. Wrappers use OffsetOut and initial-rate gain/bus controls. Full wrappers address all rack destinations; packed grain wrappers address only an explicitly chosen subset. Variants are compiled/prepared and cached, never compiled by a note event. Missing direct gains are zero; unknown/out-of-mask nonzero gains are rejected. Intentional Bus overrides must be private, same-server and width-compatible. Mono/stereo conversion is explicit.

Each FX generation has a gated ingress, arbitrary user processor Group, and output node with optional limiter into the rack's master sum. Public destination buses remain unchanged on replace/remove. Old ingress fades off, old output remains connected for tails; retirement timeout and per-slot generation budget bound resources. Defaults: 20ms ingress fade, 6s tail timeout, maximum two retiring generations. Factories receive input/output buses and a processor group; they do not own rack buses.

Followers have stable audio input and stable one-channel control output buses, including spare slots. Audio is read with In, not SoundIn. Attack/release smoothing, scaling and explicit linear/log/sqrt curves are provided; log blend is separate from the legacy AWFollower square-root blend. Removing a follower resets its control output to zero without freeing/readdressing the slot. Previous-block control values are acceptable; audio producers precede followers.

Node uses OSC commands only. It fetches SC configuration/commanded state on attach or explicit Sync; there is no continuous per-value readback. Existing legacy Bitwig and direct OSC adapters remain available. Scene identity stays with the compositional SC set; the existing local sparse/full mix editor stores presets associated with those scene IDs. Null targets leave persistent values unchanged; zero is explicit.

Testing must use actual Tool/ToolInstance/NodeManager source, isolated class loading, real offline scsynth audio, and the real Node runtime/renderer boundary. Do not boot/change the user's live server, device, quarks or shared working checkout. Keep implementation in the comparison checkout until separately promoted.
