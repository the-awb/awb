import * as THREE from 'three';
import { tickLissajousCore } from './lissajousCore.js';
import { createLissajousRenderObject } from './lissajousRenderObject.js';

const MODES = new Set( [ 'points', 'trails' ] );

function assertMode( mode ) {
  if ( !MODES.has( mode ) ) throw new Error( `Unknown Lissajous render mode: ${ mode }` );
}

// Multi-group, framework-neutral owner around the same render objects used by the R3F adapter.
// It owns a Three.js subtree and group lifecycle, but never a scene, camera, canvas or loop.
export function createLissajousCore( {
  getNewSamples = null,
  onSessionControls = null,
  mode = 'points'
} = {} ) {
  assertMode( mode );

  const object3d = new THREE.Group();
  const groups = new Map();
  let sampleSource = getNewSamples;
  let defaultMode = mode;
  let disposed = false;

  const assertLive = () => {
    if ( disposed ) throw new Error( 'Lissajous core is disposed' );
  };

  const buildRenderer = ( record, nextMode ) => {
    assertMode( nextMode );
    const previous = record.renderer;
    const renderer = createLissajousRenderObject( {
      mode: nextMode,
      initialState: record.state
    } );
    if ( previous ) {
      record.container.remove( previous.object3d );
      previous.dispose();
    }
    record.container.add( renderer.object3d );
    record.renderer = renderer;
    record.mode = nextMode;
  };

  const addGroup = ( groupId, params = {} ) => {
    assertLive();
    if ( groups.has( groupId ) ) throw new Error( `Lissajous group already exists: ${ groupId }` );
    const groupMode = params.mode || defaultMode;
    const state = { ...params, groupId };
    delete state.mode;
    const record = {
      id: groupId,
      state,
      mode: groupMode,
      container: new THREE.Group(),
      renderer: null
    };
    record.container.visible = state.enabled !== false;
    groups.set( groupId, record );
    object3d.add( record.container );
    if ( state.enabled !== false ) buildRenderer( record, groupMode );
    return record.renderer;
  };

  const updateGroup = ( groupId, updates = {} ) => {
    assertLive();
    const record = groups.get( groupId );
    if ( !record ) throw new Error( `Unknown Lissajous group: ${ groupId }` );
    const nextMode = updates.mode || record.mode;
    const nextState = { ...record.state, ...updates, groupId };
    delete nextState.mode;
    record.state = nextState;
    record.container.visible = nextState.enabled !== false;
    if ( nextState.enabled === false ) {
      if ( record.renderer ) {
        record.container.remove( record.renderer.object3d );
        record.renderer.dispose();
        record.renderer = null;
      }
      record.mode = nextMode;
    } else if ( !record.renderer || nextMode !== record.mode ) buildRenderer( record, nextMode );
    else record.renderer.setState( nextState );
    return record.renderer;
  };

  const removeGroup = ( groupId ) => {
    assertLive();
    const record = groups.get( groupId );
    if ( !record ) return false;
    record.renderer?.dispose();
    if ( record.renderer ) record.container.remove( record.renderer.object3d );
    object3d.remove( record.container );
    groups.delete( groupId );
    return true;
  };

  // Explicitly non-recordable bulk restoration. Reconcile rather than rebuild unchanged groups so
  // their GPU resources remain stable. The host owns recording and must not route this through its
  // interactive update funnel.
  const setState = ( snapshot = {} ) => {
    assertLive();
    const nextGroups = Array.isArray( snapshot ) ? snapshot : ( snapshot.groups || [] );
    const nextDefaultMode = Array.isArray( snapshot )
      ? defaultMode
      : ( snapshot.visualizationMode || snapshot.mode || defaultMode );
    assertMode( nextDefaultMode );
    defaultMode = nextDefaultMode;

    const wanted = new Set( nextGroups.map( ( group ) => group.id ) );
    for ( const groupId of [ ...groups.keys() ] ) {
      if ( !wanted.has( groupId ) ) removeGroup( groupId );
    }
    for ( const group of nextGroups ) {
      const groupMode = group.mode || nextDefaultMode;
      if ( groups.has( group.id ) ) updateGroup( group.id, { ...group, mode: groupMode } );
      else addGroup( group.id, { ...group, mode: groupMode } );
      // Preserve snapshot order for transparent/additive rendering.
      object3d.add( groups.get( group.id ).container );
    }
  };

  const setMode = ( groupId, nextMode ) => updateGroup( groupId, { mode: nextMode } );
  const setVisualizationMode = ( nextMode ) => {
    assertLive();
    assertMode( nextMode );
    defaultMode = nextMode;
    for ( const record of groups.values() ) updateGroup( record.id, { mode: nextMode } );
  };
  const setSampleSource = ( source ) => { sampleSource = source; };

  const getGroup = ( groupId ) => {
    const record = groups.get( groupId );
    if ( !record ) return null;
    return {
      id: record.id,
      mode: record.mode,
      state: record.state,
      object3d: record.container,
      renderObject: record.renderer
    };
  };

  const tick = ( {
    time = 0,
    delta = 0,
    frameIndex = 0,
    exportFrameRate,
    isExporting = false,
    automationLog = null,
    automationOverrides = null,
    playheadPosition = time,
    newSamples
  } = {} ) => {
    assertLive();
    const hasExplicitSamples = newSamples !== undefined;
    const frame = { time, delta, frameIndex, exportFrameRate, isExporting };
    const resolved = tickLissajousCore( {
      getNewSamples: () => hasExplicitSamples
        ? newSamples
        : ( sampleSource ? sampleSource( frame ) : null ),
      automationLog,
      groupIds: [ ...groups.keys() ],
      isExporting,
      playheadPosition
    } );
    if ( resolved.sessionControls && onSessionControls ) onSessionControls( resolved.sessionControls );

    const frameOverrides = automationOverrides ?? resolved.automationOverrides;
    for ( const record of groups.values() ) {
      if ( !record.renderer ) continue;
      record.renderer.setState( { ...record.state, isExporting } );
      record.renderer.tick( {
        elapsedTime: time,
        newSamples: resolved.newSamples,
        automationOverrides: frameOverrides,
        exportFrameIndex: frameIndex,
        exportFrameRate
      } );
    }
    return resolved;
  };

  const dispose = () => {
    if ( disposed ) return;
    for ( const record of groups.values() ) {
      record.renderer?.dispose();
      if ( record.renderer ) record.container.remove( record.renderer.object3d );
      object3d.remove( record.container );
    }
    groups.clear();
    disposed = true;
  };

  return {
    object3d,
    addGroup,
    updateGroup,
    removeGroup,
    setState,
    setMode,
    setVisualizationMode,
    setSampleSource,
    getGroup,
    tick,
    dispose,
    get groupCount() { return groups.size; }
  };
}
