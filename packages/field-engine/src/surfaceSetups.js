// Renderer-neutral sampling-surface catalogue. Geometry remains procedural
// for now; a later GLB-backed entry can use the same id/label/site contract.
export const SURFACE_SETUPS = [
  { id: 'none', label: 'No body' },
  { id: 'standing', label: 'Standing' },
  { id: 'sitting', label: 'Sitting on chair' },
  { id: 'lying', label: 'Lying on bed' },
];

// Coordinates are in each procedural figure's local space. Stable semantic
// ids are the important part: future anatomical meshes and IR bundles can
// attach the same ids to different triangles without changing saved sessions.
export const BODY_SITES = {
  standing: [
    ['crown', 'Crown', [0, 1.82, 0]], ['sternum', 'Sternum', [0, 1.38, -0.13]],
    ['abdomen', 'Abdomen', [0, 1.08, -0.14]], ['sacrum', 'Sacrum', [0, 0.94, 0.12]],
    ['left-knee', 'Left knee', [-0.13, 0.50, -0.07]], ['right-knee', 'Right knee', [0.13, 0.50, -0.07]],
    ['left-palm', 'Left palm', [-0.50, 0.92, 0]], ['right-palm', 'Right palm', [0.50, 0.92, 0]],
    ['left-sole', 'Left sole', [-0.13, 0.03, 0]], ['right-sole', 'Right sole', [0.13, 0.03, 0]],
  ],
  sitting: [
    ['crown', 'Crown', [0, 1.68, 0.10]], ['sternum', 'Sternum', [0, 1.30, -0.04]],
    ['abdomen', 'Abdomen', [0, 1.04, -0.05]], ['sacrum', 'Sacrum', [0, 0.84, 0.10]],
    ['left-knee', 'Left knee', [-0.16, 0.54, -0.40]], ['right-knee', 'Right knee', [0.16, 0.54, -0.40]],
    ['left-palm', 'Left palm', [-0.31, 0.91, -0.24]], ['right-palm', 'Right palm', [0.31, 0.91, -0.24]],
    ['left-sole', 'Left sole', [-0.16, 0.03, -0.42]], ['right-sole', 'Right sole', [0.16, 0.03, -0.42]],
  ],
};

// Lying uses the standing figure rotated as a unit, so its anchors are the
// same local coordinates and semantic ids.
BODY_SITES.lying = BODY_SITES.standing;

export const DEFAULT_SURFACE = {
  setupId: 'lying',
  visible: true,
  showSites: false,
  mode: 'abs',
  colorMode: 'composite',
  highlight: true,
  opacity: 1,
  contour: 0,
  contourN: 12,
};

const DEFAULT_STYLE = {
  mode: 'abs', colorMode: 'composite', highlight: true, opacity: 1, contour: 0, contourN: 12,
};

export function createDefaultSurfaces(room = {}) {
  const bedH = room.bedH ?? 0.60;
  const bedY = room.bedY ?? 2.0;
  const roomRadius = (room.roomDiam ?? 7) * 0.5;
  return {
    horizontal: {
      id: 'horizontal', label: 'Horizontal', visible: true,
      height: bedH - 0.04, radius: roomRadius, ...DEFAULT_STYLE,
    },
    spherical: {
      id: 'spherical', label: 'Spherical patch', visible: false,
      radius: bedY + 1.1, width: 2.2, height: 2.0, ...DEFAULT_STYLE,
    },
    body: {
      id: 'body', label: 'Body', ...DEFAULT_SURFACE,
    },
  };
}

// Converts the short-lived transitional surface fields as well as older
// pre-surface saves. Once loaded, only `surfaces` is authoritative.
export function migrateSurfaces(saved) {
  const defaults = createDefaultSurfaces(saved.room);
  if (saved.surfaces) {
    const migrated = Object.fromEntries(Object.entries(defaults).map(([id, fallback]) => [
      id, { ...fallback, ...saved.surfaces[id] },
    ]));
    const spherical = migrated.spherical;
    spherical.radius = Math.max(
      spherical.radius,
      Math.sqrt((spherical.width * 0.5) ** 2 + (spherical.height * 0.5) ** 2) + 0.02,
    );
    return migrated;
  }
  const legacyStyle = {
    mode: saved.display?.mode ?? 'abs',
    colorMode: saved.display?.colorMode ?? 'composite',
    contour: saved.display?.contour ?? 0,
    contourN: saved.display?.contourN ?? 12,
  };
  const fieldOn = saved.display?.surfaceVisible !== false && !saved.display?.shellMode;
  defaults.horizontal = {
    ...defaults.horizontal, ...legacyStyle,
    height: saved.room?.vertical ? defaults.horizontal.height : (saved.room?.slice ?? defaults.horizontal.height),
    visible: fieldOn && !saved.room?.vertical,
  };
  defaults.spherical = {
    ...defaults.spherical, ...legacyStyle,
    radius: saved.room?.vertical ? (saved.room?.slice ?? defaults.spherical.radius) : defaults.spherical.radius,
    visible: fieldOn && Boolean(saved.room?.vertical),
  };
  defaults.body = { ...defaults.body, ...saved.surface };
  return defaults;
}
