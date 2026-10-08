import test from 'node:test';
import assert from 'node:assert/strict';
import {defaults,command,validate} from '../../../tool-artifacts/buffer-views/0.1.0/network-model.mjs';

test('every delay input accepts 0–100 percent and rejects excessive edits atomically',()=>{
 for(const cell of defaults().cells){
  for(const value of [0,.5,1]){const result=command(defaults(),{action:'cell',cell:cell.id,field:'inputGain',value});assert.equal(result.config.cells.find(c=>c.id===cell.id).inputGain,value);}
  for(const value of [-.01,1.001,2]){const before=defaults(),snapshot=structuredClone(before);assert.throws(()=>command(before,{action:'cell',cell:cell.id,field:'inputGain',value}),/Input must be 0–1/);assert.deepEqual(before,snapshot);}
 }
});
test('loaded delay configurations enforce the same input limit',()=>{const c=defaults();c.cells[0].inputGain=2;assert.throws(()=>validate(c),/Input must be 0–1/);});
test('input limits retain record/overdub transport',()=>{const c=defaults();for(const mode of ['record','overdub','hold','off'])assert.doesNotThrow(()=>command(c,{action:'mode',cell:'B1',value:mode}));});
