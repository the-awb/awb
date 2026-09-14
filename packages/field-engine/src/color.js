// Golden-angle hue stepping: each instrument's hue depends only on its own
// position in the instrument list, not on how many others exist -- adding or
// muting a different instrument never reshuffles colours that are already
// assigned. Shared between the canvas (per-channel uInstColor uniform) and
// the instrument list/detail panels (CSS swatches), so the colour used in the
// UI always matches the colour rendered in multi-hue mode.
const GOLDEN_ANGLE = 137.50776;

export function instrumentHue(index) {
  return (index * GOLDEN_ANGLE) % 360;
}

function hue2rgb(p, q, t) {
  if (t < 0) t += 1;
  if (t > 1) t -= 1;
  if (t < 1 / 6) return p + (q - p) * 6 * t;
  if (t < 1 / 2) return q;
  if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
  return p;
}

// s/l in 0..1; returns [r, g, b] in 0..1, for feeding the shader's colour uniform.
export function instrumentRgb(index, s = 0.68, l = 0.58) {
  const h = instrumentHue(index) / 360;
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;
  return [hue2rgb(p, q, h + 1 / 3), hue2rgb(p, q, h), hue2rgb(p, q, h - 1 / 3)];
}

function toHexByte(v) {
  return Math.round(Math.min(1, Math.max(0, v)) * 255).toString(16).padStart(2, '0');
}

// The auto-assigned default, as a hex string -- used to seed an instrument's
// editable `color` field when it's created, and as the fallback for older
// saved files that predate manual colour picking.
export function instrumentHex(index, s = 0.68, l = 0.58) {
  const [r, g, b] = instrumentRgb(index, s, l);
  return `#${toHexByte(r)}${toHexByte(g)}${toHexByte(b)}`;
}

export function hexToRgb(hex) {
  const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex || '');
  if (!m) return [1, 1, 1];
  return [parseInt(m[1], 16) / 255, parseInt(m[2], 16) / 255, parseInt(m[3], 16) / 255];
}

// An instrument's colour is user-editable (instrument.color) but seeded from
// its list position at creation time -- this is the single place that falls
// back to the auto default, for instruments saved before colour picking
// existed. Prefer this over reading instrument.color directly.
export function resolveInstrumentColor(inst, index) {
  return inst.color || instrumentHex(Math.max(index, 0));
}
