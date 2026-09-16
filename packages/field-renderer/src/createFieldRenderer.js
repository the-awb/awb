import * as THREE from 'three';
import {
  BODY_SITES,
  MAX_CH,
  MAX_INST,
  SLICE_FRAG,
  VERT,
  bodySiteMicrophones,
  flattenChannels,
  hexToRgb,
  resolveInstrumentColor,
  roomGeom,
  sampleColorReadings,
  toeInRad
} from '@awb/field-engine';
import { createPhaseLock } from '@awb/phase-fit';

// Visual sync mode's period. A lock costs ~8ms, so this is 0.03% of the frame budget - the reason
// it is a toggle at all is that it is one more thing to switch off when a session gets heavy, not
// that it is expensive.
const PHASE_RESYNC_MS = 30000;

const TWO_PI = 6.283185307179586;

function arr(n, v = 0) { return new Array(n).fill(v); }

function capsuleBetween(a, b, radius, material) {
  const start = new THREE.Vector3(...a), end = new THREE.Vector3(...b);
  const direction = end.clone().sub(start);
  const length = direction.length();
  const mesh = new THREE.Mesh(
    new THREE.CapsuleGeometry(radius, Math.max(0.01, length - radius * 2), 5, 10),
    material,
  );
  mesh.position.copy(start).add(end).multiplyScalar(0.5);
  mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction.normalize());
  return mesh;
}

function ellipsoid(position, scale, material) {
  const mesh = new THREE.Mesh(new THREE.SphereGeometry(1, 20, 14), material);
  mesh.position.set(...position);
  mesh.scale.set(...scale);
  return mesh;
}

function makeBodyFigure(pose, fieldMaterial) {
  const group = new THREE.Group();
  group.name = `body-${pose}`;
  const standing = pose !== 'sitting';
  const p = standing ? {
    hipL: [-0.13, 0.91, 0], hipR: [0.13, 0.91, 0],
    kneeL: [-0.13, 0.50, 0], kneeR: [0.13, 0.50, 0],
    ankleL: [-0.13, 0.08, 0], ankleR: [0.13, 0.08, 0],
    shoulderL: [-0.25, 1.46, 0], shoulderR: [0.25, 1.46, 0],
    elbowL: [-0.39, 1.19, 0], elbowR: [0.39, 1.19, 0],
    handL: [-0.49, 0.91, 0], handR: [0.49, 0.91, 0],
  } : {
    hipL: [-0.14, 0.84, 0.08], hipR: [0.14, 0.84, 0.08],
    kneeL: [-0.16, 0.54, -0.40], kneeR: [0.16, 0.54, -0.40],
    ankleL: [-0.16, 0.09, -0.42], ankleR: [0.16, 0.09, -0.42],
    shoulderL: [-0.25, 1.34, 0.05], shoulderR: [0.25, 1.34, 0.05],
    elbowL: [-0.34, 1.12, -0.09], elbowR: [0.34, 1.12, -0.09],
    handL: [-0.31, 0.91, -0.24], handR: [0.31, 0.91, -0.24],
  };
  const parts = [
    ellipsoid(standing ? [0, 1.22, 0] : [0, 1.12, 0.05], [0.27, 0.38, 0.16], fieldMaterial),
    ellipsoid(standing ? [0, 1.68, 0] : [0, 1.55, 0.10], [0.13, 0.16, 0.13], fieldMaterial),
    capsuleBetween(p.hipL, p.kneeL, 0.095, fieldMaterial), capsuleBetween(p.hipR, p.kneeR, 0.095, fieldMaterial),
    capsuleBetween(p.kneeL, p.ankleL, 0.075, fieldMaterial), capsuleBetween(p.kneeR, p.ankleR, 0.075, fieldMaterial),
    capsuleBetween(p.shoulderL, p.elbowL, 0.07, fieldMaterial), capsuleBetween(p.shoulderR, p.elbowR, 0.07, fieldMaterial),
    capsuleBetween(p.elbowL, p.handL, 0.055, fieldMaterial), capsuleBetween(p.elbowR, p.handR, 0.055, fieldMaterial),
    ellipsoid(p.handL, [0.07, 0.10, 0.04], fieldMaterial), ellipsoid(p.handR, [0.07, 0.10, 0.04], fieldMaterial),
    ellipsoid(p.ankleL, [0.09, 0.055, 0.15], fieldMaterial), ellipsoid(p.ankleR, [0.09, 0.055, 0.15], fieldMaterial),
  ];
  parts.forEach((part) => { part.userData.role = 'sampling-surface'; group.add(part); });

  const siteMaterial = new THREE.MeshBasicMaterial({ color: 0xffffff, depthTest: false });
  for (const [id, label, position] of BODY_SITES[pose]) {
    const marker = new THREE.Mesh(new THREE.SphereGeometry(0.018, 8, 6), siteMaterial);
    marker.position.set(...position);
    marker.name = id;
    marker.userData = { role: 'body-site', siteId: id, label };
    marker.renderOrder = 20;
    group.add(marker);
  }
  return group;
}

