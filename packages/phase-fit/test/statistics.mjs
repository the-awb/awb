import assert from 'node:assert/strict';
import test from 'node:test';
import { fitSignalStatistics, fitSignals } from '../src/index.js';

const TWO_PI = Math.PI * 2;

function fixture( { sampleRate = 48000, seconds = 0.5, parts, unknown = [] } ) {
  const frameCount = Math.round( sampleRate * seconds );
  const left = new Float64Array( frameCount ); const right = new Float64Array( frameCount );
  for ( let n = 0; n < frameCount; n += 1 ) {
    for ( const part of [ ...parts, ...unknown ] ) {
      const value = part.amp * Math.cos( TWO_PI * part.freq * n / sampleRate + part.phase );
      left[ n ] += value * part.gains[ 0 ]; right[ n ] += value * part.gains[ 1 ];
    }
  }
  let combined = 0; for ( let n = 0; n < frameCount; n += 1 ) combined += left[ n ] ** 2 + right[ n ] ** 2;
  const components = parts.map( ( part, componentIndex ) => {
    let correlationCos = 0; let correlationSin = 0;
    for ( let n = 0; n < frameCount; n += 1 ) {
      const weighted = part.gains[ 0 ] * left[ n ] + part.gains[ 1 ] * right[ n ];
      correlationCos += Math.cos( TWO_PI * part.freq * n / sampleRate ) * weighted;
      correlationSin += Math.sin( TWO_PI * part.freq * n / sampleRate ) * weighted;
    }
    return { componentID: `component-${ componentIndex }`, frequency: part.freq,
      gainL: part.gains[ 0 ], gainR: part.gains[ 1 ], correlationCos, correlationSin };
  } );
  return { left, right, statistics: { sampleRate, frameCount, components, energy: { combined } } };
}

test( 'statistics and raw samples agree for joint stereo phase and residual', () => {
  const parts = [
    { freq: 36, amp: 0.08, phase: 1.4, gains: [ 1, 0 ] },
    { freq: 36.1, amp: 0.05, phase: 5.9, gains: [ 0, 1 ] }
  ];
  const data = fixture( { parts, unknown: [ { freq: 173, amp: 0.02, phase: 0.7, gains: [ 0.5, 0.5 ] } ] } );
  const requested = parts.map( ( part ) => ( { freq: part.freq, gains: part.gains } ) );
  const raw = fitSignals( [ data.left, data.right ], 48000, requested );
  const compact = fitSignalStatistics( data.statistics, requested );
  assert.equal( compact.ok, raw.ok );
  assert.ok( Math.abs( compact.residual - raw.residual ) < 1e-9 );
  compact.components.forEach( ( component, index ) => {
    assert.ok( Math.abs( component.phase - raw.components[ index ].phase ) < 1e-9 );
    assert.ok( Math.abs( component.amp - raw.components[ index ].amp ) < 1e-9 );
  } );
} );

test( 'statistics preserve refusal for similarly panned close components', () => {
  const parts = [
    { freq: 36, amp: 0.08, phase: 1, gains: [ 0.5, 0.5 ] },
    { freq: 36.1, amp: 0.05, phase: 2, gains: [ 0.5, 0.5 ] }
  ];
  const data = fixture( { parts } );
  const fit = fitSignalStatistics( data.statistics, parts.map( ( part ) => ( { freq: part.freq, gains: part.gains } ) ) );
  assert.deepEqual( fit.components.map( ( component ) => component.resolved ), [ false, false ] );
  assert.equal( fit.ok, false );
} );

test( 'statistics reject non-finite and mismatched component evidence', () => {
  const data = fixture( { parts: [ { freq: 36, amp: 0.08, phase: 1, gains: [ 1, 0 ] } ] } );
  assert.throws( () => fitSignalStatistics( { ...data.statistics, energy: { combined: Number.NaN } } ), /finite/ );
  assert.throws( () => fitSignalStatistics( data.statistics, [ { freq: 40, gains: [ 1, 0 ] } ] ), /do not match/ );
} );
