import test from 'node:test';
import assert from 'node:assert/strict';
import { applyRelativePhaseSnapshot } from '../src/phaseSnapshot.js';

test( 'relative snapshot preserves the live reference and advances frequency differences', () => {
  const phases = new Map( [ [ 'reference', 2 ], [ 'other', 0 ] ] );
  const applied = applyRelativePhaseSnapshot( phases, {
    referenceKey: 'reference', referenceFrequency: 60, observationBrowserTime: 10,
    corrections: [
      { key: 'reference', frequency: 60, relativePhase: 0 },
      { key: 'other', frequency: 60.25, relativePhase: 0.5 }
    ]
  }, 11 );
  assert.equal( applied, true );
  assert.equal( phases.get( 'reference' ), 2, 'reference phase must not reset to zero' );
  assert.ok( Math.abs( phases.get( 'other' ) - ( 2.5 + Math.PI / 2 ) ) < 1e-12 );
} );

test( 'snapshot waits until its reference component exists', () => {
  assert.equal( applyRelativePhaseSnapshot( new Map(), {
    referenceKey: 'missing', referenceFrequency: 60, observationBrowserTime: 0, corrections: []
  }, 1 ), false );
} );
