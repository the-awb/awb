import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { createLissajousCore } from '../core/createLissajousCore.js';

export function createLissajousEngine( {
  canvas,
  getNewSamples = null,
  onSessionControls = null,
  pixelRatio = globalThis.devicePixelRatio || 1,
  controls = 'none',
  width = canvas?.clientWidth || canvas?.width || 640,
  height = canvas?.clientHeight || canvas?.height || 360,
  preserveDrawingBuffer = true
} = {} ) {
  if ( !canvas ) throw new Error( 'createLissajousEngine requires a canvas' );
  if ( controls !== 'none' && controls !== 'orbit' ) {
    throw new Error( `Unsupported vanilla controls: ${ controls }` );
  }

  // Match R3F's renderer defaults so the same core object produces the same pixels in either host.
  const renderer = new THREE.WebGLRenderer( {
    canvas,
    alpha: false,
    antialias: true,
    powerPreference: 'high-performance',
    preserveDrawingBuffer
  } );
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.setPixelRatio( pixelRatio );
  renderer.setSize( width, height, false );
  const scene = new THREE.Scene();
  scene.background = new THREE.Color( 0x000000 );
  const camera = new THREE.PerspectiveCamera( 50, width / height, 0.1, 1000 );
  camera.position.set( 0, 0, 5 );
  camera.lookAt( 0, 0, 0 );

  const cameraControls = controls === 'orbit' ? new OrbitControls( camera, canvas ) : null;

  const applySessionControls = ( sessionControls ) => {
    if ( sessionControls.cameraPosition ) camera.position.fromArray( sessionControls.cameraPosition );
    if ( sessionControls.cameraTarget ) {
      if ( cameraControls ) cameraControls.target.fromArray( sessionControls.cameraTarget );
      else camera.lookAt( ...sessionControls.cameraTarget );
    } else if ( sessionControls.cameraPosition && !cameraControls ) {
      camera.lookAt( 0, 0, 0 );
    }
    if ( sessionControls.visualizationMode ) {
      core.setVisualizationMode( sessionControls.visualizationMode );
    }
    if ( sessionControls.cameraPosition || sessionControls.cameraTarget ) {
      camera.updateMatrixWorld();
      cameraControls?.update();
    }
    onSessionControls?.( sessionControls );
  };

  const core = createLissajousCore( { getNewSamples, onSessionControls: applySessionControls } );
  scene.add( core.object3d );

  let raf = null;
  let startTime = 0;
  let lastTime = 0;
  let liveFrameIndex = 0;
  let disposed = false;

  const draw = () => {
    cameraControls?.update();
    renderer.render( scene, camera );
  };

  const start = () => {
    if ( disposed ) throw new Error( 'Lissajous engine is disposed' );
    if ( raf !== null ) return;
    startTime = performance.now();
    lastTime = startTime;
    liveFrameIndex = 0;
    const loop = ( now ) => {
      if ( raf === null ) return;
      const time = ( now - startTime ) / 1000;
      const delta = ( now - lastTime ) / 1000;
      lastTime = now;
      core.tick( { time, delta, frameIndex: liveFrameIndex++ } );
      draw();
      raf = requestAnimationFrame( loop );
    };
    raf = requestAnimationFrame( loop );
  };

  const stop = () => {
    if ( raf === null ) return;
    cancelAnimationFrame( raf );
    raf = null;
  };

  // Synchronous deterministic step: callers own the frame index and may provide the exact samples
  // for it. No requestAnimationFrame or React commit is involved.
  const renderFrame = ( frameIndex, {
    fps = 60,
    time = frameIndex / fps,
    delta = 1 / fps,
    newSamples,
    automationLog = null,
    automationOverrides = null,
    playheadPosition = time
  } = {} ) => {
    if ( disposed ) throw new Error( 'Lissajous engine is disposed' );
    if ( raf !== null ) throw new Error( 'Stop the live animation loop before calling renderFrame' );
    core.tick( {
      time,
      delta,
      frameIndex,
      exportFrameRate: fps,
      isExporting: true,
      automationLog,
      automationOverrides,
      playheadPosition,
      newSamples
    } );
    draw();
    return canvas;
  };

  const setSize = ( nextWidth, nextHeight ) => {
    renderer.setSize( nextWidth, nextHeight, false );
    camera.aspect = nextWidth / nextHeight;
    camera.updateProjectionMatrix();
  };

  const setCamera = ( { position, target = [ 0, 0, 0 ] } = {} ) => {
    if ( position ) camera.position.fromArray( position );
    if ( cameraControls ) {
      cameraControls.target.fromArray( target );
      cameraControls.update();
    } else {
      camera.lookAt( ...target );
      camera.updateMatrixWorld();
    }
  };

  const dispose = () => {
    if ( disposed ) return;
    stop();
    cameraControls?.dispose();
    scene.remove( core.object3d );
    core.dispose();
    renderer.dispose();
    disposed = true;
  };

  return {
    core,
    renderer,
    scene,
    camera,
    controls: cameraControls,
    start,
    stop,
    renderFrame,
    render: draw,
    setSize,
    setCamera,
    setState: core.setState,
    addGroup: core.addGroup,
    updateGroup: core.updateGroup,
    removeGroup: core.removeGroup,
    setMode: core.setMode,
    setVisualizationMode: core.setVisualizationMode,
    dispose
  };
}
