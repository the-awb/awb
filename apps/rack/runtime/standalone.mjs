import {startRuntime} from './shell-runtime.mjs';
const runtime=await startRuntime({runtimeDirectory:process.env.AWB_RACK_DATA??'/private/tmp/awb-rack-data/view',httpPort:Number(process.env.PORT??0)});
console.log(runtime.url);for(const signal of ['SIGINT','SIGTERM'])process.on(signal,async()=>{await runtime.stop();process.exit(0);});
