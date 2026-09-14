// CPU counterpart to the field shader, kept in the portable field package.
const TWO_PI = Math.PI * 2;
const SPEED_OF_SOUND = 343;

function smoothstep(edge0, edge1, value) {
  const x = Math.max(0, Math.min(1, (value - edge0) / (edge1 - edge0)));
  return x * x * (3 - 2 * x);
}

function directivity(direction, aim, waveNumber, pistonRadius) {
  const cosine = direction[0] * aim[0] + direction[1] * aim[1] + direction[2] * aim[2];
  const sine = Math.sqrt(Math.max(0, 1 - cosine * cosine));
  const ka = waveNumber * pistonRadius;
  const x = ka * sine;
  const pattern = Math.abs(x) < 1e-4 ? 1 : Math.sin(x) / x;
  const gateStrength = smoothstep(0.3, 2, ka);
  const frontGate = smoothstep(-0.15, 0.15, cosine);
  return pattern * ((1 - gateStrength) + frontGate * gateStrength);
}

function path(point, speaker) {
  const delta = [point[0] - speaker[0], point[1] - speaker[1], point[2] - speaker[2]];
  const distance = Math.max(Math.hypot(...delta), 0.25);
  return { distance, direction: delta.map((value) => value / distance) };
}

function displayIntensity(amplitude, displayGain) {
  return Math.pow(Math.max(0, Math.min(1, amplitude * displayGain * 0.85)), 0.75);
}

function mix(a, b, amount) {
  return a.map((value, index) => value + (b[index] - value) * amount);
}

// Keep this colour ramp in step with ramp() in shaders.js.
function compositeColor(intensity) {
  const a = [0.02, 0.02, 0.10], b = [0.32, 0.08, 0.52];
  const c = [0.86, 0.24, 0.42], d = [1.00, 0.86, 0.62];
  const rgb = intensity < 0.34
    ? mix(a, b, intensity / 0.34)
    : intensity < 0.70
      ? mix(b, c, (intensity - 0.34) / 0.36)
      : mix(c, d, (intensity - 0.70) / 0.30);
  return `rgb(${rgb.map((value) => Math.round(value * 255)).join(' ')})`;
}

// Returns one spectral component per projected channel. Amplitude uses the
// exact 1/r, propagation-phase and directivity equations in shaders.js. Units
// are deliberately relative: source gains are not calibrated pascals.
export function sampleFieldComponents(channels, room, point, displayGain = 1) {
  const left = [-room.sep * 0.5, room.spkH, 0];
  const right = [room.sep * 0.5, room.spkH, 0];
  const toe = (room.conv * Math.PI / 180) * 0.5;
  const aimL = [Math.sin(toe), 0, Math.cos(toe)];
  const aimR = [-Math.sin(toe), 0, Math.cos(toe)];
  const pL = path(point, left), pR = path(point, right);
  const grouped = new Map();
  for (const channel of channels) {
    if (channel.freq <= 0 || (!channel.gl && !channel.gr)) continue;
    const k = TWO_PI * channel.freq / SPEED_OF_SOUND;
    const aL = channel.gl / pL.distance * directivity(pL.direction, aimL, k, room.pistonA);
    const aR = channel.gr / pR.distance * directivity(pR.direction, aimR, k, room.pistonA);
    const phase = channel.phase ?? 0;
    const re = aL * Math.cos(phase - k * pL.distance) + aR * Math.cos(phase - k * pR.distance);
    const im = aL * Math.sin(phase - k * pL.distance) + aR * Math.sin(phase - k * pR.distance);
    const key = `${channel.instId}:${channel.freq}`;
    const component = grouped.get(key) ?? { ...channel, re: 0, im: 0, slots: [] };
    component.re += re;
    component.im += im;
    component.slots.push(channel.slot);
    grouped.set(key, component);
  }
  return [...grouped.values()].map((channel) => {
    const { re, im } = channel;
    const amplitude = Math.hypot(re, im);
    return {
      ...channel,
      slot: channel.slots.join('+'),
      re,
      im,
      amplitude,
      intensityProxy: amplitude * amplitude,
      colorIntensity: displayIntensity(amplitude, displayGain),
    };
  });
}

export function sampleInstrumentColors(channels, room, point, displayGain = 1) {
  return sampleColorReadings(channels, room, point, displayGain).instruments;
}

export function sampleColorReadings(channels, room, point, displayGain = 1) {
  const components = sampleFieldComponents(channels, room, point, displayGain);
  const instruments = new Map();
  let totalRe = 0, totalIm = 0;
  for (const component of components) {
    const value = instruments.get(component.instId) ?? { re: 0, im: 0 };
    value.re += component.re;
    value.im += component.im;
    instruments.set(component.instId, value);
    totalRe += component.re;
    totalIm += component.im;
  }
  const instrumentReadings = new Map([...instruments].map(([instId, value]) => {
    const amplitude = Math.hypot(value.re, value.im);
    const colorIntensity = displayIntensity(amplitude, displayGain);
    return [instId, { amplitude, colorIntensity }];
  }));
  const amplitude = Math.hypot(totalRe, totalIm);
  const colorIntensity = displayIntensity(amplitude, displayGain);
  return {
    instruments: instrumentReadings,
    composite: { amplitude, colorIntensity, color: compositeColor(colorIntensity) },
  };
}
