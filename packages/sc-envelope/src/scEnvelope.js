export const SC_ENV_SCHEMA = 'sc.env/1';

const CURVE_ALIASES = Object.freeze( {
  step: 'step',
  lin: 'lin',
  linear: 'lin',
  exp: 'exp',
  exponential: 'exp',
  sin: 'sin',
  sine: 'sin',
  wel: 'wel',
  welch: 'wel',
  sqr: 'sqr',
  squared: 'sqr',
  cub: 'cub',
  cubed: 'cub',
  hold: 'hold'
} );

const CURVE_SHAPES = Object.freeze( {
  step: 0, lin: 1, exp: 2, sin: 3, wel: 4, sqr: 6, cub: 7, hold: 8
} );
const SHAPE_CURVES = Object.freeze( Object.fromEntries(
  Object.entries( CURVE_SHAPES ).map( ( [ curve, shape ] ) => [ shape, curve ] )
) );

export const SC_ENV_CURVES = Object.freeze( Object.keys( CURVE_SHAPES ) );

const isObject = ( value ) => value !== null && typeof value === 'object' && !Array.isArray( value );
const finite = ( value ) => typeof value === 'number' && Number.isFinite( value );

function freezeDeep( value ) {
  if ( value && typeof value === 'object' && !Object.isFrozen( value ) ) {
    Object.values( value ).forEach( freezeDeep );
    Object.freeze( value );
  }
  return value;
}

function wrapExtend( value, size, label ) {
  const values = Array.isArray( value ) ? [ ...value ] : [ value ];
  if ( size === 0 ) return [];
  if ( values.length === 0 || values[ 0 ] === undefined ) {
    throw new Error( `${ label } must contain at least one value` );
  }
  return Array.from( { length: size }, ( _, index ) => values[ index % values.length ] );
}

function normalizeCurve( curve ) {
  if ( finite( curve ) ) return curve;
  if ( typeof curve !== 'string' ) throw new Error( 'curves must contain finite numbers or SC curve names' );
  const canonical = CURVE_ALIASES[ curve.replace( /^\\/, '' ) ];
  if ( !canonical ) throw new Error( `Unknown SC envelope curve: ${ curve }` );
  return canonical;
}

export function normalizeScEnv( value ) {
  if ( !isObject( value ) ) throw new Error( 'SC envelope must be an object' );
  const levels = Array.isArray( value.levels ) ? [ ...value.levels ] : null;
  if ( !levels || levels.length === 0 ) throw new Error( 'levels must be a non-empty array' );
  const segmentCount = levels.length - 1;
  const times = wrapExtend( value.times ?? 1, segmentCount, 'times' );
  const sourceCurves = value.curves ?? value.curve ?? 'lin';
  const curves = wrapExtend( sourceCurves, segmentCount, 'curves' ).map( normalizeCurve );
  const envelope = {
    schema: SC_ENV_SCHEMA,
    levels,
    times,
    curves,
    releaseNode: value.releaseNode ?? null,
    loopNode: value.loopNode ?? null,
    offset: value.offset ?? 0
  };
  return freezeDeep( assertScEnv( envelope ) );
}

export function createScEnv( value = {} ) {
  return normalizeScEnv( { levels: [ 0, 1, 0 ], times: [ 1, 1 ], ...value } );
}

