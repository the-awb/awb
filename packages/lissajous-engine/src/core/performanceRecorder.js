// Records parameter changes as { time, groupId, field, value } events - source-agnostic, a GUI
// slider and an incoming OSC message are recorded identically. Resolving "what were group G's
// parameters at time T" during export replay is a last-event-at-or-before-T lookup per field,
// falling back to whatever the group's value was when recording started.
//
// Deliberately just data + pure functions, no React - this is what lets a heavy scene's slow
// rendering not matter for correctness: recording is cheap and keeps up with anything live,
// replay derives every frame's state from these timestamps regardless of how long each frame
// actually takes to render later.

// Every control belongs to something real. A PATTERN (one Lissajous curve, one entry in `groups`)
// owns its Lissajous render params plus its own placement in the scene. The SESSION owns what's
// global to the scene - the shared camera and the points/trails mode - addressed by SESSION_ID
// through the exact same chokepoint a pattern is, so recording/locking/OSC work identically for
// both without a parallel subsystem.
//
// Deliberately excluded: audio device selection, frame rate, canvas/output size, test mode, the
// OSC switch itself - technical setup, not performance expression.
export const LS_CONTROLS = [
  'audioScale', 'pointSize', 'pointOpacity', 'persistenceLength', 'persistenceDecay',
  'warpFactor', 'masterBrightness', 'depthScale', 'colorSaturation', 'colorRangeMin', 'colorRangeMax'
];
export const POSITION_CONTROLS = [ 'position', 'rotation' ];
export const SESSION_CONTROLS = [ 'cameraPosition', 'cameraTarget', 'visualizationMode' ];

// The id session-owned controls are recorded under - not a fake pattern, the session itself
// addressed the way a pattern is. Prefixed to never collide with a real group id.
export const SESSION_ID = '__session__';

export const AUTOMATED_FIELDS = [ ...LS_CONTROLS, ...POSITION_CONTROLS, ...SESSION_CONTROLS ];

export function createAutomationLog() {
  return { events: [], initial: {} };
}

// Snapshot each group's current values as the fallback for "before the first automation event".
// Only the pattern-owned fields apply per group - session-owned ones are snapshotted separately
// (snapshotSessionInitialValues) since they belong to the session, not any pattern.
export function snapshotInitialValues( log, groups, fields ) {
  const patternFields = fields.filter( ( f ) => !SESSION_CONTROLS.includes( f ) );
  for ( const group of groups ) {
    const values = {};
    for ( const field of patternFields ) values[ field ] = group[ field ];
    log.initial[ group.id ] = values;
  }
}

// The session's own baseline - camera framing and visualization mode as they stand when a
// recording starts, so replay before the first camera/mode event restores what was there.
export function snapshotSessionInitialValues( log, sessionValues ) {
  log.initial[ SESSION_ID ] = { ...sessionValues };
}

export function recordEvent( log, time, groupId, field, value ) {
  log.events.push( { time, groupId, field, value } );
}

// Resolve every automated field for one group at one point in time. Picks the qualifying event
// with the LATEST time, not the last one in array order - those coincide for a single plain take
// (events are pushed in time order as recording progresses), but punching into an already-recorded
// channel (re-arming and touching it again) appends new events after whatever was already in the
// log, and those new events can have earlier timestamps than existing ones later in the array.
// Resolving by time keeps a fresh touch correctly superseding an older event regardless of push
// order, with no explicit clearing step needed.
export function resolveGroupParamsAtTime( log, groupId, time ) {
  const resolved = { ...( log.initial[ groupId ] || {} ) };
  const latestByField = {};
  for ( const ev of log.events ) {
    if ( ev.groupId !== groupId || ev.time > time ) continue;
    const prev = latestByField[ ev.field ];
    if ( !prev || ev.time >= prev.time ) latestByField[ ev.field ] = ev;
  }
  for ( const field in latestByField ) resolved[ field ] = latestByField[ field ].value;
  return resolved;
}

export function hasEvents( log ) {
  return log.events.length > 0;
}

// Whether a channel (one group+field) has ever been recorded into this log - drives the per-field
// lock: while a recording is selected and not actively being recorded into, a channel with events
// is locked (following its recorded automation) rather than live.
export function channelHasEvents( log, groupId, field ) {
  return log.events.some( ( ev ) => ev.groupId === groupId && ev.field === field );
}

// Erase a channel entirely - after this, resolveGroupParamsAtTime falls back to log.initial for
// that field for the whole timeline, i.e. it behaves as an untouched static parameter again.
export function eraseChannel( log, groupId, field ) {
  log.events = log.events.filter( ( ev ) => !( ev.groupId === groupId && ev.field === field ) );
}