/**
 * React-free owner of the Field Modelling Three.js scene.
 *
 * It has no animation loop and never reads layout from the DOM. Hosts explicitly set state,
 * dimensions and camera, then call renderFrame() with their own clock.
 */
export function createFieldRenderer( {
  canvas,
  width = canvas?.clientWidth || 1,
  height = canvas?.clientHeight || width,
  pixelRatio = 1,
  preserveDrawingBuffer = false,
  controls = 'none',
  antialias = true
} = {} ) {
    if ( !canvas ) throw new Error( 'createFieldRenderer requires a canvas' );
    if ( !Number.isFinite( pixelRatio ) || pixelRatio <= 0 ) throw new TypeError( 'pixelRatio must be positive' );
    if ( ![ 'none', 'orbit' ].includes( controls ) ) throw new Error( `Unknown Field controls mode: ${ controls }` );
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0a0b0d);
    const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100);
    const renderer = new THREE.WebGLRenderer({ canvas, antialias, preserveDrawingBuffer });
    renderer.setPixelRatio(pixelRatio);
    let currentState = null;
    let currentVoices = null;
    let readRecentSamples = null;
    let onMicrophoneReadings = null;
    let disposed = false;
    let lastDebugState = null;
    let renderWidth = 1;
    let renderHeight = 1;

    function resize(nextWidth, nextHeight) {
      if ( !Number.isInteger( nextWidth ) || nextWidth <= 0
        || !Number.isInteger( nextHeight ) || nextHeight <= 0 ) {
        throw new TypeError( 'Field renderer dimensions must be positive integers' );
      }
      renderer.setSize(nextWidth, nextHeight, false);
      renderWidth = nextWidth;
      renderHeight = nextHeight;
      camera.aspect = nextWidth / nextHeight;
      camera.updateProjectionMatrix();
    }

    let az = 0.62, el = 0.72, dist = 9.5;
    // Aiming a bit below the room's actual center pushes the circle higher in
    // the frame, so it stays clear of the bottom dock even while it's open.
    const target = new THREE.Vector3(0, 0.35, 1.5);
    function place() {
      camera.position.set(
        target.x + dist * Math.cos(el) * Math.sin(az),
        target.y + dist * Math.sin(el),
        target.z + dist * Math.cos(el) * Math.cos(az));
      camera.lookAt(target);
    }
    function setCamera(next = {}) {
      if ( next.target ) target.set(...next.target);
      if ( next.position ) {
        camera.position.set(...next.position);
        camera.lookAt(target);
        const relative = camera.position.clone().sub(target);
        dist = relative.length();
        el = Math.asin(relative.y / dist);
        az = Math.atan2(relative.x, relative.z);
      } else {
        if ( Number.isFinite( next.azimuth ) ) az = next.azimuth;
        if ( Number.isFinite( next.elevation ) ) el = next.elevation;
        if ( Number.isFinite( next.distance ) ) dist = next.distance;
        place();
      }
    }
    let drag = null, pinch = null;
    const dom = renderer.domElement;
    function onPointerDown(e) { drag = { x: e.clientX, y: e.clientY }; dom.setPointerCapture(e.pointerId); }
    function onPointerMove(e) {
      if (!drag) return;
      az -= (e.clientX - drag.x) * 0.008;
      el += (e.clientY - drag.y) * 0.006;
      el = Math.max(-0.2, Math.min(1.45, el));
      drag = { x: e.clientX, y: e.clientY };
      place();
    }
    function onPointerUp() { drag = null; }
    function onWheel(e) {
      e.preventDefault();
      dist = Math.max(2.5, Math.min(18, dist + e.deltaY * 0.006));
      place();
    }
    function onTouchMove(e) {
      if (e.touches.length !== 2) return;
      e.preventDefault();
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      const d = Math.sqrt(dx * dx + dy * dy);
      if (pinch) { dist = Math.max(2.5, Math.min(18, dist - (d - pinch) * 0.02)); place(); }
      pinch = d;
    }
    function onTouchEnd() { pinch = null; }
    if ( controls === 'orbit' ) {
      dom.addEventListener('pointerdown', onPointerDown);
      dom.addEventListener('pointermove', onPointerMove);
      dom.addEventListener('pointerup', onPointerUp);
      dom.addEventListener('wheel', onWheel, { passive: false });
      dom.addEventListener('touchmove', onTouchMove, { passive: false });
      dom.addEventListener('touchend', onTouchEnd);
    }

    const uSep = { value: 2 }, uSpkH = { value: 1.1 }, uPistonA = { value: 0.07 };
    const uAimL = { value: new THREE.Vector3(0, 0, 1) }, uAimR = { value: new THREE.Vector3(0, 0, 1) };
    const uFq = { value: arr(MAX_CH) }, uGL = { value: arr(MAX_CH) },
      uGR = { value: arr(MAX_CH) }, uOn = { value: arr(MAX_CH) }, uPh = { value: arr(MAX_CH) };
    // uInstIdx: colour slot (0..MAX_INST-1) each channel's owning instrument
    // maps to. uInstColor: the RGB assigned to each slot, refreshed every
    // frame from the current instrument list (see paintInstColors below).
    const uInstIdx = { value: arr(MAX_CH) };
    const uInstColor = { value: Array.from({ length: MAX_INST }, () => new THREE.Vector3()) };
    const uHighlightInst = { value: arr(MAX_INST) };
    const uHighlightCount = { value: 0 };
    const uGain = { value: 1 }, uColorMode = { value: 0 };

    const sliceUni = {
      uSep, uSpkH, uPistonA, uAimL, uAimR, uFq, uGL, uGR, uOn, uPh, uInstIdx, uInstColor, uHighlightInst, uHighlightCount,
      uGain, uColorMode, uHighlight: { value: 0 }, uOpacity: { value: 1 }, uMode: { value: 0 },
      uContour: { value: 0 }, uContourN: { value: 12 },
    };
    const bodyUni = {
      uSep, uSpkH, uPistonA, uAimL, uAimR, uFq, uGL, uGR, uOn, uPh, uInstIdx, uInstColor, uHighlightInst, uHighlightCount,
      uGain, uColorMode: { value: 0 }, uHighlight: { value: 0 }, uOpacity: { value: 1 }, uMode: { value: 0 },
      uContour: { value: 0 }, uContourN: { value: 12 },
    };
    const sphereUni = {
      uSep, uSpkH, uPistonA, uAimL, uAimR, uFq, uGL, uGR, uOn, uPh, uInstIdx, uInstColor, uHighlightInst, uHighlightCount,
      uGain, uColorMode: { value: 0 }, uHighlight: { value: 0 }, uOpacity: { value: 1 }, uMode: { value: 0 },
      uContour: { value: 0 }, uContourN: { value: 12 },
    };

    const sliceMat = new THREE.ShaderMaterial({
      vertexShader: VERT, fragmentShader: SLICE_FRAG, uniforms: sliceUni,
      side: THREE.DoubleSide, transparent: true, extensions: { derivatives: true },
    });
    const bodyMat = new THREE.ShaderMaterial({
      vertexShader: VERT, fragmentShader: SLICE_FRAG, uniforms: bodyUni,
      side: THREE.DoubleSide, transparent: true, extensions: { derivatives: true },
    });
    const sphereMat = new THREE.ShaderMaterial({
      vertexShader: VERT, fragmentShader: SLICE_FRAG, uniforms: sphereUni,
      side: THREE.DoubleSide, transparent: true, extensions: { derivatives: true },
    });

    // Radius is applied via mesh scale rather than rebuilding geometry, so
    // resizing the horizontal sampling surface stays cheap.
    const planeH = new THREE.Mesh(new THREE.CircleGeometry(1, 96), sliceMat);
    planeH.rotation.x = -Math.PI / 2;
    scene.add(planeH);
    // A rectangular, subdivided patch projected onto a sphere. Its centre is
    // the midpoint between the speakers; only the forward-facing patch is
    // shown, not a hemisphere or a closed shell.
    const spherePatchGeo = new THREE.PlaneGeometry(1, 1, 64, 40);
    const spherePatchBase = spherePatchGeo.attributes.position.array.slice();
    const planeV = new THREE.Mesh(spherePatchGeo, sphereMat);
    planeV.visible = false;
    scene.add(planeV);
    let spherePatchKey = '';
    function shapeSpherePatch(radius, width = 2.2, height = 2.0) {
      const key = `${radius.toFixed(4)}:${width}:${height}`;
      if (key === spherePatchKey) return;
      spherePatchKey = key;
      const pos = spherePatchGeo.attributes.position;
      for (let i = 0; i < pos.count; i++) {
        const x = spherePatchBase[i * 3] * width;
        const y = spherePatchBase[i * 3 + 1] * height;
        const z = Math.sqrt(Math.max(0.001, radius * radius - x * x - y * y));
        pos.setXYZ(i, x, y, z);
      }
      pos.needsUpdate = true;
      spherePatchGeo.computeVertexNormals();
      spherePatchGeo.computeBoundingSphere();
    }

    const bed = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.08, 1.9),
      new THREE.MeshBasicMaterial({ color: 0xffffff, wireframe: true, transparent: true, opacity: 0.45 }));
    scene.add(bed);
    const supportMat = new THREE.MeshBasicMaterial({ color: 0xffffff, wireframe: true, transparent: true, opacity: 0.32 });
    const chair = new THREE.Group();
    const chairSeat = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.06, 0.58), supportMat);
    chairSeat.position.y = 0.48;
    const chairBack = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.72, 0.06), supportMat);
    chairBack.position.set(0, 0.83, 0.27);
    chair.add(chairSeat, chairBack);
    scene.add(chair);

    const bodies = {
      standing: makeBodyFigure('standing', bodyMat),
      sitting: makeBodyFigure('sitting', bodyMat),
      lying: makeBodyFigure('lying', bodyMat),
    };
    Object.values(bodies).forEach((body) => { body.visible = false; scene.add(body); });
    const micMaterial = new THREE.MeshBasicMaterial({ color: 0x63d6c5, depthTest: false });
    const micMeshes = Array.from({ length: 3 }, (_, index) => {
      const mesh = new THREE.Mesh(new THREE.IcosahedronGeometry(0.065, 1), micMaterial);
      mesh.name = `room-microphone-${index + 1}`;
      mesh.renderOrder = 30;
      scene.add(mesh);
      return mesh;
    });
    const micTriangleGeo = new THREE.BufferGeometry();
    micTriangleGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(12), 3));
    const micTriangle = new THREE.Line(
      micTriangleGeo,
      new THREE.LineBasicMaterial({ color: 0x63d6c5, transparent: true, opacity: 0.65, depthTest: false }),
    );
    micTriangle.renderOrder = 29;
    scene.add(micTriangle);
    const spkMat = new THREE.MeshBasicMaterial({ color: 0xE0603A, wireframe: true });
    const spkL = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.39, 0.3), spkMat);
    const spkR = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.39, 0.3), spkMat);
    scene.add(spkL); scene.add(spkR);
    const grid = new THREE.GridHelper(14, 28, 0x2E323A, 0x1C1F25);
    scene.add(grid);

    function makeAimLine() {
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(6), 3));
      return new THREE.Line(geo, new THREE.LineBasicMaterial({ color: 0xE0603A, transparent: true, opacity: 0.55 }));
    }
    const aimLineL = makeAimLine(), aimLineR = makeAimLine();
    scene.add(aimLineL); scene.add(aimLineR);
    function setAimLine(line, origin, dir, len) {
      const p = line.geometry.attributes.position.array;
      p[0] = origin.x; p[1] = origin.y; p[2] = origin.z;
      p[3] = origin.x + dir.x * len; p[4] = origin.y + dir.y * len; p[5] = origin.z + dir.z * len;
      line.geometry.attributes.position.needsUpdate = true;
    }

    function setSurfacePaint(uniforms, surface) {
      uniforms.uColorMode.value = surface.colorMode === 'multi' ? 1 : 0;
      uniforms.uHighlight.value = surface.highlight ? 1 : 0;
      uniforms.uOpacity.value = surface.opacity ?? 1;
      uniforms.uMode.value = surface.mode === 'wav' ? 2 : (surface.mode === 'rel' ? 1 : 0);
      uniforms.uContour.value = surface.contour;
      uniforms.uContourN.value = surface.contourN;
    }

    function layout(room, surfaces, microphones, display) {
      const rg = roomGeom(room.roomDiam, room.roomBack);
      const horizontal = surfaces.horizontal, spherical = surfaces.spherical, surface = surfaces.body;
      planeH.scale.set(horizontal.radius, horizontal.radius, 1);
      planeH.position.set(0, horizontal.height, rg.centerZ);
      shapeSpherePatch(spherical.radius, spherical.width, spherical.height);
      planeV.position.set(0, room.spkH, 0);
      bed.position.set(0, room.bedH, room.bedY);
      chair.position.set(0, 0, room.bedY);
      spkL.position.set(-room.sep / 2, room.spkH, 0);
      spkR.position.set(room.sep / 2, room.spkH, 0);
      uSep.value = room.sep; uSpkH.value = room.spkH; uPistonA.value = room.pistonA;
      const t = toeInRad(room.conv);
      uAimL.value.set(Math.sin(t), 0, Math.cos(t));
      uAimR.value.set(-Math.sin(t), 0, Math.cos(t));
      spkL.rotation.y = t;
      spkR.rotation.y = -t;
      setAimLine(aimLineL, spkL.position, uAimL.value, 4);
      setAimLine(aimLineR, spkR.position, uAimR.value, 4);

      grid.position.set(0, 0, rg.centerZ);

      planeH.visible = horizontal.visible;
      planeV.visible = spherical.visible;

      const selectedSetup = surface.setupId;
      for (const [id, body] of Object.entries(bodies)) {
        body.visible = Boolean(surface.visible && id === selectedSetup);
        for (const child of body.children) {
          if (child.userData.role === 'body-site') child.visible = Boolean(surface.showSites);
        }
      }
      bodies.standing.position.set(0, 0, room.bedY);
      bodies.standing.rotation.set(0, 0, 0);
      bodies.sitting.position.set(0, 0, room.bedY);
      bodies.sitting.rotation.set(0, 0, 0);
      bodies.lying.position.set(0, room.bedH + 0.14, room.bedY - 0.91);
      bodies.lying.rotation.set(Math.PI / 2, 0, 0);
      bed.visible = selectedSetup === 'lying';
      chair.visible = selectedSetup === 'sitting';

      for (let i = 0; i < micMeshes.length; i++) {
        const microphone = microphones[i];
        micMeshes[i].visible = Boolean(microphone);
        if (microphone) micMeshes[i].position.set(...microphone.position);
      }
      micTriangle.visible = microphones.length >= 3;
      if (microphones.length >= 3) {
        const positions = micTriangleGeo.attributes.position.array;
        for (let i = 0; i < 4; i++) {
          const point = microphones[i % 3].position;
          positions[i * 3] = point[0]; positions[i * 3 + 1] = point[1]; positions[i * 3 + 2] = point[2];
        }
        micTriangleGeo.attributes.position.needsUpdate = true;
        micTriangleGeo.computeBoundingSphere();
      }

      uGain.value = display.gain;
      setSurfacePaint(sliceUni, horizontal);
      setSurfacePaint(sphereUni, spherical);
      setSurfacePaint(bodyUni, surface);
    }

    // Each instrument carries its own colour (user-editable, defaulted at
    // creation) rather than one derived purely from list position, so it
    // stays put across mute/solo/reorder/removal of OTHER instruments. Slots
    // wrap past MAX_INST -- a rare crowded-scene fallback, not something
    // normal use hits.
    function paintInstColors(instruments) {
      uHighlightInst.value.fill(0);
      for (let idx = 0; idx < instruments.length; idx++) {
        const slot = idx % MAX_INST;
        const [r, g, b] = hexToRgb(resolveInstrumentColor(instruments[idx], idx));
        uInstColor.value[slot].set(r, g, b);
        if (instruments[idx].highlight) uHighlightInst.value[slot] = 1;
      }
      uHighlightCount.value = uHighlightInst.value.reduce((sum, value) => sum + value, 0);
    }

    // Keyed by "instrumentId:slot" rather than array index, so a channel's
    // phase stays continuous across frames even as instruments are added,
    // removed, muted or reordered -- only that channel's own on/off state
    // (via the flattened list simply omitting it) resets its phase.
    const phaseMap = new Map();
    // When each sounding instrument's note began, in the canvas's own time base. Kept here rather
    // than in the voice layer so there is exactly ONE clock in play: pausing the field freezes the
    // envelopes with everything else, which it would not if this read wall time. Same
    // create-on-first-appearance pattern as phaseMap above.
    const voiceBirth = new Map();
    const phaseLock = createPhaseLock();
    let lastMicSample = -Infinity;

    function renderFrame( {
      time = 0,
      delta = 0,
      now = time * 1000,
      analytic = false,
      phaseMode = analytic ? 'absolute' : 'continuous'
    } = {} ) {
      if ( disposed ) throw new Error( 'Field renderer is disposed' );
      if ( !currentState ) throw new Error( 'Field renderer state has not been set' );
      if ( !Number.isFinite( time ) || !Number.isFinite( delta ) || delta < 0 ) {
        throw new TypeError( 'Field render time and delta must be finite and delta non-negative' );
      }
      if ( ![ 'absolute', 'continuous' ].includes( phaseMode ) ) {
        throw new Error( `Unknown Field phase mode: ${ phaseMode }` );
      }
      const { instruments, room, surfaces, microphones = [], display, timeFactor } = currentState;
      const hasWavefrontView = Object.values(surfaces).some((surface) => surface.visible && surface.mode === 'wav');

      // Synths started from the console are drawn too, when the app knows their def. They are
      // APPENDED, so every app instrument keeps its index and therefore its colour slot as nodes
      // come and go - a console synth appearing must not recolour the instruments beside it.
      // Derived fresh each frame from the last tree reply rather than held in state: the server is
      // the owner, and a node that has gone simply stops being in the list.
      const drawn = currentVoices?.external ?? [];
      const all = drawn.length ? instruments.concat(drawn) : instruments;

      const instIndexById = new Map(all.map((inst, idx) => [inst.id, idx]));
      paintInstColors(all);

      const sounding = currentVoices?.voicesRef?.current;
      // THE FIELD SHOWS WHAT IS ACTUALLY SOUNDING, and nothing else. Before the engine is running
      // there are no voices, so there is no field - only the room. This is deliberately not a
      // visualiser that happens to have audio attached: a picture of an interference pattern that
      // no one is hearing is a drawing, and the whole point of the tool is that the two are the
      // same object seen twice.
      const drawable = [];
      for (const inst of all) {
        // An external node is sounding for exactly as long as it is in the tree - that IS the
        // server's answer, whereas an instrument's is the app's own bookkeeping. Its birth is
        // the moment the app first saw it, which is late by the /n_go round trip (~330ms
        // measured). Against a 12-to-30-second attack that is a 1-3% error in envelope position,
        // and there is nothing better available: no reply carries a timetag.
        const live = analytic ? inst.playing !== false : (inst.external ? true : (sounding?.has(inst.id) ?? false));
        if (live) drawable.push(inst);
        if (live && !voiceBirth.has(inst.id)) voiceBirth.set(inst.id, time);
        else if (!live && voiceBirth.has(inst.id)) voiceBirth.delete(inst.id);
      }
      // Births for nodes that have since left the tree, so the map cannot grow without bound
      // across a long session of Pbind events.
      if (voiceBirth.size > all.length) {
        const alive = new Set(all.map((i) => i.id));
        for (const id of voiceBirth.keys()) if (!alive.has(id)) voiceBirth.delete(id);
      }
      const localTime = analytic
        ? () => time
        : (id) => (voiceBirth.has(id) ? time - voiceBirth.get(id) : null);

      // Colours and indices still come from `all`, so an instrument keeps its hue when it stops
      // and starts again; only the channel list is filtered.
      const channels = flattenChannels(drawable, room.speakers, timeFactor, time, localTime);
      const n = Math.min(channels.length, MAX_CH);

      // Measure the real phase off the engine's output whenever the model might have moved - a
      // synth mounted, or a control touched that changes a frequency or a gain. Debounced inside,
      // so dragging a slider arms it once rather than fitting on every pointermove. Writes straight
      // into phaseMap, so the advance below carries it forward exactly as it does a free-running
      // phase; a channel it could not resolve is simply left alone.
      // NOT while a wavefront surface is up. That mode scales dt so the picture runs in slow
      // motion, which means it is deliberately not showing NOW - and a phase measured off the
      // engine is a statement about now. Locking during it would yank the animation back to real
      // time every thirty seconds, so the slow-motion view would jerk. The field is the same one
      // either way; only the clock differs.
      if (phaseMode === 'continuous' && !hasWavefrontView) {
        phaseLock.tick(channels.slice(0, n), now, readRecentSamples, phaseMap, {
          resyncMs: display.phaseSync === false ? 0 : PHASE_RESYNC_MS,
          // How many synths are on the server, whether or not the field models them. A Resobass2
          // draws nothing and sounds plenty, so without this the lock never notices it started.
          sceneTag: `${sounding?.size ?? 0}/${currentVoices?.external?.length ?? 0}`,
        });
      }
      for (let i = 0; i < n; i++) {
        const ch = channels[i];
        const key = `${ch.instId}:${ch.slot}`;
        const prev = phaseMap.get(key) ?? 0;
        const phase = phaseMode === 'absolute'
          ? ((ch.phase || 0) + TWO_PI * ch.freq * time) % TWO_PI
          : (prev + TWO_PI * ch.freq * delta) % TWO_PI;
        phaseMap.set(key, phase);
        uFq.value[i] = ch.freq; uGL.value[i] = ch.gl; uGR.value[i] = ch.gr;
        uPh.value[i] = phase;
        uOn.value[i] = (ch.freq > 0 && (ch.gl > 0 || ch.gr > 0)) ? 1 : 0;
        uInstIdx.value[i] = (instIndexById.get(ch.instId) ?? 0) % MAX_INST;
      }
      for (let i = n; i < MAX_CH; i++) uOn.value[i] = 0;

      if (onMicrophoneReadings && now - lastMicSample >= 1000 / 15) {
        lastMicSample = now;
        const liveChannels = channels.slice(0, n).map((channel, index) => ({
          ...channel, phase: uPh.value[index],
        }));
        const probes = [...microphones, ...bodySiteMicrophones(surfaces.body, room)];
        const readings = {};
        for (const probe of probes) {
          const reading = sampleColorReadings(liveChannels, room, probe.position, display.gain);
          readings[probe.id] = {
            composite: reading.composite,
            instruments: Object.fromEntries(reading.instruments),
          };
        }
        onMicrophoneReadings(readings);
      }

      // Dev-only readback of what actually reached the shader this frame. Not the app's state and
      // not the panel - the uniform values themselves, which is the only place a derivation can be
      // checked end to end. A field that draws nothing and a field that draws the wrong thing look
      // identical in a screenshot. See tools/verify/sclang-console.mjs.
      if (import.meta.env?.DEV) {
        lastDebugState = {
          instruments: all.map((inst) => inst.id),
          phaseLock: phaseLock.status,
          channels: channels.slice(0, n).map((ch, i) => ({
            instId: ch.instId, slot: ch.slot,
            freq: uFq.value[i], gl: uGL.value[i], gr: uGR.value[i], on: uOn.value[i],
            phase: uPh.value[i],
          })),
        };
      }

      layout(room, surfaces, microphones, display);
      renderer.render(scene, camera);
      return lastDebugState;
    }

    resize(width, height);
    place();

    function dispose() {
      if ( disposed ) return;
      disposed = true;
      if ( controls === 'orbit' ) {
        dom.removeEventListener('pointerdown', onPointerDown);
        dom.removeEventListener('pointermove', onPointerMove);
        dom.removeEventListener('pointerup', onPointerUp);
        dom.removeEventListener('wheel', onWheel);
        dom.removeEventListener('touchmove', onTouchMove);
        dom.removeEventListener('touchend', onTouchEnd);
      }
      scene.traverse((obj) => {
        if (obj.geometry) obj.geometry.dispose();
        if (obj.material) {
          if (Array.isArray(obj.material)) obj.material.forEach((m) => m.dispose());
          else obj.material.dispose();
        }
      });
      renderer.dispose();
    }

    return Object.freeze( {
      canvas,
      renderer,
      scene,
      camera,
      resize,
      setCamera,
      setState( nextState ) {
        if ( !nextState || typeof nextState !== 'object' ) throw new TypeError( 'Field renderer state is required' );
        currentState = nextState;
      },
      setLiveInputs( { voices = null, sampleReader = null, readingsCallback = null } = {} ) {
        currentVoices = voices;
        readRecentSamples = sampleReader;
        onMicrophoneReadings = readingsCallback;
      },
      renderFrame,
      readPixels() {
        if ( disposed ) throw new Error( 'Field renderer is disposed' );
        const pixels = new Uint8Array( renderWidth * renderHeight * 4 );
        const context = renderer.getContext();
        context.readPixels( 0, 0, renderWidth, renderHeight, context.RGBA, context.UNSIGNED_BYTE, pixels );
        return pixels;
      },
      dispose,
      getDebugState: () => lastDebugState,
      getCamera: () => Object.freeze( {
        position: camera.position.toArray(),
        target: target.toArray(),
        azimuth: az,
        elevation: el,
        distance: dist
      } )
    } );
}
