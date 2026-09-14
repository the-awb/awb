import assert from 'node:assert/strict';
import {
  RenderCancelledError,
  createResolvedRenderJob,
  getRenderFrameCount,
  runRenderPipeline,
  sampleAudioWindow
} from '@awb/render-pipeline';

const passes = [];
const pass = ( label ) => passes.push( `  PASS  ${ label }` );

const fixtureJob = {
  schemaVersion: 1,
  contentHash: 'sha256:resolved-job-fixture',
  producer: {
    kind: 'test-pattern',
    version: '1.0.0',
    state: { colour: 'white' }
  },
  audio: {
    artifactHash: 'sha256:audio-fixture',
    locator: 'fixture://probe.wav',
    sampleRate: 12,
    channels: 2,
    durationSeconds: 1
  },
  timeline: { cueInSeconds: 0.25, cueOutSeconds: 0.75 },
  output: { width: 640, height: 360, fps: 6, format: 'mp4' },
  provenance: { scoreRef: 'score:fixture' }
};

const job = createResolvedRenderJob( fixtureJob );
fixtureJob.producer.state.colour = 'red';
assert.equal( job.producer.state.colour, 'white' );
assert.equal( Object.isFrozen( job.producer.state ), true );
assert.equal( getRenderFrameCount( job ), 3 );
pass( 'resolved jobs are validated, snapshotted and deeply immutable' );

assert.throws(
  () => createResolvedRenderJob( { ...fixtureJob, executor: () => 'runpod' } ),
  /JSON-serializable/
);
assert.throws(
  () => createResolvedRenderJob( {
    ...fixtureJob,
    timeline: { cueInSeconds: 0, cueOutSeconds: 2 }
  } ),
  /exceeds the resolved audio duration/
);
pass( 'invalid manifests fail before producer or sink setup' );

const audioBuffer = {
  sampleRate: 4,
  numberOfChannels: 2,
  getChannelData: ( channel ) => channel === 0
    ? new Float32Array( [ 0, 1, 2, 3 ] )
    : new Float32Array( [ 4, 5, 6, 7 ] )
};
const sampled = sampleAudioWindow( audioBuffer, 0.25, 0.75 );
assert.deepEqual( [ ...sampled.x ], [ 1, 2 ] );
assert.deepEqual( [ ...sampled.y ], [ 5, 6 ] );
pass( 'decoded audio sampling uses exact half-open time windows' );

const lifecycle = [];
const frames = [];
const sampleCalls = [];
const progress = [];
const stableFrameSource = { kind: 'canvas' };

const receipt = await runRenderPipeline( {
  job,
  createProducer: async () => ( {
    frameSource: stableFrameSource,
    async prepare() { lifecycle.push( 'producer.prepare' ); },
    async renderFrame( frame ) {
      lifecycle.push( `producer.render:${ frame.frameIndex }` );
      frames.push( frame );
    },
    async dispose() { lifecycle.push( 'producer.dispose' ); }
  } ),
  createSink: async () => ( {
    async addFrame( source, frame ) {
      assert.equal( source, stableFrameSource );
      lifecycle.push( `sink.add:${ frame.frameIndex }` );
    },
    async finish( { frameCount } ) {
      lifecycle.push( 'sink.finish' );
      return { frameCount, locator: 'memory://fixture.mp4' };
    },
    async abort() { lifecycle.push( 'sink.abort' ); }
  } ),
  sampleAudio: async ( context ) => {
    sampleCalls.push( context );
    return { x: new Float32Array( [ context.frameIndex ] ), y: new Float32Array( [ 0 ] ) };
  },
  onProgress: ( update ) => progress.push( update ),
  execution: { executor: 'test-local' }
} );

assert.deepEqual( frames.map( ( frame ) => frame.frameIndex ), [ 0, 1, 2 ] );
assert.deepEqual( frames.map( ( frame ) => frame.time ), [ 0.25, 0.25 + 1 / 6, 0.25 + 2 / 6 ] );
assert.deepEqual( frames.map( ( frame ) => frame.windowEndSeconds ), [ 0.25 + 1 / 6, 0.25 + 2 / 6, 0.75 ] );
assert.equal( sampleCalls.length, 3 );
assert.deepEqual( lifecycle, [
  'producer.prepare',
  'producer.render:0', 'sink.add:0',
  'producer.render:1', 'sink.add:1',
  'producer.render:2', 'sink.add:2',
  'sink.finish', 'producer.dispose'
] );
assert.equal( receipt.frameCount, 3 );
assert.equal( receipt.executor, 'test-local' );
assert.equal( receipt.jobHash, job.contentHash );
assert.equal( progress.at( -1 ).phase, 'completed' );
assert.equal( progress.at( -1 ).progress, 1 );
pass( 'the pipeline owns exact frame timing, one audio read per frame and ordered lifecycle' );
pass( 'execution placement is recorded in the receipt without entering the immutable job' );

const controller = new AbortController();
let aborted = false;
let disposed = false;
await assert.rejects(
  runRenderPipeline( {
    job,
    signal: controller.signal,
    createProducer: async () => ( {
      async prepare() {},
      async renderFrame( { frameIndex } ) {
        if ( frameIndex === 1 ) controller.abort();
        return stableFrameSource;
      },
      async dispose() { disposed = true; }
    } ),
    createSink: async () => ( {
      async addFrame() {},
      async finish() {},
      async abort() { aborted = true; }
    } )
  } ),
  RenderCancelledError
);
assert.equal( aborted, true );
assert.equal( disposed, true );
pass( 'cancellation aborts the sink and always disposes the producer' );

console.log( `\n${ passes.join( '\n' ) }\n\nAll checks passed.` );
