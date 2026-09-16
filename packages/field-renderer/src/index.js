import { sampleColorReadings } from '@awb/field-engine';

const TWO_PI = Math.PI * 2;

const requireFinite = ( value, path ) => {
  if ( !Number.isFinite( value ) ) throw new TypeError( `${ path } must be finite` );
  return value;
};

const requirePositiveInteger = ( value, path ) => {
  if ( !Number.isInteger( value ) || value <= 0 ) {
    throw new TypeError( `${ path } must be a positive integer` );
  }
  return value;
};

export function validateFieldRenderJob( job ) {
  if ( job?.producer?.kind !== 'field' ) {
    throw new Error( `Expected a field producer job, received ${ job?.producer?.kind || 'none' }` );
  }
  const state = job.producer.state;
  if ( !state || typeof state !== 'object' ) throw new TypeError( 'field producer state is required' );
  if ( !state.room || typeof state.room !== 'object' ) throw new TypeError( 'field state.room is required' );
  for ( const key of [ 'sep', 'spkH', 'conv', 'pistonA' ] ) requireFinite( state.room[ key ], `field state.room.${ key }` );
  if ( !Array.isArray( state.channels ) ) throw new TypeError( 'field state.channels must be an array' );
  state.channels.forEach( ( channel, index ) => {
    requireFinite( channel.freq, `field state.channels[${ index }].freq` );
    requireFinite( channel.gl, `field state.channels[${ index }].gl` );
    requireFinite( channel.gr, `field state.channels[${ index }].gr` );
  } );
  const grid = state.grid || {};
  requirePositiveInteger( grid.columns || 96, 'field state.grid.columns' );
  requirePositiveInteger( grid.rows || 54, 'field state.grid.rows' );
  return state;
}

/**
 * Deterministic, React-free Canvas2D field producer for @awb/render-pipeline.
 *
 * It intentionally consumes no audio. Analytic field state advances from the render clock, using
 * the same CPU equations as @awb/field-engine. A later WebGL producer can implement the same
 * structural contract without changing scheduling, sinks or executor placement.
 */
export function createFieldRenderProducer( { canvas, job } = {} ) {
  if ( !canvas ) throw new Error( 'createFieldRenderProducer requires a canvas' );
  const state = validateFieldRenderJob( job );
  const grid = { columns: 96, rows: 54, ...state.grid };
  const bounds = { xMin: -4, xMax: 4, zMin: 0, zMax: 8, height: state.room.spkH, ...state.bounds };
  const displayGain = state.displayGain ?? 1;
  let context = null;

  return {
    frameSource: canvas,

    async prepare() {
      canvas.width = job.output.width;
      canvas.height = job.output.height;
      context = canvas.getContext?.( '2d', { alpha: false } );
      if ( !context ) throw new Error( 'Field renderer requires a 2D canvas context' );
    },

    async renderFrame( frame ) {
      if ( !context ) throw new Error( 'Prepare the field producer before rendering' );
      const channels = state.channels.map( ( channel ) => ( {
        ...channel,
        phase: ( ( channel.phase || 0 ) + TWO_PI * channel.freq * frame.time ) % TWO_PI
      } ) );
      const cellWidth = canvas.width / grid.columns;
      const cellHeight = canvas.height / grid.rows;
      context.fillStyle = state.background || 'rgb(0 0 0)';
      context.fillRect( 0, 0, canvas.width, canvas.height );
      for ( let row = 0; row < grid.rows; row++ ) {
        const z = bounds.zMin + ( row + 0.5 ) / grid.rows * ( bounds.zMax - bounds.zMin );
        for ( let column = 0; column < grid.columns; column++ ) {
          const x = bounds.xMin + ( column + 0.5 ) / grid.columns * ( bounds.xMax - bounds.xMin );
          context.fillStyle = sampleColorReadings(
            channels,
            state.room,
            [ x, bounds.height, z ],
            displayGain
          ).composite.color;
          context.fillRect( column * cellWidth, row * cellHeight, cellWidth + 0.5, cellHeight + 0.5 );
        }
      }
      return canvas;
    },

    async dispose() { context = null; }
  };
}
