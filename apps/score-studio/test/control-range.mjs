import assert from 'node:assert/strict';
import {
  inferWarp, isWideRange, map, quantise, sliderRange, unmap, workingWindow
} from '../src/engine/controlRange.js';

let passed = 0;
const check = ( label, run ) => { run(); passed += 1; };
const close = ( actual, expected, tolerance = 1e-6 ) =>
  assert.ok( Math.abs( actual - expected ) <= tolerance, `${ actual } != ${ expected }` );

check( 'a declared warp is authoritative', () => {
  assert.equal( inferWarp( { warp: 'lin', min: 20, max: 25000, name: 'freq' } ), 'lin' );
  assert.equal( inferWarp( { warp: 'exp', min: 0, max: 1, name: 'amp' } ), 'exp' );
} );

check( 'an undeclared warp is inferred from name and span', () => {
  assert.equal( inferWarp( { min: 20, max: 25000, name: 'freqA', unit: ' Hz' } ), 'exp' );
  assert.equal( inferWarp( { min: 0, max: 2, name: 'movement' } ), 'lin' );
  assert.equal( inferWarp( { min: 0.5, max: 1.5, name: 'freq' } ), 'lin', 'a narrow span stays linear' );
  assert.equal( inferWarp( { min: -20, max: 20, name: 'beat' } ), 'lin', 'a signed range cannot be exponential' );
} );

check( 'legality bounds are recognised as too wide to sweep', () => {
  assert.equal( isWideRange( { min: 20, max: 25000, anchor: 144 } ), true, 'freq in Hz' );
  assert.equal( isWideRange( { min: 0, max: 3600, anchor: 12 } ), true, 'envelope time in seconds' );
  assert.equal( isWideRange( { min: -20, max: 20, anchor: 0.2 } ), false, 'beat' );
  assert.equal( isWideRange( { min: 0, max: 2, anchor: 0 } ), false, 'movement' );
  assert.equal( isWideRange( { min: 0.01, max: 1, anchor: 0.066 } ), false, 'freq Q' );
  assert.equal( isWideRange( { min: 0, max: 1, anchor: 0.8 } ), false, 'amp' );
} );

check( 'a wide positive range becomes two octaves either side of the value', () => {
  const window = workingWindow( { min: 20, max: 25000, warp: 'exp', anchor: 144 } );
  close( window.min, 36 );
  close( window.max, 576 );
} );

check( 'the window never escapes the declared bounds', () => {
  const low = workingWindow( { min: 20, max: 25000, warp: 'exp', anchor: 30 } );
  assert.ok( low.min >= 20, `${ low.min } is below the declared minimum` );
  const high = workingWindow( { min: 20, max: 25000, warp: 'exp', anchor: 20000 } );
  assert.ok( high.max <= 25000, `${ high.max } is above the declared maximum` );
} );

check( 'a wide linear range reaches around the value instead', () => {
  const window = workingWindow( { min: 0, max: 3600, warp: 'lin', anchor: 12 } );
  close( window.min, 0 );
  close( window.max, 36 );
} );

check( 'a usable declared range is left alone', () => {
  assert.deepEqual( workingWindow( { min: -20, max: 20, warp: 'lin', anchor: 0.2 } ), { min: -20, max: 20 } );
  assert.deepEqual( workingWindow( { min: 0, max: 1, warp: 'lin', anchor: 0.8 } ), { min: 0, max: 1 } );
} );

check( 'the freq control a score actually uses is playable', () => {
  const range = sliderRange( { min: 20, max: 25000, step: 0.1, anchor: 144, unit: ' Hz', name: 'freqA' } );
  assert.equal( range.windowed, true );
  assert.equal( range.warp, 'exp' );
  // A tenth of the fader's travel should be a musical step, not a jump into another register.
  const here = map( range, 144 );
  const nudged = unmap( range, here + 0.1 );
  assert.ok( nudged > 144 && nudged < 210, `a tenth of the travel moved 144 to ${ nudged }` );
} );

check( 'the same control on the declared bound is not playable, which is why it is windowed', () => {
  const declared = { min: 20, max: 25000, warp: 'exp' };
  const nudged = unmap( declared, map( declared, 144 ) + 0.1 );
  assert.ok( nudged > 280, `expected a large jump on the raw legality bound, got ${ nudged }` );
} );

check( 'map and unmap are inverses on every warp', () => {
  for ( const range of [
    { min: 20, max: 500, warp: 'exp' }, { min: -20, max: 20, warp: 'lin' },
    { min: 0, max: 1, warp: 'amp' }, { min: 0, max: 10, warp: 4 }
  ] ) {
    for ( const position of [ 0, 0.15, 0.5, 0.85, 1 ] ) {
      close( map( range, unmap( range, position ) ), position, 1e-6 );
    }
  }
} );

check( 'positions outside the window clamp rather than run away', () => {
  const range = { min: 20, max: 500, warp: 'exp' };
  assert.equal( map( range, 5 ), 0 );
  assert.equal( map( range, 5000 ), 1 );
  close( unmap( range, -3 ), 20 );
  close( unmap( range, 3 ), 500 );
} );

check( 'an absent range gives a provisional window around the value, not NaN', () => {
  const range = sliderRange( { anchor: 0.7, name: 'mystery' } );
  assert.equal( range.provisional, true );
  assert.equal( range.declared, null );
  assert.ok( Number.isFinite( range.min ) && Number.isFinite( range.max ) );
  assert.ok( range.max > range.min );
  const undefinedAnchor = sliderRange( { name: 'mystery' } );
  assert.ok( Number.isFinite( undefinedAnchor.min ) && Number.isFinite( undefinedAnchor.max ) );
} );

check( 'a zero anchor does not collapse the window', () => {
  const range = sliderRange( { anchor: 0, name: 'movement' } );
  assert.ok( range.max > range.min );
  assert.ok( Number.isFinite( map( range, 0 ) ) );
} );

check( 'values are quantised to the declared step and decimals', () => {
  assert.equal( quantise( { step: 0.05 }, 0.123456, 2 ), 0.1 );
  assert.equal( quantise( { step: 0 }, 144.4444, 1 ), 144.4 );
  assert.equal( quantise( { step: 0 }, 144.4444 ), 144.4444 );
} );

console.log( `control-range: ${ passed }/${ passed } pass` );
