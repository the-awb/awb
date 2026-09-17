import { hashScoreDocument, serializeScoreDocument } from '@awb/score';

const normalizeHash = ( hash ) => `${ hash }`.replace( /^sha256:/, '' );

export class PairSaveError extends Error {
  constructor( stage, message, cause = null ) {
    super( message );
    this.name = 'PairSaveError';
    this.stage = stage;
    this.cause = cause;
  }
}

export function validateProjection( projection, identity ) {
  if ( !projection || typeof projection !== 'object' ) throw new PairSaveError( 'projection', 'Projection provider returned no result.' );
  if ( projection.scoreID !== identity.scoreID ) throw new PairSaveError( 'projection', 'Projection belongs to a different score.' );
  if ( projection.revision !== identity.revision ) throw new PairSaveError( 'projection', 'Projection belongs to a different revision.' );
  if ( normalizeHash( projection.contentHash ) !== identity.contentHash ) {
    throw new PairSaveError( 'projection', 'Projection was generated from different canonical bytes.' );
  }
  if ( typeof projection.text !== 'string' || !projection.text.length ) {
    throw new PairSaveError( 'projection', 'Projection provider returned no SC text.' );
  }
  return projection;
}

async function projectionStage( { document, identity, canonical = null, requestProjection, saveProjection, kind } ) {
  const projection = validateProjection( await requestProjection( { ...identity, kind } ), identity );
  const saved = await saveProjection( projection.text, {
    ...identity, kind, canonicalHandle: canonical?.handle ?? null
  } );
  return { projection, saved };
}

export async function saveScorePair( {
  document, saveCanonical, requestProjection, saveProjection, kind = 'timeline'
} ) {
  const canonicalText = serializeScoreDocument( document );
  const identity = Object.freeze( {
    scoreID: document.scoreID,
    revision: document.revision,
    contentHash: await hashScoreDocument( document )
  } );
  let canonical;
  try {
    canonical = await saveCanonical( document, { canonicalText, ...identity } );
  } catch ( error ) {
    throw new PairSaveError( 'canonical', `Canonical score was not saved: ${ error.message }`, error );
  }
  if ( canonical?.hash && normalizeHash( canonical.hash ) !== identity.contentHash ) {
    throw new PairSaveError( 'canonical', 'Canonical save reported a different content hash.' );
  }

  try {
    const { projection, saved } = await projectionStage( {
      document, identity, canonical, requestProjection, saveProjection, kind
    } );
    return Object.freeze( {
      status: 'complete', canonicalSaved: true, projectionSaved: true,
      identity, canonical, projection, projectionResult: saved
    } );
  } catch ( error ) {
    return Object.freeze( {
      status: 'partial', canonicalSaved: true, projectionSaved: false,
      identity, canonical, projectionError: error.message
    } );
  }
}

export async function retryScoreProjection( {
  document, identity, requestProjection, saveProjection, kind = 'timeline'
} ) {
  const currentHash = await hashScoreDocument( document );
  if ( document.scoreID !== identity.scoreID
    || document.revision !== identity.revision
    || currentHash !== identity.contentHash ) {
    throw new PairSaveError( 'recovery', 'The document changed after its canonical save; save the new revision before exporting its projection.' );
  }
  const { projection, saved } = await projectionStage( {
    document, identity, requestProjection, saveProjection, kind
  } );
  return Object.freeze( {
    status: 'complete', canonicalSaved: true, projectionSaved: true,
    identity, projection, projectionResult: saved
  } );
}
