import test from 'node:test';
import assert from 'node:assert/strict';
import { createFieldRenderProducer, validateFieldRenderJob } from '@awb/field-renderer';
import { runRenderPipeline } from '@awb/render-pipeline';

const field = {
  instruments: [ {
    id: 'one', type: 'substrate', playing: true, mute: false, solo: false, amp: 1,
    lActive: true, rActive: true, params: { freqA: 36, beat: 0.1, freqQ: 0.1, movement: 0.4 },
    channels: {}, color: '#e0603a', highlight: true
  } ],
  room: { speakers: [ { id: 'L' }, { id: 'R' } ], sep: 2, spkH: 1.1,
    bedH: 0.6, bedY: 2, pistonA: 0.07, roomDiam: 7, roomBack: 2, conv: 20 },
  surfaces: {
    horizontal: { visible: true, radius: 3.5, height: 0.56, mode: 'abs', colorMode: 'composite',
      highlight: true, opacity: 1, contour: 0, contourN: 12 },
    spherical: { visible: false, radius: 3.1, width: 2.2, height: 2, mode: 'abs', colorMode: 'composite',
      highlight: true, opacity: 1, contour: 0, contourN: 12 },
    body: { visible: false, setupId: 'lying', showSites: false, mode: 'abs', colorMode: 'composite',
      highlight: true, opacity: 1, contour: 0, contourN: 12 }
  },
  microphones: [],
  display: { gain: 1, timeScaleExp: -2.7, playing: true, phaseSync: false },
  timeFactor: 1
};

const job = {
  schemaVersion: 2,
  contentHash: 'sha256:webgl-field-without-audio',
  producer: { kind: 'field', version: '0.2.0', state: {
    mode: 'analytic-preview', pixelRatio: 1, field,
    camera: { position: [ 4.8, 6.6, 7.6 ], target: [ 0, 0.35, 1.5 ] }
  } },
  inputs: [],
  timeline: { cueInSeconds: 0, cueOutSeconds: 1 },
  output: { width: 80, height: 60, fps: 2, format: 'mp4' }
};

test( 'deterministic producer drives the shared controller with exact WebGL export settings', async () => {
  const canvas = {};
  const calls = [];
  let disposed = false;
  const engine = {
    setState: ( value ) => calls.push( [ 'state', value ] ),
    setCamera: ( value ) => calls.push( [ 'camera', value ] ),
    renderFrame: ( value ) => calls.push( [ 'frame', value ] ),
    dispose: () => { disposed = true; }
  };
  const frames = [];
  const receipt = await runRenderPipeline( {
    job,
    createProducer: ( context ) => createFieldRenderProducer( {
      ...context,
      canvas,
      engineFactory: ( options ) => { calls.push( [ 'create', options ] ); return engine; }
    } ),
    createSink: async () => ( {
      async addFrame( source, frame ) { assert.equal( source, canvas ); frames.push( frame ); },
      async finish( { frameCount } ) { return { frameCount, locator: 'memory://field.mp4' }; },
      async abort() {}
    } )
  } );
  assert.equal( receipt.frameCount, 2 );
  assert.deepEqual( calls[ 0 ][ 1 ], { canvas, controls: 'none', pixelRatio: 1,
    width: 80, height: 60, preserveDrawingBuffer: true } );
  assert.deepEqual( calls[ 1 ][ 1 ], field );
  assert.deepEqual( calls.filter( ( call ) => call[ 0 ] === 'frame' ).map( ( call ) => call[ 1 ].time ), [ 0, 0.5 ] );
  assert.equal( calls.filter( ( call ) => call[ 0 ] === 'frame' )
    .every( ( call ) => call[ 1 ].phaseMode === 'absolute' ), true );
  assert.equal( frames.every( ( frame ) => Object.keys( frame.inputs ).length === 0 ), true );
  assert.equal( disposed, true );
} );

test( 'field render jobs remain explicitly analytic-only', () => {
  assert.throws( () => validateFieldRenderJob( {
    ...job, producer: { ...job.producer, state: { ...job.producer.state, mode: 'realized-score' } }
  } ), /observation artifact/ );
  assert.throws( () => validateFieldRenderJob( {
    ...job, producer: { ...job.producer, state: { ...job.producer.state, pixelRatio: 2 } }
  } ), /pixelRatio = 1/ );
  assert.throws( () => validateFieldRenderJob( {
    ...job, producer: { ...job.producer, kind: 'not-field' }
  } ), /Expected a field producer job/ );
} );
