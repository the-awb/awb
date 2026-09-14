import assert from 'node:assert/strict';
import {
  BODY_SITES,
  DEFAULT_SURFACE,
  MAX_CH,
  MAX_INST,
  PHYS,
  SHELL_FRAG,
  SLICE_FRAG,
  SURFACE_SETUPS,
  VERT,
  advancePhase,
  balanceAmp,
  bodySiteMicrophones,
  bodySiteWorldPosition,
  createDefaultRoomMicrophones,
  createDefaultSurfaces,
  defaultFieldChannels,
  flattenChannels,
  focalDistance,
  hexToRgb,
  instrumentHex,
  instrumentHue,
  instrumentRgb,
  migrateSurfaces,
  projectInstrumentToFieldComponents,
  resolveInstrumentColor,
  roomGeom,
  sampleColorReadings,
  sampleFieldComponents,
  sampleInstrumentColors,
  slowestBeat,
  toeInRad
} from '../src/index.js';

const speakers = [ { id: 'L', label: 'Left' }, { id: 'R', label: 'Right' } ];
const checks = [];
const check = ( label ) => checks.push( `  PASS  ${ label }` );

assert.deepEqual( defaultFieldChannels( 'substrate2' ), {
  base: { active: true }, pulse: { active: true }, beat: { active: true }
} );
const projected = projectInstrumentToFieldComponents( {
  type: 'substrate', params: { freqA: 36, beat: 0.1, freqQ: 0.066, movement: 0 }, channels: {}
}, speakers, 0.5, 0 );
assert.deepEqual( projected.map( ( component ) => component.freq ), [ 18, 18.05 ] );
assert.deepEqual( projectInstrumentToFieldComponents( {
  type: 'resobass2', params: {}, channels: {}
}, speakers, 1, 0 ), [] );
assert.deepEqual( projectInstrumentToFieldComponents( {
  type: 'basic', params: { freqL: 60, ampL: 1, freqR: 60.1, ampR: 1 }, channels: {}
}, speakers, 1, 0 ), [
  { slot: 'L', freq: 60, gl: 1, gr: 0 },
  { slot: 'R', freq: 60.1, gl: 0, gr: 1 }
] );
const substrate2 = projectInstrumentToFieldComponents( {
  type: 'substrate2',
  params: {
    freq: 60, slowBeat: 2, beat: 4, slowBeatBlend: 1, beatBlend: 1,
    flip: false, freqQ: 0.066, movement: 0
  },
  channels: defaultFieldChannels( 'substrate2' )
}, speakers, 1, 0 );
assert.deepEqual( substrate2.map( ( component ) => component.slot ), [ 'base', 'pulse', 'beat' ] );
assert.deepEqual( substrate2.map( ( component ) => component.freq ), [ 60, 62, 66 ] );
assert.ok( Math.abs( substrate2[ 1 ].gl - Math.SQRT1_2 ) < 1e-15 );
assert.ok( Math.abs( substrate2[ 2 ].gr - Math.SQRT1_2 ) < 1e-15 );
for ( const gain of balanceAmp( 1, 0, 1 ) ) {
  assert.ok( Math.abs( gain - Math.SQRT1_2 ) < 1e-15 );
}
check( 'instrument projection emits stable ideal field components' );

const flattened = flattenChannels( [ {
  id: 'one', type: 'substrate', params: { freqA: 40, beat: 1, freqQ: 0.1, movement: 0 },
  channels: {}, amp: 0.5, lActive: true, rActive: false, mute: false, solo: false
} ], speakers, 1, 0 );
assert.equal( flattened.length, 2 );
assert.equal( flattened[ 0 ].instId, 'one' );
assert.equal( flattened[ 0 ].gl, Math.SQRT1_2 * 0.5 );
assert.equal( flattened[ 1 ].gr, 0 );
const phases = [ 0 ];
advancePhase( phases, [ 1 ], 1, 0.25 );
assert.ok( Math.abs( phases[ 0 ] - Math.PI / 2 ) < 1e-12 );
assert.equal( slowestBeat( [ 36, 40, 40.1 ] ), 0.10000000000000142 );
check( 'flattening, phase accumulation and beat summary retain their contracts' );

const room = { sep: 2, spkH: 1.1, conv: 0, pistonA: 0.07 };
const point = [ -1, 1.1, 2 ];
const field = sampleFieldComponents( [
  { instId: 'one', slot: 'left', freq: 36, gl: 1, gr: 0 }
], room, point );
assert.ok( Math.abs( field[ 0 ].amplitude - 0.5 ) < 1e-12 );
assert.equal( sampleInstrumentColors( field, room, point ) instanceof Map, true );
assert.match( sampleColorReadings( field, room, point ).composite.color, /^rgb\(/ );
check( 'CPU field probe exposes component, instrument and composite readings' );

assert.equal( MAX_CH, 32 );
assert.equal( MAX_INST, 12 );
for ( const shader of [ PHYS, VERT, SLICE_FRAG, SHELL_FRAG ] ) assert.ok( shader.length > 100 );
check( 'shader limits and all shader programs are exported' );

assert.equal( SURFACE_SETUPS.some( ( setup ) => setup.id === 'lying' ), true );
assert.equal( BODY_SITES.lying, BODY_SITES.standing );
assert.equal( DEFAULT_SURFACE.setupId, 'lying' );
const surfaces = createDefaultSurfaces( { bedH: 0.7, bedY: 2, roomDiam: 8 } );
assert.ok( Math.abs( surfaces.horizontal.height - 0.66 ) < 1e-12 );
assert.equal( migrateSurfaces( { room: {}, surfaces } ).body.setupId, 'lying' );
check( 'surface catalog, defaults and migration are available' );

const microphones = createDefaultRoomMicrophones( { bedH: 0.6, bedY: 2 } );
assert.equal( microphones.length, 3 );
assert.deepEqual( bodySiteWorldPosition( [ 1, 2, 3 ], 'standing', { bedY: 4 } ), [ 1, 2, 7 ] );
assert.equal( bodySiteMicrophones( { setupId: 'lying' }, { bedH: 0.6, bedY: 2 } ).length, BODY_SITES.lying.length );
check( 'room and body-site probe construction is exported' );

assert.equal( toeInRad( 90 ), Math.PI / 4 );
assert.ok( Math.abs( focalDistance( 90, 2 ) - 1 ) < 1e-12 );
assert.deepEqual( roomGeom( 7, 2 ), { r: 3.5, back: 2, centerZ: 1.5 } );
check( 'room geometry helpers preserve their equations' );

assert.equal( instrumentHue( 1 ), 137.50776 );
assert.equal( instrumentRgb( 0 ).length, 3 );
assert.match( instrumentHex( 0 ), /^#[0-9a-f]{6}$/ );
assert.deepEqual( hexToRgb( '#ffffff' ), [ 1, 1, 1 ] );
assert.equal( resolveInstrumentColor( { color: '#123456' }, 4 ), '#123456' );
check( 'instrument colour helpers share one deterministic palette' );

console.log( `\n${ checks.join( '\n' ) }\n\n${ checks.length }/${ checks.length } passed.` );
