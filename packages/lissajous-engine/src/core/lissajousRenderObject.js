import * as THREE from 'three';
import {
  MAX_GEOMETRY_POINTS,
  clampPersistenceLength,
  renderPersistenceBufferToGeometry,
  trimPersistenceBuffer
} from './pointCloudBuilder.js';

function createPointGlowTexture() {
  const canvas = document.createElement( 'canvas' );
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext( '2d' );

  ctx.clearRect( 0, 0, 256, 256 );

  const outerGlow = ctx.createRadialGradient( 128, 128, 0, 128, 128, 128 );
  outerGlow.addColorStop( 0, 'rgba(255, 255, 255, 1.0)' );
  outerGlow.addColorStop( 0.1, 'rgba(255, 255, 255, 0.9)' );
  outerGlow.addColorStop( 0.2, 'rgba(255, 255, 255, 0.7)' );
  outerGlow.addColorStop( 0.4, 'rgba(255, 255, 255, 0.5)' );
  outerGlow.addColorStop( 0.6, 'rgba(255, 255, 255, 0.3)' );
  outerGlow.addColorStop( 0.8, 'rgba(255, 255, 255, 0.2)' );
  outerGlow.addColorStop( 1, 'rgba(255, 255, 255, 0)' );
  ctx.fillStyle = outerGlow;
  ctx.fillRect( 0, 0, 256, 256 );

  ctx.globalCompositeOperation = 'lighter';
  const innerCore = ctx.createRadialGradient( 128, 128, 0, 128, 128, 40 );
  innerCore.addColorStop( 0, 'rgba(255, 255, 255, 1.0)' );
  innerCore.addColorStop( 0.3, 'rgba(255, 255, 255, 0.8)' );
  innerCore.addColorStop( 0.7, 'rgba(255, 255, 255, 0.3)' );
  innerCore.addColorStop( 1, 'rgba(255, 255, 255, 0)' );
  ctx.fillStyle = innerCore;
  ctx.fillRect( 0, 0, 256, 256 );

  const pinpoint = ctx.createRadialGradient( 128, 128, 0, 128, 128, 8 );
  pinpoint.addColorStop( 0, 'rgba(255, 255, 255, 1.0)' );
  pinpoint.addColorStop( 0.5, 'rgba(255, 255, 255, 0.6)' );
  pinpoint.addColorStop( 1, 'rgba(255, 255, 255, 0)' );
  ctx.fillStyle = pinpoint;
  ctx.fillRect( 0, 0, 256, 256 );

  return new THREE.CanvasTexture( canvas );
}

function createGeometry() {
  const geometry = new THREE.BufferGeometry();
  const position = new THREE.BufferAttribute(
    new Float32Array( MAX_GEOMETRY_POINTS * 3 ), 3
  ).setUsage( THREE.DynamicDrawUsage );
  const color = new THREE.BufferAttribute(
    new Float32Array( MAX_GEOMETRY_POINTS * 3 ), 3
  ).setUsage( THREE.DynamicDrawUsage );
  geometry.setAttribute( 'position', position );
  geometry.setAttribute( 'color', color );
  geometry.setDrawRange( 0, 0 );
  return geometry;
}

function resolveParams( params, automationOverrides ) {
  const live = automationOverrides?.[ params.groupId ];
  return {
    position: live?.position ?? params.position,
    rotation: live?.rotation ?? params.rotation,
    audioScale: live?.audioScale ?? params.audioScale,
    pointSize: live?.pointSize ?? params.pointSize,
    pointOpacity: live?.pointOpacity ?? params.pointOpacity,
    persistenceLength: live?.persistenceLength ?? params.persistenceLength,
    persistenceDecay: live?.persistenceDecay ?? params.persistenceDecay,
    warpFactor: live?.warpFactor ?? params.warpFactor,
    masterBrightness: live?.masterBrightness ?? params.masterBrightness,
    depthScale: live?.depthScale ?? params.depthScale,
    colorSaturation: live?.colorSaturation ?? params.colorSaturation,
    colorRangeMin: live?.colorRangeMin ?? params.colorRangeMin,
    colorRangeMax: live?.colorRangeMax ?? params.colorRangeMax
  };
}

function appendSamples( persistenceBuffer, newSamples, warpFactor ) {
  if ( !newSamples ) return;
  const sampleCount = Math.min( newSamples.x.length, newSamples.y.length );
  for ( let i = 0; i < sampleCount; i++ ) {
    persistenceBuffer.push( {
      x: newSamples.x[ i ],
      y: newSamples.y[ i ],
      warpAtCapture: warpFactor
    } );
  }
}

function appendTestSamples( persistenceBuffer, time, warpFactor ) {
  for ( let i = 0; i < 1000; i++ ) {
    const t = ( time + i * 0.001 ) * Math.PI * 2;
    persistenceBuffer.push( {
      x: Math.sin( t ),
      y: Math.sin( t * 1.5 ),
      warpAtCapture: warpFactor
    } );
  }
}

