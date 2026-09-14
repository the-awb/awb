import React, { useEffect, useLayoutEffect, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { createLissajousRenderObject } from '../core/lissajousRenderObject.js';

// React 18 StrictMode runs an effect's setup/cleanup cycle twice on first mount. Deferring disposal
// by one microtask lets the matching second setup retain the same render object; a real unmount or
// mode change has no matching retain and therefore disposes its Three.js resources.
const retainCounts = new WeakMap();

function retainRenderObject( renderer ) {
  retainCounts.set( renderer, ( retainCounts.get( renderer ) || 0 ) + 1 );
}

function releaseRenderObject( renderer ) {
  retainCounts.set( renderer, Math.max( 0, ( retainCounts.get( renderer ) || 0 ) - 1 ) );
  queueMicrotask( () => {
    if ( retainCounts.get( renderer ) === 0 ) {
      retainCounts.delete( renderer );
      renderer.dispose();
    }
  } );
}

function LissajousRenderObjectR3F( { mode, state: renderState, newSamplesRef, automationOverrideRef, exportFrameRateRef, currentExportFrameIndexRef } ) {
  // Same binding pattern as field_modelling's vanilla Three.js canvas: React commits the latest
  // snapshot through the renderer's explicit setState path, which replaces its stable internal
  // ref. The animation loop reads that ref once. Slider changes rerender this thin adapter but
  // never reconstruct the Three.js subtree or its persistence history.
  const renderer = useMemo( () => createLissajousRenderObject( {
    mode,
    initialState: renderState
  } ), [ mode ] );
  useLayoutEffect( () => { renderer.setState( renderState ); }, [ renderer, renderState ] );

  useEffect( () => {
    retainRenderObject( renderer );
    return () => releaseRenderObject( renderer );
  }, [ renderer ] );

  useFrame( ( state ) => {
    renderer.tick( {
      elapsedTime: state.clock.elapsedTime,
      newSamples: newSamplesRef?.current,
      automationOverrides: automationOverrideRef?.current,
      exportFrameRate: exportFrameRateRef?.current,
      exportFrameIndex: currentExportFrameIndexRef?.current ?? 0
    } );
  } );

  return <primitive object={ renderer.object3d } dispose={ null } />;
}

export function LissajousPointsR3F( props ) {
  return <LissajousRenderObjectR3F mode="points" { ...props } />;
}

export function LissajousTrailsR3F( props ) {
  return <LissajousRenderObjectR3F mode="trails" { ...props } />;
}
