import {createRequire} from 'node:module';
import {spawn} from 'node:child_process';
import {fileURLToPath} from 'node:url';
const require=createRequire(import.meta.url),electron=require('electron');
const env={...process.env};delete env.ELECTRON_RUN_AS_NODE;
const child=spawn(electron,[fileURLToPath(new URL('./component-bench.mjs',import.meta.url)),...process.argv.slice(2)],{env,stdio:'inherit'});
child.on('exit',code=>{process.exitCode=code??1;});child.on('error',error=>{console.error(error);process.exitCode=1;});
