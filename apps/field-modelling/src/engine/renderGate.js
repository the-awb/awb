// A counted "stop drawing for a moment" switch, shared between the field renderer and anything
// that needs the CPU more than the picture needs updating.
//
// This exists because of one measured thing. Attaching sclang compiles the 1.9MB class library,
// which the wasm build does with std::async across every core it can get. On a page that is also
// running the field shader the two compete, and the shader wins: measured in headless Chromium
// (software WebGL, so the fragment shader runs on the CPU) the compile finishes in about 5 seconds
// with no canvas, ~70 seconds at 200x200, and NOT AT ALL in five minutes at 800x600 or 1500x900.
// It is starvation rather than deadlock - the same compile completes fine given the cores.
//
// On a machine with a real GPU the renderer costs far less and the effect is smaller, but it is
// the same effect, and freezing a picture for a few seconds is obviously better than stalling the
// interpreter that is being started. The counter rather than a boolean so overlapping suspensions
// (two things starting at once) can't have one of them switch drawing back on for the other.
let suspensions = 0;

// Returns the release function. Call it in a finally - a leaked suspension leaves a frozen canvas
// with nothing on screen to explain why.
export function suspendRendering() {
  suspensions++;
  let released = false;
  return () => {
    if (released) return;
    released = true;
    suspensions--;
  };
}

export function renderingSuspended() {
  return suspensions > 0;
}
