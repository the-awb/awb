import { RenderCancelledError, runRenderPipeline } from '@awb/render-pipeline';
import { createWebCodecsSink } from '@awb/render-pipeline/webcodecs';
import { createFieldRenderProducer } from '@awb/field-renderer';

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

const runLease = async ( lease ) => {
  console.log( `lease ${ lease.renderID } started` );
  const controller = new AbortController();
  let progressQueue = Promise.resolve();
  active = { lease, controller };
  try {
    const receipt = await runRenderPipeline( {
      job: lease.job,
      signal: controller.signal,
      execution: { executor: 'local' },
      createProducer: producerFor,
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
        locator: lease.output.locator
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