// One framework-neutral visual object. It owns the Three.js subtree and all state that determines
// its pixels, but it does not own a canvas, scene, camera or animation loop. R3F mounts object3d as
// a primitive and calls tick from useFrame; the vanilla adapter will call the same tick itself.
export function createLissajousRenderObject( { mode, pointTexture, stateRef: suppliedStateRef, initialState = {} } ) {
  if ( mode !== 'points' && mode !== 'trails' ) {
    throw new Error( `Unknown Lissajous render mode: ${ mode }` );
  }

  const geometry = createGeometry();
  const ownsPointTexture = mode === 'points' && pointTexture === undefined;
  const texture = mode === 'points' ? ( pointTexture ?? createPointGlowTexture() ) : null;
  // R3F's applyProps automatically tags RGBA byte textures with the renderer output colour space
  // when they are attached through JSX. A prebuilt primitive bypasses applyProps, so carry that
  // behaviour into the shared object explicitly or points render fractionally darker.
  if ( texture ) texture.colorSpace = THREE.SRGBColorSpace;
  const material = new THREE.PointsMaterial( mode === 'points' ? {
    map: texture,
    size: 4,
    vertexColors: true,
    transparent: true,
    sizeAttenuation: false,
    blending: THREE.AdditiveBlending,
    depthTest: true,
    depthWrite: false
  } : {
    size: 1.2,
    vertexColors: true,
    transparent: true,
    sizeAttenuation: false,
    blending: THREE.AdditiveBlending,
    depthTest: true
  } );
  const drawable = new THREE.Points( geometry, material );
  const object3d = mode === 'trails' ? new THREE.Group() : drawable;
  if ( object3d !== drawable ) object3d.add( drawable );
  const stateRef = suppliedStateRef || { current: initialState };

  let persistenceBuffer = [];
  let lastFrameTime = 0;
  let exportRunStarted = false;
  let lastExportIndexConsumed = -1;
  let disposed = false;

  // Bulk state replacement deliberately has no recording/event side effects. Interactive changes
  // still flow through the host's updateGroup path; session/settings restoration can replace a
  // snapshot without manufacturing automation events. Both R3F and vanilla hosts use this same
  // binding, and tick reads it exactly once before resolving a frame.
  const setState = ( snapshot ) => {
    stateRef.current = snapshot || {};
  };

  const tick = ( {
    elapsedTime,
    newSamples,
    automationOverrides,
    exportFrameIndex = 0,
    exportFrameRate
  } ) => {
    if ( disposed ) return false;

    const params = stateRef.current || {};
    const isExporting = params.isExporting === true;
    const current = resolveParams( params, automationOverrides );
    if ( current.position ) drawable.position.fromArray( current.position );
    if ( current.rotation ) drawable.rotation.fromArray( current.rotation );

    if ( isExporting && !exportRunStarted ) {
      persistenceBuffer = [];
      exportRunStarted = true;
      lastExportIndexConsumed = -1;
    } else if ( !isExporting && exportRunStarted ) {
      exportRunStarted = false;
    }

    if ( isExporting ) {
      if ( exportFrameIndex === lastExportIndexConsumed ) return false;
      lastExportIndexConsumed = exportFrameIndex;
      const stride = Math.max( 1, Math.round( ( exportFrameRate || params.frameRate ) / params.frameRate ) );
      if ( exportFrameIndex % stride !== 0 ) return false;
    } else {
      const currentTime = elapsedTime * 1000;
      const frameInterval = 1000 / params.frameRate;
      if ( currentTime - lastFrameTime < frameInterval ) return false;
      lastFrameTime = currentTime;
    }

    if ( params.testMode ) {
      appendTestSamples( persistenceBuffer, elapsedTime, current.warpFactor );
    } else {
      appendSamples( persistenceBuffer, newSamples, current.warpFactor );
    }

    trimPersistenceBuffer( persistenceBuffer, clampPersistenceLength( current.persistenceLength ) );

    const positions = geometry.attributes.position.array;
    const colors = geometry.attributes.color.array;
    const count = renderPersistenceBufferToGeometry( {
      persistenceBuffer,
      positions,
      colors,
      audioScale: current.audioScale,
      pointOpacity: current.pointOpacity,
      persistenceDecay: current.persistenceDecay,
      masterBrightness: current.masterBrightness,
      depthScale: current.depthScale,
      colorSaturation: current.colorSaturation,
      colorRangeMin: current.colorRangeMin,
      colorRangeMax: current.colorRangeMax
    } );

    material.size = mode === 'points' ? current.pointSize : Math.max( current.pointSize * 0.3, 1 );
    // Only the active prefix changed. Three otherwise sends each complete fixed-capacity allocation
    // through bufferSubData, even when drawRange contains the normal 8k points. Clear first because
    // a pure tick (without a WebGL render between calls) does not give Three a chance to clear it.
    const changedComponents = count * 3;
    if ( changedComponents > 0 ) {
      geometry.attributes.position.clearUpdateRanges();
      geometry.attributes.color.clearUpdateRanges();
      geometry.attributes.position.addUpdateRange( 0, changedComponents );
      geometry.attributes.color.addUpdateRange( 0, changedComponents );
      geometry.attributes.position.needsUpdate = true;
      geometry.attributes.color.needsUpdate = true;
    }
    geometry.setDrawRange( 0, count );
    return true;
  };

  const dispose = () => {
    if ( disposed ) return;
    disposed = true;
    geometry.dispose();
    material.dispose();
    if ( ownsPointTexture ) texture.dispose();
  };

  return {
    mode,
    object3d,
    drawable,
    geometry,
    material,
    stateRef,
    setState,
    tick,
    dispose
  };
}
