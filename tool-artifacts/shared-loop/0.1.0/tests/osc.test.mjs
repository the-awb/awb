import {test} from 'node:test';
import assert from 'node:assert/strict';
import {encode,decode} from '../osc.mjs';
test('OSC protocol preserves server command strings, integers and float controls',()=>{
 const values=['feedback',.375,'node',19001,-1];
 assert.deepEqual(decode(encode('/n_set',values)),{address:'/n_set',args:values});
});
test('Malformed OSC string is rejected',()=>assert.throws(()=>decode(Buffer.from('/broken')),/Invalid OSC/));
