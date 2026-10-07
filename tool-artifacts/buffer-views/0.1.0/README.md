# Borrowed delay views

Renderer attachments from SuperCollider commit `4feac995`. See SOURCE.json for the exact source hashes. This artifact contains the requested tape/head/routing views and a **test-only rehearsal backend**; no audio launcher, engine binaries, duplicated AWParam classes or native plugin build.

Production composition supplies the URL of an existing instrument. The live-set runtime discovers its nine descriptors and embeds four tape views plus one routing view. Views share the instrument origin and observation worker. Closing them leaves the externally owned instrument running. Adoption of UBPGraphController into AWBaseTool and routing its separate wet outputs into rack channels remains a distinct integration step.

`?embed=1` opts into compact layout; the underlying commands and source components are unchanged.
