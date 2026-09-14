import { useRef, useSyncExternalStore } from 'react';
import { createScEngine } from '../core/createScEngine.js';

// React owns only the subscription and render snapshot. The engine's lifetime, audio graph,
// message queues and node state live in the React-free core.
export function useSuperCollider( options ) {
  const engineRef = useRef( null );
  if ( engineRef.current === null ) engineRef.current = createScEngine( options );

  const engine = engineRef.current;
  const state = useSyncExternalStore( engine.subscribe, engine.getState, engine.getState );
  return { ...engine, ...state };
}
