import {createWebGLRack} from './diagnostic-webgl.mjs';
import {createWorkerRack} from './diagnostic-worker-host.mjs';
import {createCanvas2DRack} from './diagnostic-canvas2d.mjs';
export function createCanvasRack(host,options){const variant=window.__rackDiagnosticVariant||'webgl';return (variant==='worker'?createWorkerRack:variant==='canvas2d'?createCanvas2DRack:createWebGLRack)(host,options);}
