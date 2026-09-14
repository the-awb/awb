// Renderer-neutral field GLSL, ported verbatim from stereo-field-sources.html.
// Each channel radiates from its own speaker with its own gain, so it
// contributes one complex-phasor term per speaker. Summing phasors gives the
// analytic signal; its magnitude is the exact instantaneous envelope for any
// mix of frequencies. MAX_CH must match flatten.js's channel-array cap.
export const MAX_CH = 32;
// Distinct simultaneous hues in multi-hue colour mode. Capped well below
// MAX_CH -- past ~12 concurrent colours the blend just reads as mud anyway.
// Instruments beyond the cap wrap onto an existing slot (see FieldCanvas).
export const MAX_INST = 12;

export const PHYS = `
const float C = 343.0;
uniform float uSep, uSpkH, uPistonA;
uniform vec3 uAimL, uAimR;
uniform float uFq[${MAX_CH}], uGL[${MAX_CH}], uGR[${MAX_CH}], uOn[${MAX_CH}], uPh[${MAX_CH}];
// Per-channel colour-slot index (which instrument it belongs to, 0..MAX_INST-1)
// and the RGB assigned to each slot -- used only by fieldMulti() below.
uniform float uInstIdx[${MAX_CH}];
uniform vec3 uInstColor[${MAX_INST}];
uniform float uHighlight, uHighlightCount;
uniform float uHighlightInst[${MAX_INST}];

vec3 focusedHue(vec3 hue, float highlighted) {
  if (uHighlight < 0.5 || uHighlightCount < 0.5) return hue;
  if (highlighted > 0.5) return hue * 1.15;
  float grey = dot(hue, vec3(0.299, 0.587, 0.114));
  return mix(vec3(grey), hue, 0.35) * 0.50;
}

// Off-axis amplitude follows sin(x)/x, x = k*a*sin(theta) -- the exact far-field
// pattern of a strip/line aperture of half-width uPistonA (a circular piston's
// true pattern is the Bessel form 2*J1(x)/x; sin(x)/x is the cheaper, still
// physically-real stand-in used here, with the same qualitative behaviour:
// omnidirectional at low k*a, narrowing into a main lobe as it rises, and
// -- past x = pi -- genuine phase-inverted side lobes, not an artifact.
// Whether the cabinet also shadows its own rear depends on the SAME k*a: a
// cabinet is acoustically small at low frequency, so sound diffracts around
// the whole enclosure and radiates all the way behind it too (this is why a
// sub can sit facing any which way and still fill a room) -- shadowing only
// appears once the enclosure is acoustically large relative to the
// wavelength, i.e. the same regime where the piston pattern itself narrows.
// gateStrength ramps the rear cutoff in over that same transition rather
// than applying it at every frequency.
float directivity(vec3 dir, vec3 aim, float k) {
  float c = dot(dir, aim);
  float s = sqrt(max(0.0, 1.0 - c * c));
  float ka = k * uPistonA;
  float x = ka * s;
  float d = x < 1e-4 ? 1.0 : sin(x) / x;
  float gateStrength = smoothstep(0.3, 2.0, ka);
  float frontGate = smoothstep(-0.15, 0.15, c);
  return d * mix(1.0, frontGate, gateStrength);
}

vec3 fieldAt(vec3 p) {
  vec3 sL = vec3(-uSep*0.5, uSpkH, 0.0);
  vec3 sR = vec3( uSep*0.5, uSpkH, 0.0);
  vec3 toL = p - sL, toR = p - sR;
  float d1 = max(length(toL), 0.25);
  float d2 = max(length(toR), 0.25);
  vec3 dirL = toL / d1, dirR = toR / d2;
  float re = 0.0, im = 0.0, mx = 0.0;
  for (int i = 0; i < ${MAX_CH}; i++) {
    if (uOn[i] < 0.5) continue;
    float k = 6.2831853 * uFq[i] / C;
    // uPh[i] is 2*pi*f*t already unwound modulo 2*pi in JS double precision each
    // frame, not raw elapsed time -- keeps this stable no matter how long the
    // page has been running (a raw growing time uniform loses float32 phase
    // precision after a few minutes at audio-band frequencies and the pattern
    // degrades into fast noise).
    float w = uPh[i];
    float aL = uGL[i] / d1 * directivity(dirL, uAimL, k);
    float aR = uGR[i] / d2 * directivity(dirR, uAimR, k);
    float pL = w - k * d1, pR = w - k * d2;
    re += aL * cos(pL) + aR * cos(pR);
    im += aL * sin(pL) + aR * sin(pR);
    // mx is the achievable-amplitude ceiling used to normalise Contrast/
    // Wavefronts (f.x/f.z, f.y/f.z below). Past a side lobe's null, aL/aR
    // legitimately go negative (phase-inverted), and a signed sum can cross
    // zero right there -- clamped up to the 1e-5 floor, that turns a tiny
    // true denominator into a huge, spurious ratio: a phantom bright band or
    // isosurface exactly on the side-lobe boundary, unrelated to the real
    // field. Summing magnitudes instead keeps mx a true ceiling regardless of
    // sign.
    mx += abs(aL) + abs(aR);
  }
  return vec3(sqrt(re*re + im*im), re, max(mx, 1e-5));
}

// Same phasor sum as fieldAt(), but kept separate per instrument (colour
// slot) instead of collapsed into one global re/im -- the analytic-signal
// magnitude is still exact per instrument, since it's linear in that
// instrument's own channels.
//
// Deliberately an outer loop over colour slots with an inner pass over
// channels (O(MAX_INST*MAX_CH)), rather than one pass accumulating into
// re[idx]/im[idx] at a data-dependent idx -- every array access here is by
// a loop's own induction variable, never by a value read out of a uniform,
// which is the one indexing pattern guaranteed to work on every GLSL target
// (some software/older-driver compilers choke badly on true dynamic
// indexing, to the point of pathological slowdown).
void fieldMulti(vec3 p, out float mag[${MAX_INST}]) {
  vec3 sL = vec3(-uSep*0.5, uSpkH, 0.0);
  vec3 sR = vec3( uSep*0.5, uSpkH, 0.0);
  vec3 toL = p - sL, toR = p - sR;
  float d1 = max(length(toL), 0.25);
  float d2 = max(length(toR), 0.25);
  vec3 dirL = toL / d1, dirR = toR / d2;
  for (int j = 0; j < ${MAX_INST}; j++) {
    float re = 0.0, im = 0.0;
    for (int i = 0; i < ${MAX_CH}; i++) {
      if (uOn[i] < 0.5) continue;
      if (int(uInstIdx[i] + 0.5) != j) continue;
      float k = 6.2831853 * uFq[i] / C;
      float w = uPh[i];
      float aL = uGL[i] / d1 * directivity(dirL, uAimL, k);
      float aR = uGR[i] / d2 * directivity(dirR, uAimR, k);
      float pL = w - k * d1, pR = w - k * d2;
      re += aL * cos(pL) + aR * cos(pR);
      im += aL * sin(pL) + aR * sin(pR);
    }
    mag[j] = sqrt(re*re + im*im);
  }
}

// Blends each instrument's own raw envelope (gamma-matched to the Level
// ramp) through its assigned hue -- overlapping instruments add like
// overlapping colored lights, brightness carries amplitude per hue instead
// of one shared scalar carrying everything.
vec3 multiHueColor(vec3 p, float gain) {
  float mag[${MAX_INST}];
  fieldMulti(p, mag);
  vec3 col = vec3(0.0);
  for (int j = 0; j < ${MAX_INST}; j++) {
    col += focusedHue(uInstColor[j], uHighlightInst[j]) * pow(clamp(mag[j] * gain * 0.85, 0.0, 1.0), 0.75);
  }
  return col;
}

// Contours are derived independently from each instrument's envelope. Using
// the composite magnitude here would make every line describe the summed
// field, then merely tint that same geometry -- misleading in multi-hue mode.
// Each instrument instead contributes its own crossings in its own hue, and
// coincident lines add like the multi-hue gradient above.
void multiHueSurface(vec3 p, float gain, float contourOn, float contourN, out vec3 color, out vec3 lines) {
  float mag[${MAX_INST}];
  fieldMulti(p, mag);
  color = vec3(0.0);
  lines = vec3(0.0);
  for (int j = 0; j < ${MAX_INST}; j++) {
    if (mag[j] < 1e-6) continue;
    float nv = pow(clamp(mag[j] * gain * 0.85, 0.0, 1.0), 0.75);
    color += focusedHue(uInstColor[j], uHighlightInst[j]) * nv;
    if (contourOn < 0.5) continue;
    float g = nv * contourN;
    float d = abs(fract(g - 0.5) - 0.5);
    float w = fwidth(g) * 1.25 + 1e-4;
    // Do not count the zero boundary as a contour: inactive/vanishing fields
    // would otherwise paint the entire surface with their colour.
    float line = (1.0 - smoothstep(0.0, w, d)) * smoothstep(0.0, w * 2.0, g);
    lines += focusedHue(uInstColor[j], uHighlightInst[j]) * line;
  }
}

vec3 ramp(float x) {
  x = clamp(x, 0.0, 1.0);
  vec3 a = vec3(0.02, 0.02, 0.10);
  vec3 b = vec3(0.32, 0.08, 0.52);
  vec3 c = vec3(0.86, 0.24, 0.42);
  vec3 d = vec3(1.00, 0.86, 0.62);
  if (x < 0.34) return mix(a, b, x / 0.34);
  if (x < 0.70) return mix(b, c, (x - 0.34) / 0.36);
  return mix(c, d, (x - 0.70) / 0.30);
}
`;

