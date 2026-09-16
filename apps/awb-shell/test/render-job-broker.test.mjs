import test from 'node:test';
import assert from 'node:assert/strict';
import { RenderJobBroker } from '../src/renderJobBroker.mjs';

const job = {
  schemaVersion: 2,
  contentHash: 'sha256:render-job',
  producer: { kind: 'field', version: '0.1.0', state: { mode: 'analytic-preview' } },
  inputs: [],
  timeline: { cueInSeconds: 0, cueOutSeconds: 1 },
  output: { width: 640, height: 360, fps: 2, format: 'mp4' }
};

const createBroker = () => {
  let id = 0; let lease = 0; let tick = 0;
  return new RenderJobBroker( {
    idFactory: () => `render-${ ++id }`,
    leaseFactory: () => `lease-${ ++lease }`,
    now: () => `2026-09-16T00:00:0${ tick++ }.000Z`
  } );
};

test( 'a headless executor leases a validated job and returns a matching receipt', () => {
  const broker = createBroker();
  const updates = [];
  broker.subscribe( ( snapshot ) => updates.push( snapshot ) );
  const submitted = broker.submit( { requestedByToolID: 'field-modelling',
    requestedByViewID: 'view-a', job } );
  const claimed = broker.claim( 'headless-local-1', { producerKinds: [ 'field' ] } );
  assert.equal( claimed.renderID, submitted.renderID );
  assert.equal( claimed.job.contentHash, job.contentHash );
  broker.progress( 'headless-local-1', claimed.renderID, claimed.leaseID,
    { phase: 'rendering', completedFrames: 1, totalFrames: 2 } );
  broker.progress( 'headless-local-1', claimed.renderID, claimed.leaseID,
    { phase: 'finalising', completedFrames: 2, totalFrames: 2 } );
  const completed = broker.complete( 'headless-local-1', claimed.renderID, claimed.leaseID, {
    schemaVersion: 1, status: 'completed', jobHash: job.contentHash,
    producer: { kind: 'field', version: '0.1.0' }, pipelineVersion: '0.7.0',
    executor: 'local', startedAt: '2026-09-16T00:00:00.000Z',
    completedAt: '2026-09-16T00:00:01.000Z', frameCount: 2, fps: 2,
    output: { locator: 'grant://render-output', fileName: 'field.mp4' }
  } );
  assert.equal( completed.status, 'completed' );
  assert.equal( completed.receipt.output.fileName, 'field.mp4' );
  assert.equal( updates.length, 5 );
} );

test( 'executor leases enforce identity and monotonic frame progress', () => {
  const broker = createBroker();
  broker.submit( { requestedByToolID: 'lissajous', requestedByViewID: 'view-a', job } );
  const claimed = broker.claim( 'headless-local-1' );
  assert.throws( () => broker.progress( 'other-executor', claimed.renderID, claimed.leaseID,
    { phase: 'rendering', completedFrames: 0, totalFrames: 2 } ), /lease does not match/ );
  broker.progress( 'headless-local-1', claimed.renderID, claimed.leaseID,
    { phase: 'rendering', completedFrames: 1, totalFrames: 2 } );
  assert.throws( () => broker.progress( 'headless-local-1', claimed.renderID, claimed.leaseID,
    { phase: 'rendering', completedFrames: 0, totalFrames: 2 } ), /inconsistent/ );
  assert.throws( () => broker.complete( 'headless-local-1', claimed.renderID, claimed.leaseID,
    { status: 'completed', jobHash: 'wrong', frameCount: 2, executor: 'local' } ), /does not match/ );
  assert.throws( () => broker.complete( 'headless-local-1', claimed.renderID, claimed.leaseID, {
    status: 'completed', jobHash: job.contentHash, frameCount: 2, executor: 'local',
    producer: { kind: 'field', version: '0.1.0' }, pipelineVersion: '0.7.0', output: { blob: {} }
  } ), /does not match/ );
} );

test( 'jobs outlive submitting views and recover from executor loss', () => {
  const broker = createBroker();
  const submitted = broker.submit( { requestedByToolID: 'field-modelling',
    requestedByViewID: 'view-that-may-close', job } );
  const claimed = broker.claim( 'headless-local-1' );
  assert.equal( claimed.renderID, submitted.renderID );
  assert.equal( broker.releaseExecutor( 'headless-local-1' ), true );
  assert.equal( broker.getForTool( 'field-modelling', submitted.renderID ).status, 'queued' );
  assert.equal( broker.claim( 'headless-local-2' ).attempt, 2 );
  assert.throws( () => broker.getForTool( 'lissajous', submitted.renderID ), /another tool/ );
} );

test( 'queued and leased cancellation have distinct handshakes', () => {
  const broker = createBroker();
  const queued = broker.submit( { requestedByToolID: 'field-modelling', requestedByViewID: 'a', job } );
  assert.equal( broker.requestCancel( queued.renderID ).status, 'cancelled' );

  const active = broker.submit( { requestedByToolID: 'field-modelling', requestedByViewID: 'b',
    job: { ...job, contentHash: 'sha256:second-job' } } );
  const claimed = broker.claim( 'headless-local-1' );
  assert.equal( claimed.renderID, active.renderID );
  assert.equal( broker.requestCancel( active.renderID ).status, 'cancel-requested' );
  assert.equal( broker.cancelled( 'headless-local-1', active.renderID, claimed.leaseID ).status, 'cancelled' );
} );
