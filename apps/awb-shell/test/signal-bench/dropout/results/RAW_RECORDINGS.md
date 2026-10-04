# Raw native recordings

The committed reports, per-phase JSON, validation summaries, code snapshots, screenshots
and selected WAV clips are retained here. Bulk `callback-audit.bin.gz` and
`input-return.bin.gz` recordings (about 1.2 GB across the original scope investigations)
are deliberately local and ignored by Git. They remain intact in the original checkout:

`/Users/willy/awb/apps/awb-shell/test/signal-bench/dropout/results/`

A fresh clone does not contain these files. Restore them under the matching result
folder to rerun the full raw-recording audit. SHA-256 hashes and verification JSON
remain alongside the compact results. Historical measurements belong to the exact
pre-ToolInstance configuration described in each report, not the integrated main.

The rack checkpoint also retains the knob, renderer-diagnostic and 15/30 Hz
comparison summaries, fixture source snapshots and screenshots. Its bulk recordings
use the same local-only policy. Earlier excluded loopback captures named
`*.audit.gz` and `*.input.gz` are also ignored; they are preserved on disk. The
small compressed callback-thread timing trace is retained as diagnostic evidence.
Restoring raw audio is necessary to rerun returned-signal analysis, even when
per-phase analysis JSON is present.
