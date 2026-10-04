import {startHosted} from './server.mjs';
export async function startRuntime({nativeHost,signalCaptures}) {
 // Audio belongs to the shell host; this view owns only its instrument and reader.
 return startHosted({nativeHost,signalCaptures,httpPort:0,seconds:4});
}
