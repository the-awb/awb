import { useEffect, useRef } from 'react';
import { createFieldRenderer } from './createFieldRenderer.js';

/** Interactive React adapter for the shared vanilla Field renderer. */
export default function FieldCanvas( {
  state,
  voices,
  readRecentSamples,
  onMicrophoneReadings,
  analytic = false,
  isRenderingSuspended = () => false
} ) {
  const containerRef = useRef( null );
  const canvasRef = useRef( null );
  const engineRef = useRef( null );
  const stateRef = useRef( state );
  const analyticRef = useRef( analytic );
  const suspendedRef = useRef( isRenderingSuspended );

  useEffect( () => {
    stateRef.current = state;
    engineRef.current?.setState( state );
  }, [ state ] );
  useEffect( () => { analyticRef.current = analytic; }, [ analytic ] );
  useEffect( () => { suspendedRef.current = isRenderingSuspended; }, [ isRenderingSuspended ] );
  useEffect( () => {
    engineRef.current?.setLiveInputs( {
      voices,
      sampleReader: readRecentSamples,
      readingsCallback: onMicrophoneReadings
    } );
  }, [ voices, readRecentSamples, onMicrophoneReadings ] );

  useEffect( () => {
    const container = containerRef.current;
    const canvas = canvasRef.current;
    const engine = createFieldRenderer( {
      canvas,
      width: Math.max( 1, container.clientWidth ),
      height: Math.max( 1, container.clientHeight || container.clientWidth ),
      pixelRatio: Math.min( window.devicePixelRatio, 2 ),
      preserveDrawingBuffer: false,
      controls: 'orbit'
    } );
    engine.setState( stateRef.current );
    engine.setLiveInputs( {
      voices,
      sampleReader: readRecentSamples,
      readingsCallback: onMicrophoneReadings
    } );
    engineRef.current = engine;

    const resize = () => engine.resize(
      Math.max( 1, container.clientWidth ),
      Math.max( 1, container.clientHeight || container.clientWidth )
    );
    const observer = new ResizeObserver( resize );
    observer.observe( container );
    window.addEventListener( 'resize', resize );

    let frameID = null;
    let accumulatedTime = 0;
    let lastNow = performance.now();
    const tick = () => {
      frameID = requestAnimationFrame( tick );
      const now = performance.now();
      if ( suspendedRef.current() ) { lastNow = now; return; }
      const current = stateRef.current;
      const wavefront = Object.values( current.surfaces )
        .some( ( surface ) => surface.visible && surface.mode === 'wav' );
      const scale = wavefront ? Math.pow( 10, current.display.timeScaleExp ) : 1;
      const delta = current.display.playing ? ( now - lastNow ) / 1000 * scale : 0;
      accumulatedTime += delta;
      lastNow = now;
      const debug = engine.renderFrame( {
        time: accumulatedTime,
        delta,
        now,
        analytic: analyticRef.current,
        phaseMode: 'continuous'
      } );
      if ( import.meta.env.DEV ) window.__fieldDraw = debug;
    };
    frameID = requestAnimationFrame( tick );

    return () => {
      cancelAnimationFrame( frameID );
      observer.disconnect();
      window.removeEventListener( 'resize', resize );
      engine.dispose();
      if ( engineRef.current === engine ) engineRef.current = null;
    };
    // The engine is mounted once. Live values cross the explicit setters above.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [] );

  return <div id="stage" ref={ containerRef }><canvas ref={ canvasRef } /></div>;
}
