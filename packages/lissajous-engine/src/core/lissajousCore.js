import {
  SESSION_ID,
  channelHasEvents,
  hasEvents,
  resolveGroupParamsAtTime
} from './performanceRecorder.js';

// Resolve only channels that this recording actually contains. The automation log also stores
// baseline values for untouched channels, but forwarding those every tick would pin live controls
// to their recording-start values even though the performer never automated them.
function resolveRecordedFields( automationLog, ownerId, time ) {
  const resolved = resolveGroupParamsAtTime( automationLog, ownerId, time );
  const recorded = {};

  for ( const field of Object.keys( resolved ) ) {
    if ( channelHasEvents( automationLog, ownerId, field ) ) recorded[ field ] = resolved[ field ];
  }

  return { recorded, resolved };
}

// Framework-neutral per-tick boundary shared by render adapters. It deliberately has no React,
// R3F, canvas or renderer ownership: an R3F adapter calls it from useFrame; a vanilla adapter can
// call the same function from requestAnimationFrame or deterministic indexed stepping.
//
// getNewSamples is invoked exactly once. Every pattern rendered during this tick receives the same
// returned object, so a draining source cannot starve all but the first pattern.
export function tickLissajousCore( {
  getNewSamples,
  automationLog,
  groupIds = [],
  isExporting = false,
  playheadPosition = 0
} ) {
  const newSamples = getNewSamples ? getNewSamples() : null;

  // Export resolves automation from its frame index in useVideoExport. Re-resolving it here from
  // the live playhead would make two clocks compete and break deterministic replay.
  if ( isExporting || !automationLog || !hasEvents( automationLog ) ) {
    return {
      newSamples,
      automationOverrides: null,
      sessionControls: null
    };
  }

  const automationOverrides = {};
  for ( const groupId of groupIds ) {
    automationOverrides[ groupId ] = resolveRecordedFields(
      automationLog,
      groupId,
      playheadPosition
    ).recorded;
  }

  const session = resolveRecordedFields( automationLog, SESSION_ID, playheadPosition );

  // Preserve the existing R3F bridge contract: pattern entries contain only recorded fields,
  // while the session entry contains its fully resolved snapshot. Only recorded session fields are
  // applied to the live camera/mode; keeping the full entry avoids changing downstream consumers.
  automationOverrides[ SESSION_ID ] = session.resolved;

  return {
    newSamples,
    automationOverrides,
    sessionControls: session.recorded
  };
}
