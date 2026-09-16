import assert from 'node:assert/strict';
import { createFieldRenderProducer } from '@awb/field-renderer';
import { runRenderPipeline } from '@awb/render-pipeline';

const draws = [];
const context = {
  fillStyle: '',
  fillRect( ...rect ) { draws.push( { fillStyle: this.fillStyle, rect } ); }
};
const canvas = {
  width: 0,
  height: 0,
  getContext: ( kind ) => kind === '2d' ? context : null
};
const job = {
  schemaVersion: 2,
  contentHash: 'sha256:field-without-audio',
  producer: {
    kind: 'field',
    version: '0.1.0',
    state: {
      mode: 'analytic-preview',
      room: { sep: 2, spkH: 1.1, conv: 20, pistonA: 0.07 },
      channels: [
        { instId: 'one', slot: 'a', freq: 1, gl: 1, gr: 0.4 },
        { instId: 'one', slot: 'b', freq: 1.5, gl: 0.3, gr: 1 }
      ],
      grid: { columns: 4, rows: 3 },
      bounds: { xMin: -2, xMax: 2, zMin: 0.5, zMax: 4 }
    }
  },
  inputs: [],
  timeline: { cueInSeconds: 0, cueOutSeconds: 1 },
  output: { width: 80, height: 60, fps: 2, format: 'mp4' }
};

const frames = [];
const receipt = await runRenderPipeline( {
  job,
  createProducer: ( context ) => createFieldRenderProducer( { ...context, canvas } ),
  createSink: async () => ( {
    async addFrame( source, frame ) {
      assert.equal( source, canvas );
      frames.push( frame );
    },
    async finish( { frameCount } ) { return { frameCount, locator: 'memory://field.mp4' }; },
    async abort() {}
  } )
} );

assert.equal( receipt.frameCount, 2 );
assert.equal( frames.every( ( frame ) => Object.keys( frame.inputs ).length === 0 ), true );
assert.equal( canvas.width, 80 );
assert.equal( canvas.height, 60 );
assert.equal( draws.length, 2 * ( 1 + 4 * 3 ) );
assert.equal( new Set( draws.map( ( draw ) => draw.fillStyle ) ).size > 2, true );

assert.throws(
  () => createFieldRenderProducer( {
    canvas,
    job: { ...job, producer: { ...job.producer, state: { ...job.producer.state, mode: 'realized-score' } } }
  } ),
  /requires field-phase-track support/
);
assert.throws(
  () => createFieldRenderProducer( {
    canvas,
    job: { ...job, producer: { ...job.producer, state: { ...job.producer.state, mode: undefined } } }
  } ),
  /state.mode must be analytic-preview/
);

await assert.rejects(
  runRenderPipeline( {
    job: { ...job, producer: { ...job.producer, kind: 'not-field' } },
    createProducer: ( context ) => createFieldRenderProducer( { ...context, canvas } ),
    createSink: async () => ( {} )
  } ),
  /Expected a field producer job/
);

console.log( '\n  PASS  analytic-preview renders without audio and realized-score cannot be mislabelled\n\nAll checks passed.' );
