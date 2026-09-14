// Shared point-cloud geometry math used by every audio pipeline (live, playback, export).
// Extracted unchanged from the original LissajousPoints/LissajousTrails implementations —
// this file has no opinion about where audio samples come from.

// Practical ceiling for one pattern. The former 88,201-point MOTU-derived cap was not usable in
// this app. Keeping a bounded allocation still prevents pathological legacy-session values; the
// renderer now uploads only its active range, so unused capacity is not rewritten every tick.
export const MAX_GEOMETRY_POINTS = 50_000;

export function clampPersistenceLength( persistenceLength ) {
  return Math.max( 1, Math.min( MAX_GEOMETRY_POINTS, persistenceLength ) );
}

// Trim the persistence buffer to its configured length.
//
// Samples used to carry an `age` counter incremented here every tick, which an earlier design read
// for two things: trimming (drop samples older than persistenceLength) and opacity falloff
// (persistenceDecay ^ age). Both are now derived from a sample's position in the buffer instead -
// trimming is a splice by count, and renderPersistenceBufferToGeometry computes bufferPosition -
// which is equivalent, since the buffer is in capture order. The counter outlived its readers and
// was costing a write per sample per frame per pattern.
export function trimPersistenceBuffer( persistenceBuffer, persistenceLength ) {
  if ( persistenceBuffer.length > persistenceLength ) {
    persistenceBuffer.splice( 0, persistenceBuffer.length - persistenceLength );
  }
}

// Write the current persistence buffer into the active prefix of the geometry's position/color
// typed arrays and return how many samples were rendered. drawRange excludes everything after
// that prefix, so clearing unused capacity would spend CPU and upload bandwidth without changing
// a pixel (the caller owns Three.js update ranges and drawRange).
export function renderPersistenceBufferToGeometry( {
  persistenceBuffer,
  positions,
  colors,
  audioScale,
  pointOpacity,
  persistenceDecay,
  masterBrightness,
  depthScale,
  colorSaturation,
  colorRangeMin,
  colorRangeMax,
  maxGeometryPoints = MAX_GEOMETRY_POINTS
} ) {
  const numSamplesToRender = Math.min( persistenceBuffer.length, maxGeometryPoints );

  for ( let i = 0; i < numSamplesToRender; i++ ) {
    // Render in reverse order so newest samples are drawn on top.
    const reverseIndex = numSamplesToRender - 1 - i;
    const sample = persistenceBuffer[ reverseIndex ];

    // bufferPosition: 0 = oldest, 1 = newest.
    const bufferPosition = ( numSamplesToRender - 1 - reverseIndex ) / numSamplesToRender;

    let x = sample.x * audioScale;
    let y = sample.y * audioScale;

    // Age-dependent warp using the warp value captured when the sample was pushed.
    if ( sample.warpAtCapture !== 0 ) {
      const ageWarpFactor = ( 1 - bufferPosition ); // oldest samples get max warp
      const warpAmount = sample.warpAtCapture * ageWarpFactor;
      const warpScale = 1 - warpAmount;
      x *= warpScale;
      y *= warpScale;
    }

    const zPosition = -reverseIndex * depthScale * 0.01; // newest at front

    positions[ i * 3 ] = x;
    positions[ i * 3 + 1 ] = y;
    positions[ i * 3 + 2 ] = zPosition;

    // Bipolar decay: 0 = full tail, +1 = fade tail (MOTU), -1 = fade head.
    let opacityFalloff;
    if ( persistenceDecay === 0 ) {
      opacityFalloff = 1.0;
    } else if ( persistenceDecay > 0 ) {
      opacityFalloff = Math.pow( bufferPosition, Math.abs( persistenceDecay ) * 3 );
    } else {
      opacityFalloff = Math.pow( 1 - bufferPosition, Math.abs( persistenceDecay ) * 3 );
    }
    const totalOpacity = opacityFalloff * pointOpacity * masterBrightness;

    // Full spectrum color interpolation: blue (old) -> cyan -> green -> yellow -> red (new).
    const normalizedAge = Math.max( 0, Math.min( 1, ( bufferPosition - colorRangeMin ) / ( colorRangeMax - colorRangeMin ) ) );
    const hue = normalizedAge * 240; // 240deg = blue (old), 0deg = red (new)

    const h = hue / 60;
    const saturation = colorSaturation;
    const c = masterBrightness * saturation;
    const hx = c * ( 1 - Math.abs( ( h % 2 ) - 1 ) );
    const grayComponent = masterBrightness * ( 1 - saturation );

    let r, g, b;
    if ( h < 1 ) {
      r = c + grayComponent; g = hx + grayComponent; b = grayComponent;
    } else if ( h < 2 ) {
      r = hx + grayComponent; g = c + grayComponent; b = grayComponent;
    } else if ( h < 3 ) {
      r = grayComponent; g = c + grayComponent; b = hx + grayComponent;
    } else {
      r = grayComponent; g = hx + grayComponent; b = c + grayComponent;
    }

    colors[ i * 3 ] = r * totalOpacity;
    colors[ i * 3 + 1 ] = g * totalOpacity;
    colors[ i * 3 + 2 ] = b * totalOpacity;
  }

  return numSamplesToRender;
}
