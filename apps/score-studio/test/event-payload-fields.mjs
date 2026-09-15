#!/usr/bin/env node
import assert from 'node:assert/strict';
import { payloadFields, updatePayloadField } from '../src/engine/eventPayloadFields.js';

const substrate = { type: 'note', def: 'substrate', freqA: 36, amp: 0.2, dur: 8 };
const fields = payloadFields( substrate );
assert.equal( fields.find( ( field ) => field.name === 'freqA' )?.declared, true );
assert.equal( fields.find( ( field ) => field.name === 'freqA' )?.unit, ' Hz' );
assert.equal( fields.find( ( field ) => field.name === 'dur' )?.declared, false );
assert.equal( fields.find( ( field ) => field.name === 'amp' )?.kind, 'number' );
assert.equal( payloadFields( { type: 'set', target: '@all', curve: [ 1, 2 ] } )
  .find( ( field ) => field.name === 'curve' )?.kind, 'json' );
assert.equal( updatePayloadField( substrate, 'freqA', '40.5', 'number' ).freqA, 40.5 );
assert.equal( updatePayloadField( substrate, 'flip', true, 'boolean' ).flip, true );
assert.equal( updatePayloadField( substrate, 'dur', '', 'number' ).dur, undefined );
assert.throws( () => updatePayloadField( substrate, 'freqA', 'nope', 'number' ), /finite number/ );

console.log( 'event-payload-fields: 9/9 pass' );
