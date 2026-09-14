import assert from 'node:assert/strict';
import * as THREE from 'three';
import { createLissajousRenderObject, MAX_GEOMETRY_POINTS } from '@awb/lissajous-engine/core';

const passes = [];
const pass = ( label ) => passes.push( `  PASS  ${ label }` );

assert.equal( MAX_GEOMETRY_POINTS, 50_000 );
pass( 'the practical geometry cap is 50,000 points' );

const baseState = {
  groupId: 'group1',
  position: [ 1, 2, 3 ],
  rotation: [ 0.1, 0.2, 0.3 ],
  audioScale: 2,
  pointSize: 6,
  pointOpacity: 0.8,
  persistenceLength: 100,
  persistenceDecay: 0,
  warpFactor: 0,
  masterBrightness: 1,
  testMode: false,
  frameRate: 60,
  depthScale: 0,
  colorSaturation: 1,
  colorRangeMin: 0,
  colorRangeMax: 1,
  isExporting: false
};
const baseTick = {
  elapsedTime: 1,
  newSamples: {
    x: new Float32Array( [ 0.25, 0.5 ] ),
    y: new Float32Array( [ -0.25, -0.5 ] )
  },
  automationOverrides: {}
};

const trails = createLissajousRenderObject( { mode: 'trails', initialState: baseState } );
assert.equal( trails.tick( baseTick ), true );
assert.deepEqual( trails.drawable.position.toArray(), [ 1, 2, 3 ] );
assert.deepEqual( trails.drawable.rotation.toArray().slice( 0, 3 ), [ 0.1, 0.2, 0.3 ] );
assert.equal( trails.geometry.drawRange.count, 2 );
assert.equal( trails.geometry.attributes.position.usage, THREE.DynamicDrawUsage );
assert.equal( trails.geometry.attributes.color.usage, THREE.DynamicDrawUsage );
assert.deepEqual( trails.geometry.attributes.position.updateRanges, [ { start: 0, count: 6 } ] );
assert.deepEqual( trails.geometry.attributes.color.updateRanges, [ { start: 0, count: 6 } ] );
assert.deepEqual(
  Array.from( trails.geometry.attributes.position.array.slice( 0, 6 ), ( value ) => value || 0 ),
  [ 1, -1, 0, 0.5, -0.5, 0 ]
);
assert.ok( Math.abs( trails.material.size - 1.8 ) < 1e-12 );
pass( 'trails build and mutate a plain Three.js subtree' );

assert.equal( trails.tick( {
  ...baseTick,
  elapsedTime: 2,
  newSamples: { x: new Float32Array( [ 0.75 ] ), y: new Float32Array( [ -0.75 ] ) }
} ), true );
assert.deepEqual( trails.geometry.attributes.position.updateRanges, [ { start: 0, count: 9 } ] );
assert.deepEqual( trails.geometry.attributes.color.updateRanges, [ { start: 0, count: 9 } ] );
pass( 'dynamic attributes restrict each upload to the current draw range' );

// Changing warp is meant to enter at the live head of the trace. Existing samples retain the
// value captured with them; they must not jump when the control moves.
const initialTail = {
  ...baseState,
  warpFactor: 0.2,
  persistenceLength: 10
};
const initialTailTick = {
  ...baseTick,
  newSamples: {
    x: new Float32Array( [ 1, 1 ] ),
    y: new Float32Array( [ 0, 0 ] )
  }
};
const flowingControls = createLissajousRenderObject( { mode: 'trails', initialState: initialTail } );
const unchangedControls = createLissajousRenderObject( { mode: 'trails', initialState: initialTail } );
flowingControls.tick( initialTailTick );
unchangedControls.tick( initialTailTick );
flowingControls.setState( { ...initialTail, warpFactor: 0.8 } );
flowingControls.tick( {
  ...initialTailTick,
  elapsedTime: 2,
  newSamples: { x: new Float32Array( [ 1 ] ), y: new Float32Array( [ 0 ] ) }
} );
unchangedControls.tick( {
  ...initialTailTick,
  elapsedTime: 2,
  newSamples: { x: new Float32Array( [ 1 ] ), y: new Float32Array( [ 0 ] ) }
} );
const flowingPositions = flowingControls.geometry.attributes.position.array;
const unchangedPositions = unchangedControls.geometry.attributes.position.array;
assert.notDeepEqual(
  Array.from( flowingPositions.slice( 0, 3 ) ),
  Array.from( unchangedPositions.slice( 0, 3 ) )
);
assert.deepEqual(
  Array.from( flowingPositions.slice( 3, 9 ) ),
  Array.from( unchangedPositions.slice( 3, 9 ) )
);
pass( 'warp changes flow in with new samples without shifting the existing tail' );

