// Test copies only. Qt gets private clock-free indices; Node retains its own readers.
import {prepare as prepareLayout} from '../layout-bench/prepare.mjs';
import {readFile,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
function replace(s,a,b){if(!s.includes(a))throw new Error('Qt fixture source drift: '+a);return s.replace(a,b);}
export async function prepare(root){
 await prepareLayout(root);
 const path=resolve(root,'tests/component-server.scd');let s=await readFile(path,'utf8');
 s=replace(s,'var buffer, loop, mic, out, control, controlBus, tap, condition;','var buffer, loop, mic, out, control, controlBus, audioBus, tap, condition;');
 s=replace(s,'controlBus = Bus.control(s, 6);','controlBus = Bus.control(s, 6); audioBus = Bus.audio(s, 6);');
 s=replace(s,'|micScope, outScope, controlScope, controlBus|','|micScope, outScope, controlScope, controlBus, audioBus|');
 s=replace(s,'  Out.kr(controlBus,','  Out.ar(audioBus, signals);\n  Out.kr(controlBus,');
 s=replace(s,'\\controlBus, controlBus.index], RootNode(s)','\\controlBus, controlBus.index, \\audioBus, audioBus.index], RootNode(s)');
 s=replace(s,' File.use(output,',' (root +/+ "tests/qt-bench/qt-controls.scd").load.value(s, controlBus, audioBus);\n File.use(output,');
 await writeFile(path,s);
 const gui=resolve(root,'public/scope.js');s=await readFile(gui,'utf8');
 s=replace(s,'function draw(){\n if(fixture.paint)',"let lastPaint=-Infinity;\nfunction draw(now=performance.now()){\n if(fixture.paint&&now-lastPaint>=1000/30-2)");
 s=replace(s,'fixture.frames++;}', 'fixture.frames++;lastPaint=now;}');
 await writeFile(gui,s);
}
