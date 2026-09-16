import { RenderCancelledError, runRenderPipeline } from '@awb/render-pipeline';
import { createWebCodecsSink } from '@awb/render-pipeline/webcodecs';
import { createFieldRenderer, createFieldRenderProducer } from '@awb/field-renderer';

const executor = window.awbRenderExecutor;
const canvas = document.querySelector( '#render-canvas' );
let active = null;

const streamToShell = () => new WritableStream( {
  write: ( chunk ) => executor.write( chunk ),
  close: () => executor.closeOutput(),
  abort: () => executor.abortOutput()
} );

const producerFor = ( context ) => {
  if ( context.job.producer.kind === 'field' ) return createFieldRenderProducer( { ...context, canvas } );
  throw new Error( `The local executor does not support ${ context.job.producer.kind } yet.` );
};

const hashPixels = async ( pixels ) => {
  const digest = await crypto.subtle.digest( 'SHA-256', pixels );
  return [ ...new Uint8Array( digest ) ].map( ( byte ) => byte.toString( 16 ).padStart( 2, '0' ) ).join( '' );
};

const runLease = async ( lease ) => {
  console.log( `lease ${ lease.renderID } started` );
  const controller = new AbortController();
  let progressQueue = Promise.resolve();
  const frameHashes = [];
  let repeatStable = true;
  let liveParity = true;
  active = { lease, controller };
  try {
    const receipt = await runRenderPipeline( {
      job: lease.job,
      signal: controller.signal,
      execution: { executor: 'local' },
      createProducer: async ( context ) => {
        const producer = producerFor( context );
        if ( !lease.diagnostics?.verifyPixels ) return producer;
        return {
          frameSource: producer.frameSource,
          prepare: ( value ) => producer.prepare( value ),
          async renderFrame( frame ) {
            const source = await producer.renderFrame( frame );
            const first = await hashPixels( producer.readPixels() );
            await producer.renderFrame( frame );
            const repeated = await hashPixels( producer.readPixels() );
            repeatStable &&= first === repeated;
            if ( frame.frameIndex === 0 ) {
              const liveCanvas = document.createElement( 'canvas' );
              const liveEngine = createFieldRenderer( {
                canvas: liveCanvas,
                width: lease.job.output.width,
                height: lease.job.output.height,
                pixelRatio: 1,
                preserveDrawingBuffer: false,
                controls: 'orbit'
              } );
              try {
                liveEngine.setState( lease.job.producer.state.field );
                if ( lease.job.producer.state.camera ) liveEngine.setCamera( lease.job.producer.state.camera );
                liveEngine.renderFrame( { time: frame.time, delta: frame.delta,
                  now: frame.time * 1000, analytic: true, phaseMode: 'absolute' } );
                liveParity = first === await hashPixels( liveEngine.readPixels() );
              } finally { liveEngine.dispose(); }
            }
            frameHashes.push( first );
            return source;
          },
          dispose: ( value ) => producer.dispose( value )
        };
      },
      createSink: ( { job } ) => createWebCodecsSink( {
        job,
        fileName: lease.output.name,
        writableStream: streamToShell(),
        onPhase: ( phase ) => console.log( `sink ${ phase }` )
      } ),
      onProgress: ( progress ) => {
        console.log( `progress ${ progress.phase } ${ progress.completedFrames }/${ progress.totalFrames }` );
        if ( progress.phase !== 'completed' ) {
          progressQueue = progressQueue.then( () => executor.progress( {
            renderID: lease.renderID,
            leaseID: lease.leaseID,
            phase: progress.phase,
            completedFrames: progress.completedFrames,
            totalFrames: progress.totalFrames
          } ) );
        }
      }
    } );
    await progressQueue;
    await executor.complete( {
      renderID: lease.renderID,
      leaseID: lease.leaseID,
      receipt: { ...receipt, output: {
        fileName: lease.output.name,
        frameCount: receipt.output.frameCount,
        locator: lease.output.locator,
        ...( lease.diagnostics?.verifyPixels
          ? { diagnostics: { frameHashes, repeatStable, liveParity } } : {} )
      } }
    } );
    console.log( `lease ${ lease.renderID } completed` );
  } catch ( error ) {
    console.error( `lease ${ lease.renderID } failed: ${ error?.stack || error }` );
    await executor.abortOutput().catch( () => {} );
    if ( error instanceof RenderCancelledError || controller.signal.aborted ) {
      await executor.cancelled( { renderID: lease.renderID, leaseID: lease.leaseID } );
    } else {
      await executor.fail( { renderID: lease.renderID, leaseID: lease.leaseID,
        error: error?.message || String( error ) } );
    }
  } finally {
    active = null;
  }
};

executor.onLease( ( lease ) => runLease( lease ) );
executor.onCommand( ( command ) => {
  if ( command.type === 'cancel' && active?.lease.renderID === command.renderID ) {
    active.controller.abort();
  }
} );
executor.ready();
