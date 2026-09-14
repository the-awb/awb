import { createLissajousEngine } from './createLissajousEngine.js';

/**
 * Adapt the vanilla engine to @awb/render-pipeline's indexed producer contract.
 *
 * The adapter is structurally compatible without importing the pipeline package. That keeps the
 * visual engine usable on its own and prevents an encoding/orchestration dependency from leaking
 * into live embeds.
 */
export function createLissajousRenderProducer( { canvas, job, engineOptions = {} } = {} ) {
  if ( !canvas ) throw new Error( 'createLissajousRenderProducer requires a canvas' );
  if ( job?.producer?.kind !== 'lissajous' ) {
    throw new Error( `Expected a lissajous producer job, received ${ job?.producer?.kind || 'none' }` );
  }

  const state = job.producer.state || {};
  if ( state.pixelRatio !== undefined && state.pixelRatio !== 1 ) {
    throw new Error( 'Deterministic Lissajous renders currently require producer.state.pixelRatio = 1' );
  }

  let engine = null;
  let prepared = false;

  return {
    frameSource: canvas,

    async prepare() {
      if ( prepared ) throw new Error( 'Lissajous producer is already prepared' );
      engine = createLissajousEngine( {
        ...engineOptions,
        canvas,
        controls: 'none',
        pixelRatio: 1,
        width: job.output.width,
        height: job.output.height,
        preserveDrawingBuffer: true
      } );
      engine.setState( {
        groups: state.groups || [],
        visualizationMode: state.visualizationMode || 'points'
      } );
      if ( state.cameraPosition || state.cameraTarget ) {
        engine.setCamera( {
          position: state.cameraPosition,
          target: state.cameraTarget || [ 0, 0, 0 ]
        } );
      }
      prepared = true;
    },

    async renderFrame( frame ) {
      if ( !prepared ) throw new Error( 'Prepare the Lissajous producer before rendering' );
      engine.renderFrame( frame.frameIndex, {
        fps: job.output.fps,
        time: frame.time,
        delta: frame.delta,
        newSamples: frame.audioWindow,
        automationLog: state.automationLog || null,
        automationOverrides: state.automationOverrides || null,
        playheadPosition: frame.time
      } );
      return canvas;
    },

    async dispose() {
      engine?.dispose();
      engine = null;
      prepared = false;
    },

    get engine() { return engine; }
  };
}
