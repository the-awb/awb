import assert from 'node:assert/strict';
import { createScEngine } from '../src/core/index.js';

const passes = [];
const pass = ( label ) => passes.push( `  PASS  ${ label }` );

const engine = createScEngine( { importScsynth: async () => null } );
const initial = engine.getState();
assert.ok( Object.isFrozen( initial ) );
assert.strictEqual( engine.getState(), initial );
assert.deepEqual( initial, {
  isBooted: false,
  status: 'idle',
  audioContextState: 'unavailable',
  error: null,
  log: [],
  nodes: {}
} );
pass( 'getState returns one stable frozen initial snapshot' );

const nodesEngine = createScEngine();
assert.equal( nodesEngine.playSynth( 'test', { freq: 42 } ), 2000 );
assert.deepEqual( nodesEngine.getState().nodes, {
  test: { id: 2000, paused: false, released: false, params: { freq: 42 } }
} );
assert.ok( Object.isFrozen( nodesEngine.getState().nodes ) );
assert.ok( Object.isFrozen( nodesEngine.getState().nodes.test ) );
assert.ok( Object.isFrozen( nodesEngine.getState().nodes.test.params ) );
assert.equal( nodesEngine.setSynth( 'test', { freq: 84, amp: 0.1 } ), true );
assert.deepEqual( nodesEngine.getState().nodes.test.params, { freq: 84, amp: 0.1 } );
assert.equal( nodesEngine.setSynthArray( 'test', 'env', [ 0, 1, 2 ] ), true );
assert.deepEqual( nodesEngine.getState().nodes.test.params.env, [ 0, 1, 2 ] );
assert.throws( () => nodesEngine.setSynthArray( 'test', 'env', [ 0, Number.NaN ] ), /finite numeric/ );
assert.equal( nodesEngine.pauseSynth( 'test' ), true );
assert.equal( nodesEngine.getState().nodes.test.paused, true );
assert.equal( nodesEngine.resumeSynth( 'test' ), true );
assert.equal( nodesEngine.releaseSynth( 'test' ), true );
assert.equal( nodesEngine.getState().nodes.test.released, true );
assert.equal( nodesEngine.releaseSynth( 'test' ), false );
assert.equal( nodesEngine.setSynth( 'test', { freq: 21 } ), false );
assert.equal( nodesEngine.freeSynth( 'test' ), true );
assert.deepEqual( nodesEngine.getState().nodes, {} );
await nodesEngine.dispose();
pass( 'node commands preserve identity and update an immutable external-store snapshot' );

let notifications = 0;
const unsubscribe = engine.subscribe( () => { notifications++; } );
globalThis.window = { crossOriginIsolated: false };
const originalConsoleError = console.error;
console.error = () => {};
try {
  assert.equal( await engine.boot(), null );
} finally {
  console.error = originalConsoleError;
  delete globalThis.window;
}
assert.notStrictEqual( engine.getState(), initial );
assert.equal( engine.getState().status, 'failed' );
assert.match( engine.getState().error, /cross-origin isolated/ );
assert.ok( notifications >= 2 );
pass( 'state changes replace the snapshot and notify subscribers' );

unsubscribe();
const notificationsAfterUnsubscribe = notifications;
await engine.shutdown();
assert.equal( notifications, notificationsAfterUnsubscribe );
assert.equal( engine.getState().status, 'idle' );
pass( 'unsubscribe stops state notifications' );

const firstDispose = engine.dispose();
const secondDispose = engine.dispose();
assert.strictEqual( secondDispose, firstDispose );
await firstDispose;
await assert.rejects( () => engine.boot(), /engine is disposed/ );
assert.equal( engine.subscribe( () => { throw new Error( 'must not subscribe' ); } )(), undefined );
pass( 'dispose is idempotent and permanently closes the core' );

console.log( `\n${ passes.join( '\n' ) }\n\n${ passes.length }/${ passes.length } passed.` );
