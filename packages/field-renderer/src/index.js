import { createFieldRenderer } from './createFieldRenderer.js';

export { createFieldRenderer } from './createFieldRenderer.js';

export const FIELD_RENDER_MODES = Object.freeze( {
  ANALYTIC_PREVIEW: 'analytic-preview',
  REALIZED_SCORE: 'realized-score'
} );

const requireObject = ( value, path ) => {
  if ( !value || typeof value !== 'object' || Array.isArray( value ) ) {
    throw new TypeError( `${ path } must be an object` );
  }
  return value;
};

export function validateFieldRenderJob( job ) {
  if ( job?.producer?.kind !== 'field' ) {
    throw new Error( `Expected a field producer job, received ${ job?.producer?.kind || 'none' }` );
  }
  const state = requireObject( job.producer.state, 'field producer state' );
  if ( state.mode === FIELD_RENDER_MODES.REALIZED_SCORE ) {
    throw new Error( 'field realized-score rendering requires an observation artifact, which is not implemented' );
  }
  if ( state.mode !== FIELD_RENDER_MODES.ANALYTIC_PREVIEW ) {
    throw new Error( 'field producer state.mode must be analytic-preview' );
  }
  if ( state.pixelRatio !== undefined && state.pixelRatio !== 1 ) {
    throw new Error( 'Deterministic Field renders require producer.state.pixelRatio = 1' );
  }
  const field = requireObject( state.field, 'field producer state.field' );
  requireObject( field.room, 'field producer state.field.room' );
  requireObject( field.surfaces, 'field producer state.field.surfaces' );
  requireObject( field.display, 'field producer state.field.display' );
  if ( !Array.isArray( field.instruments ) ) {
    throw new TypeError( 'field producer state.field.instruments must be an array' );
  }
  if ( field.microphones !== undefined && !Array.isArray( field.microphones ) ) {
    throw new TypeError( 'field producer state.field.microphones must be an array' );
  }
  return Object.freeze( { state, field } );
}

/** Deterministic adapter from the shared vanilla WebGL controller to @awb/render-pipeline. */
export function createFieldRenderProducer( {
  canvas,
  job,
  engineOptions = {},
  engineFactory = createFieldRenderer
} = {} ) {
  if ( !canvas ) throw new Error( 'createFieldRenderProducer requires a canvas' );
  const { state, field } = validateFieldRenderJob( job );
  let engine = null;
  let prepared = false;

  return {
    frameSource: canvas,

    async prepare() {
      if ( prepared ) throw new Error( 'Field producer is already prepared' );
      engine = engineFactory( {
        ...engineOptions,
        canvas,
        controls: 'none',
        pixelRatio: 1,
        width: job.output.width,
        height: job.output.height,
        preserveDrawingBuffer: true
      } );
      engine.setState( field );
      if ( state.camera ) engine.setCamera( state.camera );
      prepared = true;
    },

    async renderFrame( frame ) {
      if ( !prepared ) throw new Error( 'Prepare the Field producer before rendering' );
      engine.renderFrame( {
        time: frame.time,
        delta: frame.delta,
        now: frame.time * 1000,
        analytic: true,
        phaseMode: 'absolute'
      } );
      return canvas;
    },

    async dispose() {
      engine?.dispose();
      engine = null;
      prepared = false;
    },

    readPixels() {
      if ( !prepared ) throw new Error( 'Prepare the Field producer before reading pixels' );
      return engine.readPixels();
    },

    get engine() { return engine; }
  };
}
