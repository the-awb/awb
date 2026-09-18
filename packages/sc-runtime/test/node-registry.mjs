#!/usr/bin/env node
import assert from 'node:assert/strict';
import { createNodeRegistry } from '../src/nodeRegistry.js';

const registry = createNodeRegistry();
const changes = [];
const unsubscribe = registry.subscribe( ( change ) => changes.push( change ), { emitSnapshot: true } );

assert.deepEqual( changes[ 0 ].snapshot, { sequence: 0, records: [], containers: [] } );
registry.upsertContainer( { containerID: 'score:one', kind: 'score', name: 'One' } );
registry.upsertContainer( { containerID: 'run:one', kind: 'run', parentID: 'score:one' } );
registry.register( { nodeID: 41, realizationID: 'run:note:1', entryID: 'note',
  memberships: [ 'score:one', 'run:one' ], params: { freq: 220 } } );
registry.transition( 41, 'paused' );
registry.update( 41, { params: { freq: 330 } }, 'set' );
registry.removeMembership( 41, 'run:one' );
registry.addMembership( 41, 'run:one' );
const terminal = registry.end( 41, 'naturalEnd' );

assert.equal( terminal.state, 'ended' );
assert.equal( terminal.endReason, 'naturalEnd' );
assert.equal( registry.size, 0 );
assert.equal( registry.snapshot().sequence, 8 );
assert.deepEqual( changes.slice( 1 ).map( ( change ) => change.type ),
  [ 'containerUpserted', 'containerUpserted', 'started', 'paused', 'set',
    'membershipRemoved', 'membershipAdded', 'naturalEnd' ] );
assert.deepEqual( changes.slice( 1 ).map( ( change ) => change.sequence ), [ 1, 2, 3, 4, 5, 6, 7, 8 ] );
assert.equal( changes.at( -1 ).record.params.freq, 330 );
assert.throws( () => registry.register( {} ), /nodeID/ );

registry.register( { nodeID: 42, realizationID: 'a' } );
assert.throws( () => registry.register( { nodeID: 42, realizationID: 'b' } ), /already registered/ );
assert.equal( registry.clear( 'disposed' ), 1 );
assert.equal( changes.at( -1 ).record.endReason, 'disposed' );
assert.equal( registry.removeContainer( 'run:one' ), true );
assert.equal( registry.snapshot().containers.length, 1 );
unsubscribe();

console.log( 'node-registry: pass' );
