const isPlainObject = ( value ) => {
  if ( value === null || typeof value !== 'object' || Array.isArray( value ) ) return false;
  const prototype = Object.getPrototypeOf( value );
  return prototype === Object.prototype || prototype === null;
};

const assertJsonValue = ( value, path ) => {
  if ( value === null || typeof value === 'string' || typeof value === 'boolean' ) return;
  if ( typeof value === 'number' ) {
    if ( Number.isFinite( value ) ) return;
    throw new TypeError( `${ path } must contain only finite numbers` );
  }
  if ( Array.isArray( value ) ) {
    value.forEach( ( item, index ) => assertJsonValue( item, `${ path }[${ index }]` ) );
    return;
  }
  if ( isPlainObject( value ) ) {
    for ( const [ key, item ] of Object.entries( value ) ) {
      assertJsonValue( item, `${ path }.${ key }` );
    }
    return;
  }
  throw new TypeError( `${ path } must be JSON-serializable` );
};

const requireObject = ( value, path ) => {
  if ( !isPlainObject( value ) ) throw new TypeError( `${ path } must be an object` );
};

const requireString = ( value, path ) => {
  if ( typeof value !== 'string' || value.length === 0 ) {
    throw new TypeError( `${ path } must be a non-empty string` );
  }
};

const requirePositiveNumber = ( value, path ) => {
  if ( !Number.isFinite( value ) || value <= 0 ) {
    throw new TypeError( `${ path } must be a positive finite number` );
  }
};

const deepFreeze = ( value ) => {
  if ( value && typeof value === 'object' && !Object.isFrozen( value ) ) {
    Object.freeze( value );
    for ( const child of Object.values( value ) ) deepFreeze( child );
  }
  return value;
};

/**
 * Validate and snapshot a provider-neutral visual render job.
 *
 * This is deliberately the resolved boundary. A score-container resolver upstream chooses or
 * renders the exact audio artifact and supplies its content hash. Paths/URLs are replaceable
 * locators and are not interpreted here. No score-folder or executor semantics belong in this
 * object.
 */
export function createResolvedRenderJob( input ) {
  requireObject( input, 'job' );
  assertJsonValue( input, 'job' );

  if ( input.schemaVersion !== 1 && input.schemaVersion !== 2 ) {
    throw new TypeError( 'job.schemaVersion must be 1 or 2' );
  }
  requireString( input.contentHash, 'job.contentHash' );

  requireObject( input.producer, 'job.producer' );
  requireString( input.producer.kind, 'job.producer.kind' );
  requireString( input.producer.version, 'job.producer.version' );
  if ( !( 'state' in input.producer ) ) throw new TypeError( 'job.producer.state is required' );

  if ( input.schemaVersion === 1 ) {
    requireObject( input.audio, 'job.audio' );
    requireString( input.audio.artifactHash, 'job.audio.artifactHash' );
    requireString( input.audio.locator, 'job.audio.locator' );
    requirePositiveNumber( input.audio.sampleRate, 'job.audio.sampleRate' );
    if ( !Number.isInteger( input.audio.channels ) || input.audio.channels <= 0 ) {
      throw new TypeError( 'job.audio.channels must be a positive integer' );
    }
    requirePositiveNumber( input.audio.durationSeconds, 'job.audio.durationSeconds' );
  } else {
    if ( !Array.isArray( input.inputs ) ) throw new TypeError( 'job.inputs must be an array' );
    const ids = new Set();
    input.inputs.forEach( ( descriptor, index ) => {
      const path = `job.inputs[${ index }]`;
      requireObject( descriptor, path );
      requireString( descriptor.id, `${ path }.id` );
      requireString( descriptor.kind, `${ path }.kind` );
      requireString( descriptor.artifactHash, `${ path }.artifactHash` );
      requireString( descriptor.locator, `${ path }.locator` );
      if ( ids.has( descriptor.id ) ) throw new TypeError( `${ path }.id must be unique` );
      ids.add( descriptor.id );
      if ( descriptor.metadata !== undefined ) requireObject( descriptor.metadata, `${ path }.metadata` );
    } );
  }

  requireObject( input.timeline, 'job.timeline' );
  const { cueInSeconds, cueOutSeconds } = input.timeline;
  if ( !Number.isFinite( cueInSeconds ) || cueInSeconds < 0 ) {
    throw new TypeError( 'job.timeline.cueInSeconds must be a non-negative finite number' );
  }
  if ( !Number.isFinite( cueOutSeconds ) || cueOutSeconds <= cueInSeconds ) {
    throw new TypeError( 'job.timeline.cueOutSeconds must be greater than cueInSeconds' );
  }
  if ( input.schemaVersion === 1 && cueOutSeconds > input.audio.durationSeconds ) {
    throw new RangeError( 'job.timeline.cueOutSeconds exceeds the resolved audio duration' );
  }

  requireObject( input.output, 'job.output' );
  for ( const field of [ 'width', 'height', 'fps' ] ) {
    requirePositiveNumber( input.output[ field ], `job.output.${ field }` );
  }
  if ( !Number.isInteger( input.output.width ) || !Number.isInteger( input.output.height ) ) {
    throw new TypeError( 'job.output width and height must be integers' );
  }
  requireString( input.output.format, 'job.output.format' );

  // JSON data is the portable manifest contract. Cloning also prevents the caller from mutating
  // nested producer state after validation and changing what a content hash supposedly names.
  return deepFreeze( JSON.parse( JSON.stringify( input ) ) );
}

/** Find a schema-v2 input by id or kind. Schema-v1 audio remains addressable during migration. */
export function getRenderInput( job, selector ) {
  const match = typeof selector === 'string' ? { kind: selector } : selector;
  if ( !match || ( !match.id && !match.kind ) ) {
    throw new TypeError( 'input selector must provide an id or kind' );
  }
  if ( job.schemaVersion === 1 ) {
    if ( ( !match.kind || match.kind === 'audio' ) && ( !match.id || match.id === 'audio' ) ) {
      return { id: 'audio', kind: 'audio', ...job.audio, metadata: { ...job.audio } };
    }
    return null;
  }
  return job.inputs.find( ( input ) =>
    ( !match.id || input.id === match.id ) && ( !match.kind || input.kind === match.kind )
  ) || null;
}

export function requireRenderInput( job, selector, owner = job.producer.kind ) {
  const input = getRenderInput( job, selector );
  if ( input ) return input;
  const label = typeof selector === 'string' ? selector : selector.id || selector.kind;
  throw new Error( `${ owner } requires ${ label } render input` );
}

export function getRenderFrameCount( job ) {
  return Math.ceil(
    ( job.timeline.cueOutSeconds - job.timeline.cueInSeconds ) * job.output.fps
  );
}
