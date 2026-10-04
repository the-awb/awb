# Excluded V2 setup attempts

These three attempts preceded the fully completed V2 smoke and matrices. They are not load-ceiling evidence.

- smoke: Scope did not report ready because the disposable server did not expose the new renderer asset. The fixture now serves a .js asset with the correct JavaScript MIME type; production asset serving is unchanged.
- smoke2: the 64-canvas visibility assertion failed. The fixture uses a wider widget grid to fit the profile.
- smoke3: the 128-canvas visibility assertion failed. Global canvas margins and widget spacing were removed/compacted in the disposable layout.

Logs, available partial phase JSON and original compressed native/return captures are retained for audit. The subsequent smoke4 completed every profile with all elements visible and advancing, and is archived as ../v2-smoke. Input fault detection already passed in smoke2; only completed smoke4 and subsequent runs are used in the measured report. Failed attempts' owned processes were cleaned up before retrying.
