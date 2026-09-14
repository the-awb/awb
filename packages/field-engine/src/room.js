// Room geometry helpers, ported from stereo-field-sources.html. Shared by
// FieldCanvas (which needs the actual mesh transforms) and RoomPanel (which
// needs the same numbers for its live readouts and slider bounds).

// Convergence is the angle BETWEEN the two speakers' aim axes: 0 deg =
// parallel, firing straight ahead (the focal point sits infinitely far out);
// 180 deg = each speaker rotated a full 90 deg to aim directly at the other,
// meeting at the speaker line itself. Toe-in per speaker is half of that.
export function toeInRad(conv) {
  return (conv * Math.PI / 180) / 2;
}

export function focalDistance(conv, sep) {
  const t = toeInRad(conv);
  if (t < 1e-4) return Infinity;
  return (sep / 2) / Math.tan(t);
}

// The room is a disc: a diameter, and how much of it sits behind the speaker
// line (z=0) versus in front. centerZ follows from those two.
export function roomGeom(roomDiam, roomBack) {
  const r = roomDiam / 2;
  const back = Math.min(roomBack, roomDiam - 0.5);
  return { r, back, centerZ: r - back };
}
