import test from 'node:test';
import assert from 'node:assert/strict';
import { ServiceRegistry } from '../src/serviceRegistry.mjs';

test( 'a shared service closes only after its final view releases it', async () => {
  let created = 0; let closed = 0;
  const registry = new ServiceRegistry( async () => ( { port: ++created, close: async () => { closed += 1; } } ) );
  const first = await registry.acquire( { oscPort: 57120, allowedPrefixes: [ '/tool/' ] } );
  const second = await registry.acquire( { oscPort: 57120, allowedPrefixes: [ '/tool/' ] } );
  assert.equal( created, 1 ); assert.equal( registry.snapshot()[ 0 ].references, 2 );
  await first.release(); assert.equal( closed, 0 ); await second.release(); assert.equal( closed, 1 );
} );
