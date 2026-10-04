import test from 'node:test';
import assert from 'node:assert/strict';
import dgram from 'node:dgram';
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import { mkdtemp, rm, appendFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const require = createRequire( import.meta.url );
const electron = require( 'electron' );
const native = require('../../../tool-artifacts/shared-loop/0.1.0/build/loopview.node');
const {OSC} = await import('../../../tool-artifacts/shared-loop/0.1.0/osc.mjs');
const appRoot = fileURLToPath( new URL( '..', import.meta.url ) );
async function availablePort() {
 const socket=dgram.createSocket('udp4');
 await new Promise((resolve,reject)=>{socket.once('error',reject);socket.bind(0,'127.0.0.1',resolve);});
 const port=socket.address().port;await new Promise(resolve=>socket.close(resolve));return port;
}
test( 'Toolkit Home launches the shared looper and it uses the shell SC and closure preserves the host', { timeout: 90000 }, async () => {
  const userData = await mkdtemp( path.join( os.tmpdir(), 'awb-shared-loop-' ) );
  const oscPort=await availablePort(),serverPort=await availablePort();
  const env = { ...process.env, ELECTRON_DISABLE_SECURITY_WARNINGS: 'true', AWB_HEADLESS_SERVER_PORT: String(serverPort) };
  delete env.ELECTRON_RUN_AS_NODE;
  let output = '';
  const child = spawn( electron, [ path.join( appRoot, 'shell/main.mjs' ), '--smoke-shared-loop',
    ...(process.env.AWB_SHARED_LOOP_ASSESS ? ['--smoke-assess'] : []), `--osc-port=${oscPort}`, `--user-data-dir=${ userData }`, '--smoke-screenshot=/private/tmp/awb-shared-loop.png' ], { cwd: appRoot, env, stdio: [ 'ignore', 'pipe', 'pipe' ] } );
  child.stdout.on( 'data', ( b ) => { output += b; appendFile('/private/tmp/awb-shared-loop-live.log',b).catch(()=>{}); } ); child.stderr.on( 'data', ( b ) => { output += b; appendFile('/private/tmp/awb-shared-loop-live.log',b).catch(()=>{}); } );
  try {
    const exitCode = await new Promise( ( resolve, reject ) => { child.once( 'exit', resolve ); child.once( 'error', reject ); } );
    assert.equal( exitCode, 0, output );
    assert.match( output, /AWB_SHARED_LOOP_READY controls=record,overdub,stop waveform=shared-memory shared-host=true host-survives=true sampleRate=\d+ hostServices=1/ );
    console.log(output.match(/AWB_SHARED_LOOP_READY[^\n]+/)[0]);
    assert.match(output,/AWB_SHARED_SCOPES_READY sources=hardware-input-1,hardware-output-1-2,control-bus windows=3 isolated-close=true zoom=1\/16-8 pan=true transport=binary-v5 unrelated-tools=0/);
    console.log(output.match(/AWB_SHARED_SCOPES_READY[^\n]+/)[0]);
    assert.match(output,/AWB_SIGNAL_ENGINE_READY shared-capture=true raw-pcm-isolated=true demand=true peer-survives=true last-release=true/);
    console.log(output.match(/AWB_SIGNAL_ENGINE_READY[^\n]+/)[0]);
    assert.equal(output.match(/AWB_SHARED_SCOPE_WIDE /g)?.length,3);
    assert.equal(output.match(/AWB_SCOPE_SLIDERS_READY /g)?.length,3);
    console.log(output.match(/AWB_SCOPE_SLIDERS_READY [^\n]+/g).join('\n'));
    assert.match(output,/AWB_SCOPE_CADENCE_READY capture=unchanged rates=/);
    console.log(output.match(/AWB_SCOPE_CADENCE_READY[^\n]+/)[0]);
    assert.match(output,/AWB_CONTROL_SINGLE_TRACE_READY {"format":"samples","frames":512,"paths":6,"closed":0}/);
    console.log(output.match(/AWB_CONTROL_SINGLE_TRACE_READY[^\n]+/)[0]);
    assert.match(output,/AWB_CONTROL_ARRAY_READY lfos=1,10 noise=1,5,20,100 channels=6 selector=all,noise,slow,fast/);
    assert.match(output,/AWB_SCOPE_SELECTION_READY masks=0;1;2,3,4,5;0,1,2,3,4,5 frozen-subset=true/);
    console.log(output.match(/AWB_CONTROL_ARRAY_READY[^\n]+/)[0]);
    console.log(output.match(/AWB_SHARED_SCOPE_WIDE [^\n]+/g).join('\n'));
    if(process.env.AWB_SHARED_LOOP_ASSESS)console.log(output.match(/AWB_SHARED_LOOP_ASSESS[^\n]+/)?.[0]);
    const active=output.match(/AWB_SHARED_LOOP_QUIT_ACTIVE sharedId=(\d+) serverPort=(\d+)/);
    assert.ok(active,'Active-instrument quit check missing');
    assert.throws(()=>native.attach(Number(active[1])),/Shared region unavailable/);
    const osc=new OSC(Number(active[2]));
    try {await assert.rejects(osc.request('/status',[],'/status.reply',()=>true,500),/timed out/);}
    finally {osc.close();}
  } finally { if ( child.exitCode === null ) child.kill( 'SIGKILL' ); await rm( userData, { recursive: true, force: true } ); }
} );
