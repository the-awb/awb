import {startScopeRuntime} from './server.mjs';
export async function startRuntime({signalCaptures,getNativeHost}){
 return startScopeRuntime({broker:signalCaptures,getHost:getNativeHost});
}
