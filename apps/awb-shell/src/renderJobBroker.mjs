import crypto from 'node:crypto';
import { createResolvedRenderJob, getRenderFrameCount } from '@awb/render-pipeline';

const ACTIVE_STATES = new Set( [ 'preparing', 'rendering', 'finalising', 'cancel-requested' ] );
const TERMINAL_STATES = new Set( [ 'completed', 'failed', 'cancelled' ] );
const PHASES = new Set( [ 'preparing', 'rendering', 'finalising' ] );

const jsonSnapshot = ( value, label, maxBytes ) => {
  let text;
  try { text = JSON.stringify( value ); }
  catch { throw new TypeError( `${ label } must be JSON-serializable.` ); }
  if ( text === undefined ) throw new TypeError( `${ label } must be JSON-serializable.` );
  if ( Buffer.byteLength( text ) > maxBytes ) throw new RangeError( `${ label } is too large.` );
  return JSON.parse( text );
};

const boundedError = ( value ) => {
  const message = typeof value === 'string' ? value : value?.message;
  if ( typeof message !== 'string' || !message.trim() ) throw new TypeError( 'Render error must be a non-empty string.' );
  return message.slice( 0, 2048 );
};

const validReceiptOutput = ( output ) => output && typeof output === 'object'
  && !Array.isArray( output ) && typeof output.locator === 'string' && output.locator.length > 0;

const publicRecord = ( record ) => Object.freeze( {
  renderID: record.renderID,
  requestedByToolID: record.requestedByToolID,
  requestedByViewID: record.requestedByViewID,
  jobHash: record.job.contentHash,
  producer: Object.freeze( { kind: record.job.producer.kind, version: record.job.producer.version } ),
  executionTarget: record.executionTarget,
  executorID: record.executorID,
  status: record.status,
  phase: record.phase,
  completedFrames: record.completedFrames,
  totalFrames: record.totalFrames,
  cancelRequested: record.cancelRequested,
  attempt: record.attempt,
  createdAt: record.createdAt,
  updatedAt: record.updatedAt,
  error: record.error
} );

export class RenderJobBroker {
  #records = new Map();
  #listeners = new Set();

  constructor( {
    idFactory = () => crypto.randomUUID(),
    leaseFactory = () => crypto.randomUUID(),
    now = () => new Date().toISOString(),
    maxQueuedPerTool = 16,
    maxRetainedJobs = 256
  } = {} ) {
    this.idFactory = idFactory;
    this.leaseFactory = leaseFactory;
    this.now = now;
    this.maxQueuedPerTool = maxQueuedPerTool;
    this.maxRetainedJobs = maxRetainedJobs;
  }

  subscribe( listener ) {
    this.#listeners.add( listener );
    return () => this.#listeners.delete( listener );
  }

  #emit() { for ( const listener of this.#listeners ) listener( this.list() ); }

