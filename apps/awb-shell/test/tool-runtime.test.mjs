import test from 'node:test';
import assert from 'node:assert/strict';
import { ToolRuntimeRegistry, localRuntimeURL } from '../src/toolRuntimeRegistry.mjs';
const tool = { runtime: { entryPath: '/artifact/runtime.mjs' } };
test( 'view closure stops only its owned runtime, once', async () => {
  const stopped = [], directories = [];
  const registry = new ToolRuntimeRegistry( { runtimeRoot: '/tmp/runtimes', load: async () => ( {
    startRuntime: async ( { runtimeDirectory } ) => { directories.push( runtimeDirectory ); return {
      url: 'http://127.0.0.1:8000/', stop: async () => stopped.push( runtimeDirectory )
    }; }
  } ) } );
  await registry.start( 'a', tool ); await registry.start( 'b', tool );
  await Promise.all( [ registry.release( 'a' ), registry.release( 'a' ) ] );
  assert.deepEqual( stopped, [ '/tmp/runtimes/a' ] );
  await registry.closeAll(); assert.deepEqual( stopped, directories );
} );
test( 'closure during pending startup waits for and stops the runtime', async () => {
  let resolve, stopped = 0;
  const pending = new Promise( ( r ) => { resolve = r; } );
  const registry = new ToolRuntimeRegistry( { runtimeRoot: '/tmp', load: async () => ( {
    startRuntime: () => pending
  } ) } );
  const started = registry.start( 'a', tool ); const closed = registry.release( 'a' );
  resolve( { url: 'http://127.0.0.1:8000', stop: async () => { stopped++; } } );
  await Promise.all( [ assert.rejects( started, /closed during startup/ ), closed ] ); assert.equal( stopped, 1 );
} );
test( 'invalid runtime URLs are refused and the started process is stopped', async () => {
  let stopped = false;
  const registry = new ToolRuntimeRegistry( { runtimeRoot: '/tmp', load: async () => ( {
    startRuntime: async () => ( { url: 'https://example.com', stop: async () => { stopped = true; } } )
  } ) } );
  await assert.rejects( registry.start( 'a', tool ), /127.0.0.1/ ); assert.equal( stopped, true );
  for ( const url of [ 'file:///tmp/tool', 'http://localhost:80', 'http://user:pass@127.0.0.1' ] ) assert.throws( () => localRuntimeURL( url ) );
} );
test( 'static tools start without a runtime or module import', async () => {
  const registry = new ToolRuntimeRegistry( { runtimeRoot: '/tmp', load: () => { throw new Error( 'unexpected import' ); } } );
  assert.equal( await registry.start( 'a', {} ), null ); await registry.closeAll();
} );

test( 'trusted runtime receives shell host context and remains tracked until release completes', async () => {
  let resolve, received;
  const stopped = new Promise( ( done ) => { resolve = done; } );
  const nativeHost = { oscPort: 57120, token: 'shell-token' };
  const registry = new ToolRuntimeRegistry( { runtimeRoot: '/tmp',
    runtimeContext: async ( { tool } ) => { assert.equal( tool.id, 'shared-loop' ); return { nativeHost }; },
    load: async () => ( { startRuntime: async ( context ) => {
      received = context; return { url: 'http://127.0.0.1:8000/', stop: () => stopped };
    } } )
  } );
  await registry.start( 'view', { ...tool, id: 'shared-loop' } );
  assert.equal( received.nativeHost, nativeHost ); assert.equal( registry.has( 'shared-loop' ), true );
  const closing = registry.release( 'view' ); assert.equal( registry.has( 'shared-loop' ), true );
  resolve(); await closing; assert.equal( registry.has( 'shared-loop' ), false );
} );
