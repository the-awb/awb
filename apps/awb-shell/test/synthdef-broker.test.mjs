import test from 'node:test';
import assert from 'node:assert/strict';
import { SynthDefContextBroker } from '../services/synthDefContextBroker.mjs';

test( 'SynthDef broker shares transfers, replays exact data and rejects stale generations', () => {
  const osc = []; const client = [];
  const broker = new SynthDefContextBroker( { sendOsc: ( address, args ) => osc.push( { address, args } ),
    sendClient: ( key, address, args ) => client.push( { key, address, args } ), requestTimeoutMs: 60000 } );
  broker.handleFrame( 'a', { address: '/awb/synthdef/hello', args: [ 'renderer-a', 1001 ] } );
  broker.handleFrame( 'b', { address: '/awb/synthdef/hello', args: [ 'renderer-b', 1002 ] } );
  assert.equal( osc.filter( ( message ) => message.address === '/awb/synthdef/hello' ).length, 1 );
  broker.receive( { address: '/awb/synthdef/connected', args: [ broker.clientID, 1 ] } );
  broker.handleFrame( 'a', { address: '/awb/synthdef/list', args: [ 'renderer-a', 'list-a' ] } );
  broker.handleFrame( 'b', { address: '/awb/synthdef/list', args: [ 'renderer-b', 'list-b' ] } );
  const listRequest = osc.find( ( message ) => message.address === '/awb/synthdef/list' );
  assert.equal( osc.filter( ( message ) => message.address === '/awb/synthdef/list' ).length, 1 );
  const listID = listRequest.args[ 1 ];
  broker.receive( { address: '/awb/synthdef/list/begin', args: [ broker.clientID, listID, 1 ] } );
  broker.receive( { address: '/awb/synthdef/list/item', args: [ broker.clientID, listID, 0, 'uncataloguedVoice' ] } );
  broker.receive( { address: '/awb/synthdef/list/end', args: [ broker.clientID, listID, 1 ] } );
  assert.equal( client.filter( ( message ) => message.address === '/awb/synthdef/list/end' ).length, 2 );
  broker.handleFrame( 'a', { address: '/awb/synthdef/describe', args: [ 'renderer-a', 'desc-a', 'uncataloguedVoice' ] } );
  broker.handleFrame( 'b', { address: '/awb/synthdef/describe', args: [ 'renderer-b', 'desc-b', 'uncataloguedVoice' ] } );
  const descriptions = osc.filter( ( message ) => message.address === '/awb/synthdef/describe' );
  assert.equal( descriptions.length, 1 );
  const descriptionID = descriptions[ 0 ].args[ 1 ]; const hex = '53436766';
  broker.receive( { address: '/awb/synthdef/description/begin', args: [ broker.clientID, descriptionID, 'uncataloguedVoice', 4, 1, 1 ] } );
  broker.receive( { address: '/awb/synthdef/description/chunk', args: [ broker.clientID, descriptionID, 0, hex ] } );
  broker.receive( { address: '/awb/synthdef/description/spec', args: [ broker.clientID, descriptionID, 'freq', 20, 20000, 'named', 'exp', 0, 440, 'Hz' ] } );
  broker.receive( { address: '/awb/synthdef/description/end', args: [ broker.clientID, descriptionID, 'uncataloguedVoice', 4, 1, 1 ] } );
  assert.equal( client.filter( ( message ) => message.address === '/awb/synthdef/description/end' ).length, 2 );
  assert.equal( client.find( ( message ) => message.address === '/awb/synthdef/description/chunk' ).args[ 3 ], hex );
  assert.equal( broker.snapshot().cachedDescriptions, 1 );
  broker.handleFrame( 'a', { address: '/awb/synthdef/describe', args: [ 'renderer-a', 'cached', 'uncataloguedVoice' ] } );
  assert.equal( osc.filter( ( message ) => message.address === '/awb/synthdef/describe' ).length, 1 );
  broker.handleFrame( 'a', { address: '/awb/synthdef/describe', args: [ 'renderer-a', 'late', 'lateVoice' ] } );
  const lateID = osc.at( -1 ).args[ 1 ];
  broker.handleFrame( 'a', { address: '/awb/synthdef/list', args: [ 'renderer-a', 'refresh' ] } );
  const refreshID = osc.at( -1 ).args[ 1 ];
  broker.receive( { address: '/awb/synthdef/list/begin', args: [ broker.clientID, refreshID, 0 ] } );
  broker.receive( { address: '/awb/synthdef/list/end', args: [ broker.clientID, refreshID, 0 ] } );
  broker.receive( { address: '/awb/synthdef/description/begin', args: [ broker.clientID, lateID, 'lateVoice', 4, 1, 0 ] } );
  broker.receive( { address: '/awb/synthdef/description/chunk', args: [ broker.clientID, lateID, 0, hex ] } );
  broker.receive( { address: '/awb/synthdef/description/end', args: [ broker.clientID, lateID, 'lateVoice', 4, 1, 0 ] } );
  assert.equal( client.some( ( message ) => message.address === '/awb/synthdef/description/end'
    && message.args?.[ 1 ] === 'late' ), false );
  assert.equal( client.some( ( message ) => message.address === '/awb/synthdef/error'
    && message.args?.[ 1 ] === 'late' ), true );
  assert.equal( broker.snapshot().cachedDescriptions, 0 ); broker.close();
} );