export const VERT = `
varying vec3 vPos;
void main() {
  vPos = (modelMatrix * vec4(position, 1.0)).xyz;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

export const SLICE_FRAG = `
precision highp float;
varying vec3 vPos;
uniform float uGain, uMode, uContour, uContourN, uColorMode, uOpacity;
${PHYS}
void main() {
  vec3 f = fieldAt(vPos);
  vec3 col;
  vec3 multiLines = vec3(0.0);
  float nv;
  if (uColorMode > 0.5) {
    // Multi-hue stands in for "Level" regardless of the Level/Contrast/
    // Wavefronts choice -- signed pressure and mx-normalised contrast don't
    // have a meaningful per-instrument-hue analogue. nv remains available for
    // the composite path; multi-hue contours below use each instrument's own
    // envelope instead.
    multiHueSurface(vPos, uGain, uContour, uContourN, col, multiLines);
    nv = pow(clamp(f.x * uGain * 0.85, 0.0, 1.0), 0.75);
  } else if (uMode > 1.5) {
    float s = clamp(f.y / f.z * uGain, -1.0, 1.0);
    col = s > 0.0 ? vec3(1.0, 0.55, 0.25) * s : vec3(0.25, 0.6, 1.0) * (-s);
    nv = abs(s);
  } else if (uMode > 0.5) {
    nv = pow(clamp(f.x / f.z, 0.0, 1.0), 0.75);
    col = ramp(nv);
  } else {
    nv = pow(clamp(f.x * uGain * 0.85, 0.0, 1.0), 0.75);
    col = ramp(nv);
  }
  // Topo-map style contour lines: bands of the same normalised scalar that
  // already drives the colour ramp, drawn where it crosses evenly spaced
  // levels. fwidth() keeps the line a constant ~1.5px regardless of how
  // steep the field is at that point, so lines stay thin near the speakers
  // and don't vanish in flat, far-field regions.
  if (uContour > 0.5 && uColorMode > 0.5) {
    if (uContour > 1.5) {
      col = multiLines;
    } else {
      col = max(col, multiLines);
    }
  } else if (uContour > 0.5) {
    float g = nv * uContourN;
    float d = abs(fract(g - 0.5) - 0.5);
    float w = fwidth(g) * 1.25 + 1e-4;
    float line = 1.0 - smoothstep(0.0, w, d);
    if (uContour > 1.5) {
      col = vec3(line);
    } else {
      col = mix(col, vec3(1.0) - col, line * 0.85);
    }
  }
  gl_FragColor = vec4(col, uOpacity);
}
`;

export const SHELL_FRAG = `
precision highp float;
varying vec3 vPos;
uniform float uIso, uShellWave, uColorMode, uGain;
uniform vec3 uCam, uBoxMin, uBoxMax;
${PHYS}
float scalarAt(vec3 p) {
  vec3 f = fieldAt(p);
  if (uShellWave > 0.5) return f.y / f.z * 0.5 + 0.5;
  return f.x / f.z;
}
vec2 boxHit(vec3 ro, vec3 rd) {
  vec3 t0 = (uBoxMin - ro) / rd, t1 = (uBoxMax - ro) / rd;
  vec3 lo = min(t0, t1), hi = max(t0, t1);
  return vec2(max(max(lo.x, lo.y), lo.z), min(min(hi.x, hi.y), hi.z));
}
void main() {
  vec3 ro = uCam, rd = normalize(vPos - uCam);
  vec2 h = boxHit(ro, rd);
  if (h.y <= max(h.x, 0.0)) discard;
  float tA = max(h.x, 0.0), tB = h.y;
  const int STEPS = 110;
  float dt = (tB - tA) / float(STEPS);
  float prev = scalarAt(ro + rd * tA) - uIso;
  float tHit = -1.0;
  for (int i = 1; i <= STEPS; i++) {
    float t = tA + dt * float(i);
    float cur = scalarAt(ro + rd * t) - uIso;
    if (prev * cur < 0.0) { tHit = t - dt * cur / (cur - prev); break; }
    prev = cur;
  }
  if (tHit < 0.0) discard;
  vec3 p = ro + rd * tHit;
  float e = 0.012;
  vec3 nrm = normalize(vec3(
    scalarAt(p + vec3(e,0.0,0.0)) - scalarAt(p - vec3(e,0.0,0.0)),
    scalarAt(p + vec3(0.0,e,0.0)) - scalarAt(p - vec3(0.0,e,0.0)),
    scalarAt(p + vec3(0.0,0.0,e)) - scalarAt(p - vec3(0.0,0.0,e))));
  vec3 L = normalize(vec3(0.4, 0.9, 0.5));
  float dif = abs(dot(nrm, L)) * 0.72 + 0.28;
  float rim = pow(1.0 - abs(dot(nrm, -rd)), 2.0);
  // Same iso-surface, but coloured by which instrument dominates at each
  // point on it rather than one flat shade -- the surface itself doesn't
  // move, only how it's painted.
  vec3 base = uColorMode > 0.5 ? multiHueColor(p, uGain) : ramp(uIso);
  float fog = 1.0 - clamp((tHit - tA) / max(tB - tA, 1e-4), 0.0, 1.0) * 0.45;
  gl_FragColor = vec4((base * dif + vec3(0.3) * rim) * fog, 1.0);
}
`;
