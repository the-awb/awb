export const BINARY_OPERATORS = Object.freeze( [
  '+', '-', '*', 'div', '/', 'mod', '==', '!=', '<', '>', '<=', '>=', 'min', 'max',
  'bitAnd', 'bitOr', 'bitXor', 'lcm', 'gcd', 'round', 'roundUp', 'trunc', 'atan2',
  'hypot', 'hypotApx', 'pow', 'leftShift', 'rightShift', 'unsignedRightShift', 'rrand', 'exprand'
] );

export const UNARY_OPERATORS = Object.freeze( [
  'neg', 'not', 'isNil', 'notNil', 'bitNot', 'abs', 'asFloat', 'asInteger', 'ceil',
  'floor', 'frac', 'sign', 'squared', 'cubed', 'sqrt', 'exp', 'reciprocal', 'midicps',
  'cpsmidi', 'midiratio', 'ratiomidi', 'dbamp', 'ampdb', 'octcps', 'cpsoct', 'log',
  'log2', 'log10', 'sin', 'cos', 'tan', 'asin', 'acos', 'atan', 'sinh', 'cosh',
  'tanh', 'distort', 'softclip', 'coin', 'digitValue', 'silence', 'thru', 'rectWindow',
  'hanWindow', 'welWindow', 'triWindow', 'ramp', 'scurve'
] );

const OSCILLATORS = new Map( [
  [ 'SinOsc', [ 'oscillatorFrequency', 'oscillatorPhase' ] ],
  [ 'SinOscFB', [ 'oscillatorFrequency', 'oscillatorFeedback' ] ],
  [ 'FSinOsc', [ 'oscillatorFrequency', 'oscillatorPhase' ] ],
  [ 'LFSaw', [ 'oscillatorFrequency', 'oscillatorPhase' ] ],
  [ 'LFTri', [ 'oscillatorFrequency', 'oscillatorPhase' ] ],
  [ 'LFPulse', [ 'oscillatorFrequency', 'oscillatorPhase', 'pulseWidth' ] ],
  [ 'Saw', [ 'oscillatorFrequency' ] ],
  [ 'Pulse', [ 'oscillatorFrequency', 'pulseWidth' ] ],
  [ 'Impulse', [ 'triggerFrequency', 'oscillatorPhase' ] ],
  [ 'VarSaw', [ 'oscillatorFrequency', 'oscillatorPhase', 'pulseWidth' ] ]
] );

const FILTERS = new Map( [
  [ 'LPF', [ 'signal', 'filterFrequency' ] ], [ 'HPF', [ 'signal', 'filterFrequency' ] ],
  [ 'BPF', [ 'signal', 'filterFrequency', 'filterRQ' ] ], [ 'BRF', [ 'signal', 'filterFrequency', 'filterRQ' ] ],
  [ 'RLPF', [ 'signal', 'filterFrequency', 'filterRQ' ] ], [ 'RHPF', [ 'signal', 'filterFrequency', 'filterRQ' ] ],
  [ 'Resonz', [ 'signal', 'filterFrequency', 'filterRQ' ] ], [ 'Ringz', [ 'signal', 'filterFrequency', 'decayTime' ] ]
] );

export function inputRole( ugen, inputIndex ) {
  const oscillator = OSCILLATORS.get( ugen.className );
  if ( oscillator ) return oscillator[ inputIndex ] ?? null;
  const filter = FILTERS.get( ugen.className );
  if ( filter ) return filter[ inputIndex ] ?? null;
  if ( [ 'Out', 'ReplaceOut', 'OffsetOut' ].includes( ugen.className ) ) {
    return inputIndex === 0 ? 'outputBus' : 'outputSignal';
  }
  if ( ugen.className === 'Pan2' ) return [ 'signal', 'panPosition', 'outputGain' ][ inputIndex ] ?? null;
  if ( ugen.className === 'Balance2' ) return [ 'leftSignal', 'rightSignal', 'panPosition', 'outputGain' ][ inputIndex ] ?? null;
  if ( ugen.className === 'EnvGen' ) {
    if ( inputIndex < 5 ) return [ 'envelopeGate', 'envelopeLevelScale', 'envelopeLevelBias', 'envelopeTimeScale', 'doneAction' ][ inputIndex ];
    if ( inputIndex === 5 ) return 'envelopeInitialLevel';
    if ( inputIndex === 6 ) return 'envelopeStageCount';
    if ( inputIndex === 7 ) return 'envelopeReleaseNode';
    if ( inputIndex === 8 ) return 'envelopeLoopNode';
    return [ 'envelopeLevel', 'envelopeTime', 'envelopeCurveShape', 'envelopeCurveValue' ][ ( inputIndex - 9 ) % 4 ];
  }
  return null;
}

export const DONE_ACTIONS = Object.freeze( {
  0: 'none', 1: 'pauseSelf', 2: 'freeSelf', 3: 'freeSelfAndPrevious',
  4: 'freeSelfAndNext', 5: 'freeSelfAndFreePrevious', 6: 'freeSelfAndFreeNext',
  7: 'freeSelfToHead', 8: 'freeSelfToTail', 9: 'freeSelfPausePrevious',
  10: 'freeSelfPauseNext', 11: 'freeSelfDeepFreePrevious', 12: 'freeSelfDeepFreeNext',
  13: 'freeAllInGroup', 14: 'freeGroup'
} );