const texture = new THREE.Texture();
const points = createLissajousRenderObject( { mode: 'points', pointTexture: texture, initialState: baseState } );
assert.equal( points.tick( {
  ...baseTick,
  automationOverrides: {
    group1: { pointSize: 9, position: [ -1, -2, -3 ] }
  }
} ), true );
assert.equal( points.material.map, texture );
assert.equal( points.material.map.colorSpace, THREE.SRGBColorSpace );
assert.equal( points.material.size, 9 );
assert.deepEqual( points.drawable.position.toArray(), [ -1, -2, -3 ] );
pass( 'points accept automation and an adapter-supplied texture' );

const exported = createLissajousRenderObject( {
  mode: 'trails',
  initialState: { ...baseState, isExporting: true }
} );
assert.equal( exported.tick( { ...baseTick, exportFrameIndex: 0, exportFrameRate: 60 } ), true );
assert.equal( exported.geometry.drawRange.count, 2 );
assert.equal( exported.tick( {
  ...baseTick,
  newSamples: { x: new Float32Array( [ 1 ] ), y: new Float32Array( [ 1 ] ) },
  exportFrameIndex: 0,
  exportFrameRate: 60
} ), false );
assert.equal( exported.geometry.drawRange.count, 2 );
pass( 'an export frame consumes its samples once even if R3F ticks again' );

const capped = createLissajousRenderObject( {
  mode: 'trails',
  initialState: { ...baseState, persistenceLength: 88_201, isExporting: true }
} );
const oversized = {
  x: new Float32Array( MAX_GEOMETRY_POINTS + 10 ).fill( 0.5 ),
  y: new Float32Array( MAX_GEOMETRY_POINTS + 10 ).fill( -0.5 )
};
assert.equal( capped.tick( {
  ...baseTick,
  newSamples: oversized,
  exportFrameIndex: 0,
  exportFrameRate: 60
} ), true );
assert.equal( capped.geometry.drawRange.count, MAX_GEOMETRY_POINTS );
pass( 'legacy persistence values are clamped to the 50,000-point geometry cap' );

let stateReads = 0;
let countedState = baseState;
const countedStateRef = {
  get current() { stateReads += 1; return countedState; },
  set current( value ) { countedState = value; }
};
const bound = createLissajousRenderObject( { mode: 'trails', stateRef: countedStateRef } );
bound.tick( baseTick );
assert.equal( stateReads, 1 );
const boundObject = bound.object3d;
bound.setState( { ...baseState, pointSize: 10 } );
bound.tick( { ...baseTick, elapsedTime: 2 } );
assert.equal( stateReads, 2 );
assert.equal( bound.object3d, boundObject );
assert.equal( bound.material.size, 3 );
pass( 'state is read once per frame and bulk replacement does not rebuild the scene' );

let geometryDisposed = false;
let materialDisposed = false;
trails.geometry.addEventListener( 'dispose', () => { geometryDisposed = true; } );
trails.material.addEventListener( 'dispose', () => { materialDisposed = true; } );
trails.dispose();
assert.equal( geometryDisposed, true );
assert.equal( materialDisposed, true );
points.dispose();
exported.dispose();
capped.dispose();
flowingControls.dispose();
unchangedControls.dispose();
bound.dispose();
texture.dispose();
pass( 'explicit disposal releases geometry and material resources' );

assert.throws( () => createLissajousRenderObject( { mode: 'unknown' } ), /Unknown/ );
pass( 'unknown render modes fail loudly' );

console.log( `\n${ passes.join( '\n' ) }\n\nAll checks passed.` );