export function validateScEnv( value ) {
  const errors = [];
  if ( !isObject( value ) ) return { ok: false, errors: [ 'SC envelope must be an object' ] };
  if ( value.schema !== SC_ENV_SCHEMA ) errors.push( `schema must be ${ SC_ENV_SCHEMA }` );
  if ( !Array.isArray( value.levels ) || value.levels.length === 0 ) {
    errors.push( 'levels must be a non-empty array' );
  } else if ( value.levels.some( ( level ) => !finite( level ) ) ) {
    errors.push( 'levels must contain only finite numbers' );
  }
  const segmentCount = Math.max( 0, ( value.levels?.length ?? 1 ) - 1 );
  if ( !Array.isArray( value.times ) || value.times.length !== segmentCount ) {
    errors.push( `times must contain exactly ${ segmentCount } segment values` );
  } else if ( value.times.some( ( time ) => !finite( time ) || time < 0 ) ) {
    errors.push( 'times must contain only non-negative finite numbers' );
  }
  if ( !Array.isArray( value.curves ) || value.curves.length !== segmentCount ) {
    errors.push( `curves must contain exactly ${ segmentCount } segment values` );
  } else {
    value.curves.forEach( ( curve, index ) => {
      if ( !( finite( curve ) || SC_ENV_CURVES.includes( curve ) ) ) {
        errors.push( `curves[${ index }] is not a canonical SC curve` );
      }
      if ( curve === 'exp' && Array.isArray( value.levels ) ) {
        const start = value.levels[ index ];
        const end = value.levels[ index + 1 ];
        if ( start === 0 || end === 0 || Math.sign( start ) !== Math.sign( end ) ) {
          errors.push( `curves[${ index }] exp requires non-zero levels with the same sign` );
        }
      }
      if ( [ 'sqr', 'cub' ].includes( curve ) && Array.isArray( value.levels ) ) {
        if ( value.levels[ index ] < 0 || value.levels[ index + 1 ] < 0 ) {
          errors.push( `curves[${ index }] ${ curve } requires non-negative levels for finite evaluation` );
        }
      }
    } );
  }
  const checkNode = ( name, node ) => {
    if ( node !== null && ( !Number.isInteger( node ) || node < 0 || node >= segmentCount ) ) {
      errors.push( `${ name } must be null or a level index before the final level` );
    }
  };
  checkNode( 'releaseNode', value.releaseNode );
  checkNode( 'loopNode', value.loopNode );
  if ( value.loopNode !== null ) {
    if ( value.releaseNode === null ) errors.push( 'loopNode requires releaseNode' );
    else if ( value.loopNode >= value.releaseNode ) errors.push( 'loopNode must be before releaseNode' );
  }
  if ( !finite( value.offset ) ) errors.push( 'offset must be a finite number' );
  return { ok: errors.length === 0, errors };
}

export function assertScEnv( value ) {
  const result = validateScEnv( value );
  if ( !result.ok ) throw new Error( `Invalid SC envelope: ${ result.errors.join( '; ' ) }` );
  return value;
}

export function scEnvDuration( envelope ) {
  assertScEnv( envelope );
  return envelope.times.reduce( ( total, time ) => total + time, 0 );
}

export function scEnvReleaseDuration( envelope ) {
  assertScEnv( envelope );
  if ( envelope.releaseNode === null ) return 0;
  return envelope.times.slice( envelope.releaseNode ).reduce( ( total, time ) => total + time, 0 );
}

function curveShape( curve ) {
  return finite( curve ) ? 5 : CURVE_SHAPES[ curve ];
}

export function scEnvAsArray( envelope ) {
  assertScEnv( envelope );
  const array = [
    envelope.levels[ 0 ], envelope.times.length,
    envelope.releaseNode ?? -99, envelope.loopNode ?? -99
  ];
  envelope.times.forEach( ( time, index ) => {
    const curve = envelope.curves[ index ];
    array.push(
      envelope.levels[ index + 1 ], time, curveShape( curve ), finite( curve ) ? curve : 0
    );
  } );
  return Object.freeze( array );
}

// A SynthDef control array has a fixed width even when the authored Env uses fewer stages.
// EnvGen reads the stage count from the header and ignores the padded tail. This lets one
// explicitly-capable SynthDef accept ASR, ADSR, percussion and custom shapes without recompiling.
export function scEnvAsControlArray( envelope, maxSegments = 4 ) {
  assertScEnv( envelope );
  if ( !Number.isInteger( maxSegments ) || maxSegments < 1 ) {
    throw new Error( 'maxSegments must be a positive integer' );
  }
  if ( envelope.times.length > maxSegments ) {
    throw new Error( `Envelope has ${ envelope.times.length } segments; control accepts ${ maxSegments }` );
  }
  const result = [ ...scEnvAsArray( envelope ) ];
  while ( result.length < 4 + maxSegments * 4 ) {
    result.push( envelope.levels.at( -1 ), 0, CURVE_SHAPES.hold, 0 );
  }
  return Object.freeze( result );
}

