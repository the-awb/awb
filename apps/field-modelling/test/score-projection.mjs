import test from 'node:test';
import assert from 'node:assert/strict';
import { projectScoreRealizations } from '../src/engine/scoreProjection.js';

const document = { entries: [
  { id: 'supported', event: { type: 'note', def: 'substrate', freqA: [ 36, 40 ], beat: 0.1, amp: 0.5 } },
  { id: 'unknown', event: { type: 'note', def: 'mystery', freq: 55 } }
] };

test( 'projects supported score realizations and labels unknown definitions honestly', () => {
  const projected = projectScoreRealizations( document, { realizations: [
    { entryID: 'supported', realizationID: 'r1', state: 'started', nodeIDs: [ 1001, 1002 ] },
    { entryID: 'unknown', realizationID: 'r2', state: 'released', nodeIDs: [ 1003 ] },
    { entryID: 'supported', realizationID: 'r3', state: 'ended', nodeIDs: [ 1004 ] }
  ] }, [ { id: 'L', label: 'L' }, { id: 'R', label: 'R' } ] );
  assert.deepEqual( projected.instruments.map( ( item ) => item.params.freqA ), [ 36, 40 ] );
  assert.ok( projected.instruments.every( ( item ) => item.routeClassification === 'master-only' ) );
  assert.deepEqual( projected.unsupported.map( ( item ) => item.synthDefName ), [ 'mystery' ] );
} );
