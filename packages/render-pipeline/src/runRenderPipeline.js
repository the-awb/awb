import { createResolvedRenderJob, getRenderFrameCount } from './job.js';

export class RenderCancelledError extends Error {
  constructor( message = 'Render cancelled' ) {
    super( message );
    this.name = 'RenderCancelledError';
  }
}

const throwIfAborted = ( signal ) => {
  if ( signal?.aborted ) throw new RenderCancelledError();
};

const requireMethod = ( object, method, owner ) => {
  if ( typeof object?.[ method ] !== 'function' ) {
    throw new TypeError( `${ owner } must implement ${ method }()` );
  }
};

const report = ( onProgress, phase, completedFrames, totalFrames ) => {
  onProgress?.( {
    phase,
    completedFrames,
    totalFrames,
    progress: totalFrames === 0 ? 0 : completedFrames / totalFrames
  } );
};

/**
 * Run one resolved job sequentially.
 *
 * createProducer and createSink are dependency-injected adapters. The pipeline owns indexing,
 * timing, audio-window cadence, lifecycle and validation; the producer owns its renderer/scene,
 * and the sink owns encoding/storage. Executor placement is recorded only in the receipt.
 */
export async function runRenderPipeline( {
  job: inputJob,
  createProducer,
  createSink,
  sampleAudio = null,
  signal = null,
  onProgress = null,
  execution = {}
} = {} ) {
  const job = createResolvedRenderJob( inputJob );
  if ( typeof createProducer !== 'function' ) throw new TypeError( 'createProducer must be a function' );
  if ( typeof createSink !== 'function' ) throw new TypeError( 'createSink must be a function' );
  if ( sampleAudio !== null && typeof sampleAudio !== 'function' ) {
    throw new TypeError( 'sampleAudio must be a function or null' );
  }

  throwIfAborted( signal );
  const totalFrames = getRenderFrameCount( job );
  let producer = null;
  let sink = null;
  let sinkFinished = false;
  let completedFrames = 0;
  const startedAt = new Date().toISOString();

  try {
    report( onProgress, 'preparing', 0, totalFrames );
    producer = await createProducer( { job, signal } );
    requireMethod( producer, 'prepare', 'producer' );
    requireMethod( producer, 'renderFrame', 'producer' );
    requireMethod( producer, 'dispose', 'producer' );
    await producer.prepare( { job, signal } );
    throwIfAborted( signal );

    sink = await createSink( { job, signal, frameSource: producer.frameSource } );
    requireMethod( sink, 'addFrame', 'sink' );
    requireMethod( sink, 'finish', 'sink' );
    requireMethod( sink, 'abort', 'sink' );

    report( onProgress, 'rendering', 0, totalFrames );
    const { cueInSeconds, cueOutSeconds } = job.timeline;
    const { fps } = job.output;
    for ( let frameIndex = 0; frameIndex < totalFrames; frameIndex++ ) {
      throwIfAborted( signal );
      const windowStartSeconds = cueInSeconds + frameIndex / fps;
      const windowEndSeconds = Math.min( cueOutSeconds, cueInSeconds + ( frameIndex + 1 ) / fps );
      const frame = {
        job,
        frameIndex,
        totalFrames,
        time: windowStartSeconds,
        delta: 1 / fps,
        windowStartSeconds,
        windowEndSeconds,
        audioWindow: sampleAudio
          ? await sampleAudio( { job, frameIndex, startTime: windowStartSeconds, endTime: windowEndSeconds, signal } )
          : null,
        signal
      };
      throwIfAborted( signal );
      const renderedSource = await producer.renderFrame( frame );
      const frameSource = renderedSource ?? producer.frameSource;
      if ( frameSource === null || frameSource === undefined ) {
        throw new Error( `producer returned no frame source for frame ${ frameIndex }` );
      }
      await sink.addFrame( frameSource, frame );
      completedFrames++;
      report( onProgress, 'rendering', completedFrames, totalFrames );
    }

    throwIfAborted( signal );
    report( onProgress, 'finalising', completedFrames, totalFrames );
    const output = await sink.finish( { job, signal, frameCount: completedFrames } );
    sinkFinished = true;
    if ( output?.frameCount !== undefined && output.frameCount !== totalFrames ) {
      throw new Error( `sink reported ${ output.frameCount } frames; expected ${ totalFrames }` );
    }

    const receipt = Object.freeze( {
      schemaVersion: 1,
      status: 'completed',
      jobHash: job.contentHash,
      producer: Object.freeze( { kind: job.producer.kind, version: job.producer.version } ),
      pipelineVersion: '0.1.0',
      executor: execution.executor || 'local',
      startedAt,
      completedAt: new Date().toISOString(),
      frameCount: completedFrames,
      fps: job.output.fps,
      output
    } );
    report( onProgress, 'completed', completedFrames, totalFrames );
    return receipt;
  } catch ( error ) {
    if ( sink && !sinkFinished ) {
      try { await sink.abort( { job, error, completedFrames } ); } catch { /* preserve root error */ }
    }
    throw signal?.aborted && !( error instanceof RenderCancelledError )
      ? new RenderCancelledError()
      : error;
  } finally {
    if ( producer ) await producer.dispose( { job } );
  }
}