export function scEnvFromControlArray( array, options ) {
  if ( !Array.isArray( array ) || !Number.isInteger( array[ 1 ] ) || array[ 1 ] < 0 ) {
    throw new Error( 'SC Env control array has an invalid segment count' );
  }
  const usedLength = 4 + array[ 1 ] * 4;
  if ( array.length < usedLength ) throw new Error( 'SC Env control array is shorter than its stage count' );
  return scEnvFromArray( array.slice( 0, usedLength ), options );
}

export function scEnvFromArray( array, { offset = 0 } = {} ) {
  if ( !Array.isArray( array ) || array.length < 4 ) throw new Error( 'SC Env array must contain a four-value header' );
  const segmentCount = array[ 1 ];
  if ( !Number.isInteger( segmentCount ) || segmentCount < 0 || array.length !== 4 + segmentCount * 4 ) {
    throw new Error( 'SC Env array has an invalid segment count or length' );
  }
  const levels = [ array[ 0 ] ];
  const times = [];
  const curves = [];
  for ( let index = 0; index < segmentCount; index += 1 ) {
    const cursor = 4 + index * 4;
    const shape = array[ cursor + 2 ];
    levels.push( array[ cursor ] );
    times.push( array[ cursor + 1 ] );
    if ( shape === 5 ) curves.push( array[ cursor + 3 ] );
    else if ( Object.hasOwn( SHAPE_CURVES, shape ) ) curves.push( SHAPE_CURVES[ shape ] );
    else throw new Error( `SC Env array has unknown curve shape ${ shape }` );
  }
  return normalizeScEnv( {
    levels, times, curves,
    releaseNode: array[ 2 ] === -99 ? null : array[ 2 ],
    loopNode: array[ 3 ] === -99 ? null : array[ 3 ],
    offset
  } );
}

function segmentValue( start, end, curve, position ) {
  if ( curve === 'step' ) return end;
  if ( curve === 'hold' ) return start;
  if ( curve === 'lin' || curve === 0 ) return start + ( end - start ) * position;
  if ( curve === 'exp' ) return start * ( end / start ) ** position;
  if ( curve === 'sin' ) return start + ( end - start ) * ( 0.5 - 0.5 * Math.cos( Math.PI * position ) );
  if ( curve === 'wel' ) {
    return start < end
      ? start + ( end - start ) * Math.sin( Math.PI * 0.5 * position )
      : end + ( start - end ) * Math.sin( Math.PI * 0.5 * ( 1 - position ) );
  }
  if ( curve === 'sqr' ) {
    const root = Math.sqrt( start ) + ( Math.sqrt( end ) - Math.sqrt( start ) ) * position;
    return root * root;
  }
  if ( curve === 'cub' ) {
    const root = Math.cbrt( start ) + ( Math.cbrt( end ) - Math.cbrt( start ) ) * position;
    return root * root * root;
  }
  const denominator = 1 - Math.exp( curve );
  const shaped = Math.abs( denominator ) < 1e-9
    ? position : ( 1 - Math.exp( position * curve ) ) / denominator;
  return start + ( end - start ) * shaped;
}

// Matches Env#at: this samples the fixed sequence of segments. Gate, release and loop behaviour
// belongs to EnvGen execution and is deliberately not inferred here.
export function scEnvValueAt( envelope, time ) {
  assertScEnv( envelope );
  if ( !finite( time ) ) throw new Error( 'SC envelope sample time must be finite' );
  if ( envelope.times.length === 0 ) return envelope.levels[ 0 ];
  let elapsed = Math.max( 0, time - envelope.offset );
  for ( let index = 0; index < envelope.times.length; index += 1 ) {
    const duration = envelope.times[ index ];
    if ( elapsed < duration || ( duration === 0 && elapsed === 0 ) ) {
      const position = duration === 0 ? 1 : elapsed / duration;
      return segmentValue(
        envelope.levels[ index ], envelope.levels[ index + 1 ],
        envelope.curves[ index ], position
      );
    }
    elapsed -= duration;
  }
  return envelope.levels.at( -1 );
}
