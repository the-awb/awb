import assert from 'node:assert/strict';
import { makeEvent } from '@awb/score';
import { projectSynthLifecycleLanes } from '../src/engine/synthLifecycleLanes.js';

const lanes = projectSynthLifecycleLanes( [
  makeEvent( 0, { type: 'note', def: 'a', freq: 100, dur: 10 }, { id: 'n1', path: [ 'opening' ] } ),
  makeEvent( 0.5, { type: 'set', target: '@prev', amp: 0.2 }, { id: 's1' } ),
  makeEvent( 1, { type: 'note', def: 'b', freq: [ 200, 300, 400 ] }, { id: 'n2', path: [ 'answer' ] } ),
  makeEvent( 2, { type: 'release', target: '@all' }, { id: 'r1' } ),
  makeEvent( 3, { type: 'free', target: 'n1' }, { id: 'f1' } ),
  makeEvent( 4, { type: 'set', target: '@all', amp: 0.1 }, { id: 's2' } ),
  makeEvent( 5, { type: 'set', target: 'missing', amp: 0 }, { id: 's3' } ),
  makeEvent( 6, { type: 'visual', opacity: 0.5 }, { id: 'v1' } )
] );

assert.equal( lanes.length, 3, 'two create lanes plus one unresolved lane' );
assert.equal( lanes[ 0 ].id, 'n1' );
assert.equal( lanes[ 0 ].definition, 'a' );
assert.equal( lanes[ 0 ].expansionCount, 1 );
assert.deepEqual( lanes[ 0 ].events.map( ( event ) => event.role ), [ 'create', 'set', 'release', 'free', 'auto-release' ] );
assert.equal( lanes[ 0 ].events.at( -1 ).time, 8, 'implicit release uses dur times default legato' );
assert.equal( lanes[ 0 ].events.at( -1 ).synthetic, true );
assert.equal( lanes[ 0 ].startTime, 0 );
assert.equal( lanes[ 0 ].endTime, 2, 'the first explicit release closes the displayed synth bar' );
assert.equal( lanes[ 1 ].id, 'n2' );
assert.equal( lanes[ 1 ].expansionCount, 3, 'runtime expansion stays a badge on one authored lane' );
assert.deepEqual( lanes[ 1 ].events.map( ( event ) => event.entry.id ), [ 'n2', 'r1', 's2' ] );
assert.equal( lanes[ 2 ].id, '__unassigned__' );
assert.deepEqual( lanes[ 2 ].events.map( ( event ) => event.entry.id ), [ 's3', 'v1' ] );

console.log( 'synth-lifecycle-lanes: 14/14 pass' );