  #replace( record, patch ) {
    const next = Object.freeze( { ...record, ...patch, updatedAt: this.now() } );
    this.#records.set( record.renderID, next );
    this.#emit();
    return next;
  }

  #record( renderID ) {
    const record = this.#records.get( renderID );
    if ( !record ) throw new Error( `Unknown render job: ${ renderID }.` );
    return record;
  }

  #ownedByTool( toolID, renderID ) {
    const record = this.#record( renderID );
    if ( record.requestedByToolID !== toolID ) throw new Error( 'Render job belongs to another tool.' );
    return record;
  }

  #leased( executorID, renderID, leaseID ) {
    const record = this.#record( renderID );
    if ( record.executorID !== executorID || record.leaseID !== leaseID ) {
      throw new Error( 'Render executor lease does not match.' );
    }
    return record;
  }

  submit( { requestedByToolID, requestedByViewID, job: inputJob, executionTarget = 'local' } ) {
    if ( executionTarget !== 'local' ) throw new Error( 'Only the local render target is currently available.' );
    const queued = [ ...this.#records.values() ].filter( ( record ) =>
      record.requestedByToolID === requestedByToolID && !TERMINAL_STATES.has( record.status )
    ).length;
    if ( queued >= this.maxQueuedPerTool ) throw new Error( 'This tool has too many outstanding render jobs.' );
    if ( this.#records.size >= this.maxRetainedJobs ) throw new Error( 'The shell render history is full.' );
    const job = createResolvedRenderJob( jsonSnapshot( inputJob, 'Render job', 1024 * 1024 ) );
    const renderID = this.idFactory();
    if ( typeof renderID !== 'string' || !renderID || this.#records.has( renderID ) ) {
      throw new Error( 'Render job id factory returned an invalid id.' );
    }
    const timestamp = this.now();
    const record = Object.freeze( {
      renderID, requestedByToolID, requestedByViewID, job, executionTarget,
      executorID: null, leaseID: null, status: 'queued', phase: 'queued',
      completedFrames: 0, totalFrames: getRenderFrameCount( job ),
      cancelRequested: false, attempt: 0, createdAt: timestamp, updatedAt: timestamp,
      receipt: null, error: null
    } );
    this.#records.set( renderID, record );
    this.#emit();
    return publicRecord( record );
  }

  claim( executorID, { producerKinds = [] } = {} ) {
    if ( typeof executorID !== 'string' || !executorID ) throw new TypeError( 'executorID is required.' );
    const accepted = new Set( producerKinds );
    const record = [ ...this.#records.values() ].find( ( candidate ) =>
      candidate.status === 'queued'
      && candidate.executionTarget === 'local'
      && ( accepted.size === 0 || accepted.has( candidate.job.producer.kind ) )
    );
    if ( !record ) return null;
    const leaseID = this.leaseFactory();
    const next = this.#replace( record, { executorID, leaseID, status: 'preparing', phase: 'preparing',
      attempt: record.attempt + 1 } );
    return Object.freeze( { ...publicRecord( next ), leaseID, job: next.job } );
  }

  progress( executorID, renderID, leaseID, update ) {
    const record = this.#leased( executorID, renderID, leaseID );
    if ( !ACTIVE_STATES.has( record.status ) ) throw new Error( `Cannot update a ${ record.status } render job.` );
    if ( !PHASES.has( update?.phase ) ) throw new Error( 'Unknown render progress phase.' );
    const completedFrames = Number( update.completedFrames );
    const totalFrames = Number( update.totalFrames );
    if ( !Number.isInteger( completedFrames ) || completedFrames < record.completedFrames
      || completedFrames > record.totalFrames || totalFrames !== record.totalFrames ) {
      throw new Error( 'Render progress is inconsistent with the resolved job.' );
    }
    const status = record.cancelRequested ? 'cancel-requested' : update.phase;
    return publicRecord( this.#replace( record, { status, phase: update.phase, completedFrames } ) );
  }

  complete( executorID, renderID, leaseID, inputReceipt ) {
    const record = this.#leased( executorID, renderID, leaseID );
    if ( record.cancelRequested || !ACTIVE_STATES.has( record.status ) ) {
      throw new Error( `Cannot complete a ${ record.status } render job.` );
    }
    const receipt = jsonSnapshot( inputReceipt, 'Render receipt', 64 * 1024 );
    if ( receipt.status !== 'completed' || receipt.jobHash !== record.job.contentHash
      || receipt.frameCount !== record.totalFrames || receipt.executor !== record.executionTarget
      || receipt.producer?.kind !== record.job.producer.kind
      || receipt.producer?.version !== record.job.producer.version
      || typeof receipt.pipelineVersion !== 'string' || !receipt.pipelineVersion
      || !validReceiptOutput( receipt.output ) ) {
      throw new Error( 'Render receipt does not match the executor lease and resolved job.' );
    }
    const next = this.#replace( record, { status: 'completed', phase: 'completed',
      completedFrames: record.totalFrames, receipt: Object.freeze( receipt ), leaseID: null } );
    return Object.freeze( { ...publicRecord( next ), receipt: next.receipt } );
  }

  fail( executorID, renderID, leaseID, error, { retryable = false } = {} ) {
    const record = this.#leased( executorID, renderID, leaseID );
    if ( !ACTIVE_STATES.has( record.status ) ) throw new Error( `Cannot fail a ${ record.status } render job.` );
    const message = boundedError( error );
    if ( retryable && !record.cancelRequested ) {
      return publicRecord( this.#replace( record, { status: 'queued', phase: 'queued',
        executorID: null, leaseID: null, completedFrames: 0, error: message } ) );
    }
    return publicRecord( this.#replace( record, { status: record.cancelRequested ? 'cancelled' : 'failed',
      phase: record.cancelRequested ? 'cancelled' : 'failed', leaseID: null, error: message } ) );
  }

  requestCancel( renderID ) {
    const record = this.#record( renderID );
    if ( TERMINAL_STATES.has( record.status ) ) throw new Error( `Cannot cancel a ${ record.status } render job.` );
    if ( record.status === 'queued' ) {
      return publicRecord( this.#replace( record, { status: 'cancelled', phase: 'cancelled', cancelRequested: true } ) );
    }
    return publicRecord( this.#replace( record, { status: 'cancel-requested', cancelRequested: true } ) );
  }

  cancelled( executorID, renderID, leaseID ) {
    const record = this.#leased( executorID, renderID, leaseID );
    if ( !record.cancelRequested ) throw new Error( 'Render cancellation was not requested.' );
    return publicRecord( this.#replace( record, { status: 'cancelled', phase: 'cancelled', leaseID: null } ) );
  }

  releaseExecutor( executorID ) {
    let changed = false;
    for ( const record of this.#records.values() ) {
      if ( record.executorID !== executorID || !ACTIVE_STATES.has( record.status ) ) continue;
      const cancelled = record.cancelRequested;
      this.#records.set( record.renderID, Object.freeze( { ...record,
        executorID: null, leaseID: null, completedFrames: 0,
        status: cancelled ? 'cancelled' : 'queued', phase: cancelled ? 'cancelled' : 'queued',
        error: cancelled ? record.error : 'Executor disconnected; job returned to queue.',
        updatedAt: this.now() } ) );
      changed = true;
    }
    if ( changed ) this.#emit();
    return changed;
  }

  getForTool( toolID, renderID ) {
    const record = this.#ownedByTool( toolID, renderID );
    return Object.freeze( { ...publicRecord( record ), receipt: record.receipt } );
  }

  list( toolID = null ) {
    return Object.freeze( [ ...this.#records.values() ]
      .filter( ( record ) => toolID === null || record.requestedByToolID === toolID )
      .map( publicRecord ) );
  }
}
