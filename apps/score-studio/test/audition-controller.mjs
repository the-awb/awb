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
  auditionPlay: () => { throw new Error( 'not used' ); }, auditionCommand: () => { throw new Error( 'not used' ); }
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

await controller.command( result.realizationID, 'pause' );
assert.equal( sent.filter( ( message ) => message.address === '/n_run' && message.args[ 1 ] === 0 ).length, 3 );
reply( { address: '/n_end', arguments: [ 9000 ] } );
assert.equal( controller.getState().realizations.at( -1 ).nodeIDs.length, 2 );
await controller.stopDraft( 'draft-1' );
assert.equal( sent.filter( ( message ) => message.address === '/n_free' ).length, 2 );
reply( { address: '/n_end', arguments: [ 9001 ] } );
reply( { address: '/n_end', arguments: [ 9002 ] } );
assert.equal( controller.getState().realizations.length, 0,
  'completed auditions leave the live audition panel' );

console.log( 'audition-controller: pass' );
