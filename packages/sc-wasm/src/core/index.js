// @awb/sc-wasm/core — SuperCollider in the page, with no React in it.
//
// The public surface is listed explicitly rather than re-exported wholesale: what this package
// offers is a decision, not a consequence of which files happen to live here.
//
// Deliberately NOT in here: the React hook (./react), the console's selection rules, the field
// physics, and the score. See README.md.

export { createScLangBridge } from './scLangBridge.js';
export { createScEngine } from './createScEngine.js';
export { parseQueryTree } from './queryTree.js';
export { loadSynthDefManifest, settableControls, RESERVED_CONTROLS } from './synthDefManifest.js';
