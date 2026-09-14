import assert from 'node:assert/strict';
import { createLissajousCore } from '@awb/lissajous-engine/core';

const passes = [];
const pass = ( label ) => passes.push( `  PASS  ${ label }` );

const state = ( id, extras = {} ) => ( {
  id,
  enabled: true,
  position: [ 0, 0, 0 ],
  rotation: [ 0, 0, 0 ],
  audioScale: 2,
  pointSize: 4,
  pointOpacity: 0.8,
  persistenceLength: 100,
  persistenceDecay: 0.5,
  warpFactor: 0,
  masterBrightness: 1,
  testMode: false,
  frameRate: 60,
  depthScale: 0,
  colorSaturation: 1,
  colorRangeMin: 0,
  colorRangeMax: 1,
  ...extras
} );

let drains = 0;
const samples = {
  x: new Float32Array( [ 0.25, 0.5 ] ),
  y: new Float32Array( [ -0.25, -0.5 ] )
};
const core = createLissajousCore( {
  mode: 'trails',
  getNewSamples: () => { drains++; return samples; }
} );
core.addGroup( 'one', state( 'one' ) );
core.addGroup( 'two', { ...state( 'two' ), mode: 'trails' } );
core.tick( { time: 1, delta: 1 / 60 } );
assert.equal( drains, 1 );
assert.equal( core.getGroup( 'one' ).renderObject.geometry.drawRange.count, 2 );
assert.equal( core.getGroup( 'two' ).renderObject.geometry.drawRange.count, 2 );
pass( 'one source drain feeds every group in a frame' );

const stableObject = core.getGroup( 'one' ).object3d;
core.setState( {
  visualizationMode: 'trails',
  groups: [
    state( 'two', { pointSize: 7 } ),
    state( 'one', { enabled: false, pointSize: 9 } ),
    state( 'three' )
  ]
} );
assert.equal( core.groupCount, 3 );
assert.equal( core.getGroup( 'one' ).object3d, stableObject );
assert.equal( core.getGroup( 'one' ).object3d.visible, false );
assert.equal( core.getGroup( 'one' ).renderObject, null );
assert.equal( core.getGroup( 'one' ).state.pointSize, 9 );
assert.deepEqual( core.object3d.children.map( ( child ) => child === core.getGroup( 'two' ).object3d
  ? 'two'
  : child === core.getGroup( 'one' ).object3d ? 'one' : 'three' ), [ 'two', 'one', 'three' ] );
pass( 'bulk restore preserves objects, visibility and transparent draw order' );

core.updateGroup( 'one', { enabled: true } );
assert.ok( core.getGroup( 'one' ).renderObject );
assert.equal( core.getGroup( 'one' ).renderObject.geometry.drawRange.count, 0 );
pass( 'disabled groups release their renderer and re-enable with a fresh tail' );

assert.throws( () => core.setMode( 'three', 'unknown' ), /Unknown/ );
assert.equal( core.removeGroup( 'missing' ), false );
assert.equal( core.removeGroup( 'three' ), true );
pass( 'invalid modes fail loudly and group removal is explicit' );

const explicit = { x: new Float32Array( [ 1 ] ), y: new Float32Array( [ 1 ] ) };
core.tick( { time: 2, delta: 1 / 60, newSamples: explicit } );
assert.equal( drains, 1 );
pass( 'an explicit deterministic frame bypasses the live sample source' );

core.dispose();
assert.equal( core.groupCount, 0 );
assert.throws( () => core.tick(), /disposed/ );
pass( 'disposal clears lifecycle state and rejects further ticks' );

console.log( `\n${ passes.join( '\n' ) }\n\nAll checks passed.` );
