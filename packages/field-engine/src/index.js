// Analytic acoustic-field projection and propagation. Instrument meaning comes from
// @awb/instruments; React, Three.js, SuperCollider execution and session state stay with hosts.
export { MAX_CH, MAX_INST, PHYS, VERT, SLICE_FRAG, SHELL_FRAG } from './shaders.js';
export { sampleFieldComponents, sampleInstrumentColors, sampleColorReadings } from './fieldProbe.js';
export { SURFACE_SETUPS, BODY_SITES, DEFAULT_SURFACE, createDefaultSurfaces, migrateSurfaces } from './surfaceSetups.js';
export { flattenChannels, advancePhase, slowestBeat } from './flatten.js';
export { instrumentHue, instrumentRgb, instrumentHex, hexToRgb, resolveInstrumentColor } from './color.js';
export { createDefaultRoomMicrophones, bodySiteWorldPosition, bodySiteMicrophones } from './probes.js';
export { toeInRad, focalDistance, roomGeom } from './room.js';
export { balanceAmp, defaultFieldChannels, projectInstrumentToFieldComponents } from './instrumentProjection.js';
