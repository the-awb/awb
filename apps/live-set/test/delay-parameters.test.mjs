import test from 'node:test';import assert from 'node:assert/strict';import {attachDelayParameters} from '../src/delay-parameters.mjs';import {delayKnobID,delayKnobIDs} from '../src/delay-param-bindings.mjs';import {createStore} from '../../param/src/model.mjs';
test('all eight rotary controls map to stable AWBase IDs',()=>{assert.deepEqual(delayKnobIDs('B1'),['b1/inOf','b1/dryOf','b1/fxOf','b1/fbOf','b1/h1Amount','b1/h2Amount','b1/h3Amount','b1/h4Amount']);assert.equal(delayKnobID('B1','feedback'),'b1/fbOf');assert.equal(delayKnobID('B1','amount','h3'),'b1/h3Amount');assert.equal(delayKnobID('bad','feedback'),null);assert.equal(delayKnobID('B1','amount','h5'),null)});
test('borrowed panel validates origin, window, session and cell before editing; detach unsubscribes',()=>{
 const host=new EventTarget(),frame=new EventTarget(),messages=[],edits=[],visibility=[];frame.contentWindow={postMessage:m=>messages.push(m)};
 globalThis.window=host;globalThis.requestAnimationFrame=f=>setTimeout(f,0);globalThis.cancelAnimationFrame=clearTimeout;
 const s=createStore({id:'b1/fbOf',base:.5,min:0,max:1.1,amount:.2,routes:[]});s.observe([.5,.2,.6]);const stores=new Map([['b1/fbOf',s]]);
 const adapter=attachDelayParameters(frame,'http://127.0.0.1:1234/?view=tape%3AB1','B1',{stores,connected:true,edit:(...args)=>edits.push(args),onVisible:v=>visibility.push(v)});
 const receive=(data,origin='http://127.0.0.1:1234',source=frame.contentWindow)=>{const e=new Event('message');Object.assign(e,{data,origin,source});host.dispatchEvent(e)};
 receive({type:'awb:delay-param-hello',session:'ok'},'http://127.0.0.1:9999');assert.equal(messages.length,1);
 receive({type:'awb:delay-param-hello',session:'ok'});assert.equal(messages.at(-1).params[0].metadata.id,'b1/fbOf');assert.deepEqual(messages.at(-1).params[0].values,[.5,.2,.6]);
 const edit={type:'awb:delay-param-edit',session:'ok',id:'b1/fbOf',field:'amount',value:-.4};receive(edit,undefined,{});receive({...edit,session:'wrong'});receive({...edit,id:'b2/fbOf'});assert.equal(edits.length,0);
 receive(edit);assert.deepEqual(edits,[['b1/fbOf','amount',-.4,'']]);receive({type:'awb:delay-param-visible',session:'ok',visible:true,ids:['b1/fbOf','b2/fbOf']});assert.deepEqual(visibility.at(-1),['b1/fbOf']);
 adapter.close();const count=messages.length;s.patch({base:.7});s.observe([.7,.2,.8]);receive(edit);assert.equal(messages.length,count);assert.equal(edits.length,1);assert.deepEqual(visibility.at(-1),[]);adapter.close();
 delete globalThis.window;delete globalThis.requestAnimationFrame;delete globalThis.cancelAnimationFrame;
});
