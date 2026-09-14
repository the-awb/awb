// Self-contained browser surface. This deliberately excludes the R3F adapter: direct browser
// consumers get the framework-neutral core and the canvas-owning vanilla host without needing an
// import map, React, R3F, or their own Three.js installation.
export * from './core/index.js';
export * from './vanilla/index.js';
