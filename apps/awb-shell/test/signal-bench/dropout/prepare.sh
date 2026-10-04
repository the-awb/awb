#!/bin/bash
set -euo pipefail
task_dir="$(cd -- "$(dirname -- "$0")" && pwd)"
clang++ -std=c++17 -dynamiclib -O2 -framework CoreAudio "$task_dir/callback-audit.cpp" -o /private/tmp/awb-callback-audit.dylib
cp /Applications/SuperCollider.app/Contents/Resources/scsynth /private/tmp/awb-audit-scsynth
codesign --force --sign - /private/tmp/awb-audit-scsynth
clang++ -O2 "$task_dir/audit-launch.cpp" -o /private/tmp/awb-audit-launch
clang++ -std=c++17 -O2 -framework CoreAudio -framework CoreFoundation "$task_dir/input-record.cpp" -o /private/tmp/awb-input-record
swiftc -O "$task_dir/focus-probe.swift" -o /private/tmp/awb-focus-probe
focus_pid="$(/private/tmp/awb-focus-probe list | python3 -c 'import json,sys; print(next(a["pid"] for a in json.load(sys.stdin) if a["bundle"]=="com.microsoft.VSCode"))')"
printf 'From the AWB root, run:\n'
printf 'env -u ELECTRON_RUN_AS_NODE PATH=/Users/willy/.nvm/versions/node/v22.23.2/bin:$PATH AWB_AUDIO_AUDIT=/private/tmp/awb-dropout-isolated.audit AWB_AUDIO_AUDIT_LIBRARY=/private/tmp/awb-callback-audit.dylib AWB_FOCUS_PROBE=/private/tmp/awb-focus-probe AWB_FOCUS_PID=%s node apps/awb-shell/test/signal-bench/meters/run.mjs --dropout-bench --output=/private/tmp/awb-dropout-isolated.json\n' "$focus_pid"
