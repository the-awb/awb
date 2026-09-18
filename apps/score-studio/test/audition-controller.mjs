import assert from 'node:assert/strict';
import {
  createAuditionController, createStandaloneAuditionAdapter
} from '../src/engine/AuditionController.js';
import { expandScEventParams, scRef } from '../src/engine/scEventSemantics.js';
import { formatScSymbol, formatScValue, parseScValue } from '../src/engine/scValueSyntax.js';
import { synthDefDraftValues } from '../src/engine/synthDefDraftValues.js';

const expanded = expandScEventParams( {
  freq: [ 55, 82.5, 110 ], pan: [ -1, 1 ], amp: 0.1,
  env: scRef( [ 0, 1, 0 ] )
} );
assert.deepEqual( expanded, [
  { freq: 55, pan: -1, amp: 0.1, env: [ 0, 1, 0 ] },
  { freq: 82.5, pan: 1, amp: 0.1, env: [ 0, 1, 0 ] },
  { freq: 110, pan: -1, amp: 0.1, env: [ 0, 1, 0 ] }
] );
assert.equal( formatScValue( scRef( [ 1, 2 ] ) ), 'Ref([1,2])' );
assert.deepEqual( parseScValue( 'Ref([1, 2])' ), scRef( [ 1, 2 ] ) );
assert.equal( formatScSymbol( '\\\\substrate' ), '\\substrate' );

const sent = [];
let reply;
const standalone = createStandaloneAuditionAdapter( {
  sendOsc: ( address, args ) => sent.push( { address, args } ),
  subscribeOscReply: ( listener ) => { reply = listener; return () => {}; },
  parseOsc: ( value ) => value,
  nodeIDStart: 9000
} );
const hostedState = { audition: { realizations: [] } };
const hosted = {
  subscribe: () => () => {}, getState: () => hostedState,
  auditionPlay: () => { throw new Error( 'not used' ); }, auditionCommand: () => { throw new Error( 'not used' ); },
  auditionSet: () => { throw new Error( 'not used' ); }
};
const controller = createAuditionController( { hostedClient: hosted, standaloneAdapter: standalone } );
const result = await controller.play( {
  mode: 'standalone', definition: 'test', contextID: 'instrument:test', draftID: 'draft-1',
  params: { freq: [ 55, 82.5, 110 ], pan: [ -1, 1 ], amp: 0.1, gate: 1,
    env: [ 0, 1, 0 ] },
  model: { controls: [ { name: 'env', numChannels: 3 } ] }
} );
assert.deepEqual( result.nodeIDs, [ 9000, 9001, 9002 ] );
assert.deepEqual( controller.getState().realizations.at( -1 ).params.freq, [ 55, 82.5, 110 ] );
assert.deepEqual( synthDefDraftValues( {
  controls: [ { name: 'freq', default: 440 }, { name: 'amp', default: 0.5 } ]
}, controller.getState().realizations.at( -1 ).params ), {
  freq: [ 55, 82.5, 110 ], amp: 0.1
} );
assert.equal( sent.filter( ( message ) => message.address === '/s_new' ).length, 3 );
assert.equal( sent.filter( ( message ) => message.address === '/n_setn' ).length, 3 );
assert.deepEqual( sent.filter( ( message ) => message.address === '/s_new' )[ 2 ].args.slice( 4 ),
  [ 'freq', 110, 'pan', -1, 'amp', 0.1, 'gate', 0 ] );

await controller.setControl( result.realizationID, 'freq', [ 60, 90 ], 1 );
assert.deepEqual( sent.filter( ( message ) => message.address === '/n_set' ).slice( -3 ).map(
  ( message ) => message.args
), [ [ 9000, 'freq', 60 ], [ 9001, 'freq', 90 ], [ 9002, 'freq', 60 ] ],
'scalar controls wrap across the existing voices' );
await controller.setControl( result.realizationID, 'env', [ 0, 0.5, 0 ], 3 );
assert.equal( sent.filter( ( message ) => message.address === '/n_setn' ).length, 6,
  'literal array controls update every existing voice with n_setn' );
assert.deepEqual( controller.getState().realizations.at( -1 ).params.freq, [ 60, 90 ] );

const allocationOrder = controller.getState().realizations.map( ( item ) => item.realizationID );
await controller.setControl( result.realizationID, 'freq', 123, 1, 9001 );
assert.deepEqual( sent.filter( ( message ) => message.address === '/n_set' ).at( -1 ).args,
  [ 9001, 'freq', 123 ], 'a selected voice receives its own set message' );
await controller.command( result.realizationID, 'pause', 9001 );
assert.deepEqual( sent.filter( ( message ) => message.address === '/n_run' ).at( -1 ).args,
  [ 9001, 0 ], 'a selected voice receives its own lifecycle command' );
assert.deepEqual( controller.getState().realizations.map( ( item ) => item.realizationID ), allocationOrder,
  'voice state changes preserve realization allocation order' );
assert.equal( controller.getState().realizations.at( -1 ).voiceStates[ 9001 ], 'paused' );

await controller.command( result.realizationID, 'pause' );
assert.equal( sent.filter( ( message ) => message.address === '/n_run' && message.args[ 1 ] === 0 ).length, 4 );
reply( { address: '/n_end', arguments: [ 9000 ] } );
assert.equal( controller.getState().realizations.at( -1 ).nodeIDs.length, 2 );
await controller.stopDraft( 'draft-1' );
assert.equal( sent.filter( ( message ) => message.address === '/n_free' ).length, 2 );
reply( { address: '/n_end', arguments: [ 9001 ] } );
reply( { address: '/n_end', arguments: [ 9002 ] } );
assert.equal( controller.getState().realizations.length, 0,
  'completed auditions leave the live audition panel' );

console.log( 'audition-controller: pass' );
