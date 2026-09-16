import test from 'node:test';
import assert from 'node:assert/strict';
import { LaunchRouter } from '../src/launchRouter.mjs';
import { ViewRegistry } from '../src/viewRegistry.mjs';

const tool = { id: 'score-studio', name: 'Score Studio', view: { allowMultiple: true }, launchProfiles: [ { id: 'standalone' } ] };
test( 'ToolSessions are idempotent while distinct and standalone sessions coexist', async () => {
  const registry = new ViewRegistry();
  const created = []; const focused = [];
  const router = new LaunchRouter( { tools: new Map( [ [ tool.id, tool ] ] ), registry,
    createView: async ( record ) => created.push( record ), focusView: async ( id ) => focused.push( id ) } );
  const first = await router.launch( { toolID: tool.id, toolSessionID: 'session-a' } );
  const repeated = await router.launch( { toolID: tool.id, toolSessionID: 'session-a' } );
  const second = await router.launch( { toolID: tool.id, toolSessionID: 'session-b' } );
  await router.launch( { toolID: tool.id } ); await router.launch( { toolID: tool.id } );
  assert.equal( first.status, 'accepted' ); assert.equal( repeated.status, 'focused-existing' );
  assert.equal( repeated.viewID, first.viewID ); assert.equal( second.status, 'accepted' );
  assert.equal( created.length, 4 ); assert.deepEqual( focused, [ first.viewID ] );
} );

test( 'owner state is kept per view', () => {
  const registry = new ViewRegistry();
  registry.add( { viewID: 'a', toolID: tool.id, toolSessionID: 'one', owner: { kind: 'attached-process', pid: 1 } } );
  registry.add( { viewID: 'b', toolID: tool.id, toolSessionID: 'two', owner: { kind: 'attached-process', pid: 2 } } );
  registry.update( 'a', { lifecycle: 'closing', ownerError: 'owner-lost' } );
  assert.equal( registry.get( 'a' ).lifecycle, 'closing' );
  assert.equal( registry.get( 'b' ).lifecycle, 'requested' );
} );
