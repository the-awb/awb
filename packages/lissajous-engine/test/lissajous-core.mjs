import assert from 'node:assert/strict';
import { tickLissajousCore } from '@awb/lissajous-engine/core';
import {
  SESSION_ID,
  createAutomationLog,
  recordEvent,
  snapshotInitialValues,
  snapshotSessionInitialValues
} from '@awb/lissajous-engine/core';

const passes = [];
const pass = ( label ) => passes.push( `  PASS  ${ label }` );

const log = createAutomationLog();
snapshotInitialValues( log, [ {
  id: 'group1',
  audioScale: 2,
  warpFactor: 0,
  position: [ 0, 0, 0 ]
} ], [ 'audioScale', 'warpFactor', 'position' ] );
snapshotSessionInitialValues( log, {
  cameraPosition: [ 0, 0, 5 ],
  cameraTarget: [ 0, 0, 0 ],
  visualizationMode: 'points'
} );
recordEvent( log, 0.25, 'group1', 'warpFactor', 0.4 );
recordEvent( log, 0.5, 'group1', 'warpFactor', 0.8 );
recordEvent( log, 0.5, SESSION_ID, 'cameraPosition', [ 1, 2, 3 ] );

let reads = 0;
const samples = {
  x: new Float32Array( [ 0.1, 0.2 ] ),
  y: new Float32Array( [ 0.3, 0.4 ] )
};

const tick = tickLissajousCore( {
  getNewSamples: () => {
    reads += 1;
    return samples;
  },
  automationLog: log,
  groupIds: [ 'group1' ],
  playheadPosition: 0.5
} );

assert.equal( reads, 1 );
assert.equal( tick.newSamples, samples );
pass( 'the source is drained exactly once per tick' );

assert.deepEqual( tick.automationOverrides.group1, { warpFactor: 0.8 } );
assert.equal( 'audioScale' in tick.automationOverrides.group1, false );
assert.equal( 'position' in tick.automationOverrides.group1, false );
pass( 'only recorded pattern channels override live values' );

assert.deepEqual( tick.sessionControls, { cameraPosition: [ 1, 2, 3 ] } );
assert.deepEqual( tick.automationOverrides[ SESSION_ID ], {
  cameraPosition: [ 1, 2, 3 ],
  cameraTarget: [ 0, 0, 0 ],
  visualizationMode: 'points'
} );
pass( 'session automation preserves the existing apply/override contract' );

let exportReads = 0;
const exportTick = tickLissajousCore( {
  getNewSamples: () => {
    exportReads += 1;
    return samples;
  },
  automationLog: log,
  groupIds: [ 'group1' ],
  isExporting: true,
  playheadPosition: 0.5
} );

assert.equal( exportReads, 1 );
assert.equal( exportTick.newSamples, samples );
assert.equal( exportTick.automationOverrides, null );
assert.equal( exportTick.sessionControls, null );
pass( 'export drains samples but leaves indexed automation untouched' );

const idleTick = tickLissajousCore( {} );
assert.equal( idleTick.newSamples, null );
assert.equal( idleTick.automationOverrides, null );
pass( 'an unconfigured core tick is a safe no-op' );

console.log( `\n${ passes.join( '\n' ) }\n\nAll checks passed.` );
