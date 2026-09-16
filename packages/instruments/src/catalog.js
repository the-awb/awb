// The practice-specific instrument vocabulary. This is deliberately plain data: browser, desktop
// and offline integrations need one meaning for these names, without inheriting a renderer or a
// live SuperCollider engine. Helpers below materialise the small speaker-dependent parts.

const numberEditor = ( label, min, max, step, decimals, unit = '' ) => (
  { kind: 'number', label, min, max, step, decimals, unit }
);

const envelopeTimeEditor = ( label ) => numberEditor( label, 0, 3600, 0.1, 2, ' s' );
const controlValue = ( name, defaultValue ) => ( { kind: 'control', name, default: defaultValue } );
const productValue = ( ...factors ) => ( { kind: 'product', factors } );
const maximumValue = ( ...values ) => ( { kind: 'max', values } );
const sumValue = ( ...values ) => ( { kind: 'sum', values } );
const subtractValue = ( left, right ) => ( { kind: 'subtract', left, right } );
const lessThanValue = ( left, right ) => ( { kind: 'lessThan', left, right } );
const conditionalValue = ( condition, whenTrue, whenFalse ) => ( {
  kind: 'conditional', condition, whenTrue, whenFalse
} );
const oneMinusValue = ( value ) => ( { kind: 'oneMinus', value } );

const amplitudeAsr = ( attack, release ) => ( {
  id: 'amplitude', label: 'Amplitude', role: 'amplitude', target: 'outputGain',
  shape: 'gatedAsr', gateControl: 'gate', completionAction: 'freeNode', attack, release
} );

function substrateEnvelopes( attackDefault, releaseDefault ) {
  const attack = controlValue( 'attackT', attackDefault );
  const release = controlValue( 'releaseT', releaseDefault );
  const beatRelease = productValue( release, controlValue( 'beatEnvRRatio', 0.5 ) );
  const tremRelease = controlValue( 'tremR', 0 );
  const beatTail = maximumValue( beatRelease, tremRelease, release );
  const tremTail = maximumValue( tremRelease, beatRelease, release );
  // This deliberately mirrors the SynthDef's ampRDelay expression, including its asymmetric
  // comparison. The catalog describes the graph that runs, not the tidier graph it may resemble.
  const ampDelayBasis = maximumValue( beatRelease, tremRelease );
  const ampTail = sumValue(
    conditionalValue(
      lessThanValue( beatRelease, ampDelayBasis ),
      subtractValue( ampDelayBasis, release ),
      0
    ),
    release
  );
  return [
    { ...amplitudeAsr( attack, ampTail ), releaseControl: 'releaseT' },
    {
      id: 'beat', label: 'Beat modulation', role: 'modulation', target: 'beatFrequency',
      shape: 'gatedAsr', gateControl: 'gate',
      attack: productValue( attack, controlValue( 'beatEnvARatio', 0.5 ) ), release: beatTail
    },
    {
      id: 'tremolo', label: 'Tremolo depth', role: 'modulation', target: 'tremoloDepth',
      shape: 'gatedAsr', gateControl: 'gate',
      attack: controlValue( 'tremA', 0 ), release: tremTail
    }
  ];
}

const RAW_CATALOG = {
  basic: {
    key: 'basic',
    label: 'Basic',
    synthDef: 'fieldBasic',
    gainControl: 'amp',
    primaryFrequency: { kind: 'speakerControl', prefix: 'freq', speakerIndex: 0 },
    noteLifecycle: { kind: 'gatedTotalDuration', durationKey: 'dur' },
    envelopes: [ amplitudeAsr( controlValue( 'attackT', 2 ), controlValue( 'releaseT', 4 ) ) ],
    controls: {
      amp: { role: 'continuousGain' },
      attackT: { role: 'envelopeAttack', synthDefault: 2, editor: envelopeTimeEditor( 'Attack' ) },
      releaseT: { role: 'envelopeRelease', synthDefault: 4, editor: envelopeTimeEditor( 'Release' ) }
    },
    speakerControls: [
      {
        prefix: 'freq', role: 'frequency', scalesWithTime: true,
        default: { start: 60, step: 0.1 },
        editor: numberEditor( '{speaker} freq', 20, 1000, 0.1, 1, ' Hz' )
      },
      {
        prefix: 'amp', role: 'amplitude', default: { value: 1 },
        editor: numberEditor( '{speaker} amp', 0, 1, 0.01, 2 )
      }
    ]
  },

  substrate: {
    key: 'substrate',
    label: 'Substrate',
    synthDef: 'substrate',
    gainControl: 'amp',
    primaryFrequency: { kind: 'control', name: 'freqA' },
    noteLifecycle: { kind: 'gatedTotalDuration', durationKey: 'dur' },
    envelopes: substrateEnvelopes( 12, 12 ),
    controls: {
      freqA: { role: 'frequency', scalesWithTime: true, initial: 60, editor: numberEditor( 'Freq', 20, 25000, 0.1, 1, ' Hz' ) },
      beat: { role: 'frequencyOffset', scalesWithTime: true, initial: 4, editor: numberEditor( 'Beat', -20, 20, 0.05, 2, ' Hz' ) },
      freqQ: { role: 'frequency', scalesWithTime: true, initial: 0.066, editor: numberEditor( 'Freq Q', 0.01, 1, 0.001, 3, ' Hz' ) },
      movement: { role: 'movementDepth', initial: 0, editor: numberEditor( 'Movement', 0, 2, 0.01, 2 ) },
      tremF: { role: 'frequency', scalesWithTime: true },
      difF: { role: 'frequencyOffset', scalesWithTime: true },
      amp: { role: 'continuousGain' },
      attackT: { role: 'envelopeAttack', synthDefault: 12, editor: envelopeTimeEditor( 'Attack' ) },
      releaseT: { role: 'envelopeRelease', synthDefault: 12, editor: envelopeTimeEditor( 'Release' ) }
    }
  },

  substrate2: {
    key: 'substrate2',
    label: 'Substrate 2',
    synthDef: 'substrate2',
    gainControl: 'amp',
    primaryFrequency: { kind: 'control', name: 'freq' },
    noteLifecycle: { kind: 'gatedTotalDuration', durationKey: 'dur' },
    envelopes: substrateEnvelopes( 30, 30 ),
    editorOrder: [ 'freq', 'beat', 'slowBeat', 'slowBeatBlend', 'beatBlend', 'freqQ', 'movement' ],
    frequencyOrder: [ 'freq', 'beat', 'slowBeat', 'freqQ', 'tremF', 'difF' ],
    controls: {
      freq: { role: 'frequency', scalesWithTime: true, initial: 60, editor: numberEditor( 'Freq', 20, 25000, 0.1, 1, ' Hz' ) },
      slowBeat: { role: 'frequencyOffset', scalesWithTime: true, initial: 2, editor: numberEditor( 'Slow beat', -10, 10, 0.05, 2, ' Hz' ) },
      beat: { role: 'frequencyOffset', scalesWithTime: true, initial: 4, editor: numberEditor( 'Beat', -20, 20, 0.05, 2, ' Hz' ) },
      slowBeatBlend: { role: 'blend', initial: 1, editor: numberEditor( 'Slow-beat blend', 0, 1, 0.01, 2 ) },
      beatBlend: { role: 'blend', initial: 1, editor: numberEditor( 'Beat blend', 0, 1, 0.01, 2 ) },
      flip: { role: 'routing', initial: false, editor: { kind: 'boolean', label: 'Flip L/R', onLabel: 'Flipped', offLabel: 'Normal' } },
      freqQ: { role: 'frequency', scalesWithTime: true, initial: 0.066, editor: numberEditor( 'Freq Q', 0.01, 1, 0.001, 3, ' Hz' ) },
      movement: { role: 'movementDepth', initial: 0, editor: numberEditor( 'Movement', 0, 2, 0.01, 2 ) },
      tremF: { role: 'frequency', scalesWithTime: true },
      difF: { role: 'frequencyOffset', scalesWithTime: true },
      amp: { role: 'continuousGain' },
      attackT: { role: 'envelopeAttack', synthDefault: 30, editor: envelopeTimeEditor( 'Attack' ) },
      releaseT: { role: 'envelopeRelease', synthDefault: 30, editor: envelopeTimeEditor( 'Release' ) }
    }
  },

  resobass2: {
    key: 'resobass2',
    label: 'Resobass2',
    synthDef: 'resonantBassEnv2',
    gainControl: 'amp',
    primaryFrequency: { kind: 'control', name: 'freq' },
    envelopes: [
      amplitudeAsr(
        productValue( controlValue( 'sustain', 5 ), controlValue( 'ampEnvRatio', 0.5 ) ),
        productValue( controlValue( 'sustain', 5 ), controlValue( 'ampEnvRatio', 0.5 ) )
      ),
      {
        id: 'frequency-motion', label: 'Frequency motion', role: 'modulation',
        target: [ 'frequencyOffset', 'beatCrossfade' ], shape: 'triangle',
        duration: controlValue( 'dur', 10 )
      },
      {
        id: 'phase-modulation', label: 'Phase modulation', role: 'modulation',
        target: 'phaseModulationIndex', shape: 'perc', depth: controlValue( 'phaseMod', 1.8 ),
        attack: productValue( controlValue( 'dur', 10 ), controlValue( 'phaseEnvRatio', 0.5 ) ),
        release: productValue(
          controlValue( 'dur', 10 ), oneMinusValue( controlValue( 'phaseEnvRatio', 0.5 ) )
        )
      }
    ],
    note: 'Sideband synthesis not implemented yet -- this instrument currently contributes no sound to the field.',
    controls: {
      freq: { role: 'frequency', scalesWithTime: true, initial: 50, editor: numberEditor( 'Freq', 20, 25000, 0.1, 1, ' Hz' ) },
      sinMod: { role: 'frequencyOffset', scalesWithTime: true, initial: 0.5, editor: numberEditor( 'Sin mod', 0, 2, 0.01, 2 ) },
      phaseMod: { role: 'phaseDepth', initial: 1.8, editor: numberEditor( 'Phase mod', 0, 5, 0.01, 2 ) },
      beat: { role: 'frequencyOffset', scalesWithTime: true, initial: 0.5, editor: numberEditor( 'Beat', -20, 20, 0.05, 2, ' Hz' ) },
      modFreqRatio: { role: 'frequencyRatio', initial: 1, editor: numberEditor( 'Mod freq ratio', 0.1, 8, 0.01, 2, '×' ) },
      amp: { role: 'continuousGain' },
      dur: { role: 'synthEnvelopeDuration', synthDefault: 10 },
      sustain: { role: 'envelopeBasis', synthDefault: 5, editor: envelopeTimeEditor( 'Envelope sustain basis' ) },
      ampEnvRatio: { role: 'envelopeRatio', synthDefault: 0.5, editor: numberEditor( 'Amplitude envelope ratio', 0, 4, 0.01, 2, '×' ) },
      phaseEnvRatio: { role: 'envelopeRatio', synthDefault: 0.5, editor: numberEditor( 'Phase envelope split', 0, 1, 0.01, 2 ) },
      beatEnvMod: { role: 'blend', synthDefault: 0, editor: numberEditor( 'Beat envelope blend', 0, 1, 0.01, 2 ) }
    }
  }
};

function deepFreeze( value ) {
  if ( value && typeof value === 'object' && !Object.isFrozen( value ) ) {
    Object.freeze( value );
    for ( const child of Object.values( value ) ) deepFreeze( child );
  }
  return value;
}

export const INSTRUMENT_CATALOG = deepFreeze( RAW_CATALOG );
export const INSTRUMENT_TYPE_KEYS = Object.freeze( Object.keys( INSTRUMENT_CATALOG ) );

export function instrumentType( key ) {
  return INSTRUMENT_CATALOG[ key ] ?? null;
}

function materialiseSpeakerControl( template, speaker, index ) {
  const name = `${ template.prefix }${ speaker.id }`;
  const fallback = template.default.value ?? ( template.default.start + template.default.step * index );
  const editor = template.editor;
  return {
    name,
    initial: fallback,
    role: template.role,
    scalesWithTime: template.scalesWithTime === true,
    editor: {
      ...editor,
      label: editor.label.replace( '{speaker}', speaker.label )
    }
  };
}

export function instrumentControls( key, speakers = [] ) {
  const descriptor = instrumentType( key );
  if ( !descriptor ) return [];
  const controls = Object.entries( descriptor.controls ).map( ( [ name, control ] ) => (
    { name, ...control }
  ) );
  for ( const [ index, speaker ] of speakers.entries() ) {
    for ( const template of descriptor.speakerControls ?? [] ) {
      controls.push( materialiseSpeakerControl( template, speaker, index ) );
    }
  }
  return controls;
}

export function instrumentDefaultParams( key, speakers = [] ) {
  const params = {};
  for ( const control of instrumentControls( key, speakers ) ) {
    if ( Object.hasOwn( control, 'initial' ) ) params[ control.name ] = control.initial;
  }
  return params;
}

export function instrumentFields( key, speakers = [] ) {
  const descriptor = instrumentType( key );
  const controls = instrumentControls( key, speakers )
    .filter( ( control ) => control.editor?.kind === 'number' );
  if ( descriptor?.editorOrder ) {
    const order = new Map( descriptor.editorOrder.map( ( name, index ) => [ name, index ] ) );
    controls.sort( ( a, b ) => ( order.get( a.name ) ?? Infinity ) - ( order.get( b.name ) ?? Infinity ) );
  }
  return controls
    .map( ( control ) => ( {
      path: [ control.name ], label: control.editor.label,
      min: control.editor.min, max: control.editor.max, step: control.editor.step,
      decimals: control.editor.decimals, unit: control.editor.unit,
      defaultValue: control.initial ?? control.synthDefault
    } ) );
}

export function instrumentBooleanFields( key, speakers = [] ) {
  return instrumentControls( key, speakers )
    .filter( ( control ) => control.editor?.kind === 'boolean' )
    .map( ( control ) => ( {
      path: [ control.name ], label: control.editor.label,
      onLabel: control.editor.onLabel, offLabel: control.editor.offLabel
    } ) );
}

export function instrumentFrequencyControls( key, speakers = [] ) {
  const descriptor = instrumentType( key );
  const names = instrumentControls( key, speakers )
    .filter( ( control ) => control.scalesWithTime )
    .map( ( control ) => control.name );
  if ( descriptor?.frequencyOrder ) {
    const order = new Map( descriptor.frequencyOrder.map( ( name, index ) => [ name, index ] ) );
    names.sort( ( a, b ) => ( order.get( a ) ?? Infinity ) - ( order.get( b ) ?? Infinity ) );
  }
  return names;
}

export function instrumentMainFrequency( key, params, speakers = [] ) {
  const primary = instrumentType( key )?.primaryFrequency;
  if ( !primary ) return 0;
  const name = primary.kind === 'speakerControl'
    ? `${ primary.prefix }${ speakers[ primary.speakerIndex ]?.id ?? '' }`
    : primary.name;
  return params[ name ] ?? 0;
}

function envelopeValue( expression, params ) {
  if ( typeof expression === 'number' ) return Number.isFinite( expression ) ? expression : null;
  if ( !expression ) return null;
  if ( expression.kind === 'control' ) {
    const value = Number( params[ expression.name ] ?? expression.default );
    return Number.isFinite( value ) && value >= 0 ? value : null;
  }
  if ( expression.kind === 'product' ) {
    const values = expression.factors.map( ( factor ) => envelopeValue( factor, params ) );
    const value = values.reduce( ( product, item ) => product * item, 1 );
    return values.every( ( item ) => item !== null ) ? value : null;
  }
  if ( expression.kind === 'max' ) {
    const values = expression.values.map( ( item ) => envelopeValue( item, params ) );
    return values.every( ( item ) => item !== null ) ? Math.max( ...values ) : null;
  }
  if ( expression.kind === 'sum' ) {
    const values = expression.values.map( ( item ) => envelopeValue( item, params ) );
    return values.every( ( item ) => item !== null )
      ? values.reduce( ( total, item ) => total + item, 0 ) : null;
  }
  if ( expression.kind === 'subtract' ) {
    const left = envelopeValue( expression.left, params );
    const right = envelopeValue( expression.right, params );
    return left === null || right === null ? null : left - right;
  }
  if ( expression.kind === 'lessThan' ) {
    const left = envelopeValue( expression.left, params );
    const right = envelopeValue( expression.right, params );
    return left === null || right === null ? null : left < right;
  }
  if ( expression.kind === 'conditional' ) {
    const condition = envelopeValue( expression.condition, params );
    return condition === null ? null : envelopeValue(
      condition ? expression.whenTrue : expression.whenFalse, params
    );
  }
  if ( expression.kind === 'oneMinus' ) {
    const value = envelopeValue( expression.value, params );
    return value === null ? null : Math.max( 0, 1 - value );
  }
  return null;
}

export function instrumentEnvelopes( key, params = {} ) {
  return Object.freeze( ( instrumentType( key )?.envelopes ?? [] ).map( ( envelope ) => {
    const attack = envelopeValue( envelope.attack, params );
    const release = envelopeValue( envelope.release, params );
    const declaredDuration = envelopeValue( envelope.duration, params );
    const duration = declaredDuration ?? ( attack !== null && release !== null ? attack + release : null );
    return Object.freeze( {
      id: envelope.id, label: envelope.label, role: envelope.role, target: envelope.target,
      shape: envelope.shape, gateControl: envelope.gateControl ?? null,
      completionAction: envelope.completionAction ?? null,
      attack, release, duration,
      attackControl: envelope.attackControl
        ?? ( envelope.attack?.kind === 'control' ? envelope.attack.name : null ),
      releaseControl: envelope.releaseControl
        ?? ( envelope.release?.kind === 'control' ? envelope.release.name : null ),
      durationControl: envelope.durationControl
        ?? ( envelope.duration?.kind === 'control' ? envelope.duration.name : null ),
      derived: [ envelope.attack, envelope.release, envelope.duration ]
        .filter( Boolean ).some( ( value ) => value.kind !== 'control' )
    } );
  } ) );
}

export function instrumentEnvelopeLengths( key, params = {} ) {
  const envelope = instrumentEnvelopes( key, params ).find( ( item ) => item.role === 'amplitude' );
  return !envelope || envelope.attack === null || envelope.release === null
    ? null
    : Object.freeze( { attack: envelope.attack, release: envelope.release } );
}

export function instrumentNoteLifecycle( key, params = {} ) {
  const descriptor = instrumentType( key );
  const contract = descriptor?.noteLifecycle;
  const envelope = instrumentEnvelopes( key, params ).find( ( item ) =>
    item.completionAction === 'freeNode' );
  if ( contract?.kind !== 'gatedTotalDuration' || !envelope || envelope.release === null ) return null;
  const duration = Number( params[ contract.durationKey ] );
  if ( !Number.isFinite( duration ) || duration < 0 ) return null;

  let gateDuration;
  let gateSource;
  if ( Object.hasOwn( params, 'sustain' ) ) {
    gateDuration = Number( params.sustain );
    gateSource = 'sustain';
  } else if ( Object.hasOwn( params, 'legato' ) ) {
    gateDuration = duration * Number( params.legato );
    gateSource = 'legato';
  } else {
    gateDuration = Math.max( 0, duration - envelope.release );
    gateSource = 'instrument';
  }
  if ( !Number.isFinite( gateDuration ) || gateDuration < 0 ) return null;
  return Object.freeze( {
    duration,
    totalDuration: gateSource === 'instrument' ? duration : gateDuration + envelope.release,
    gateDuration, gateSource, attack: envelope.attack, release: envelope.release
  } );
}

const TYPE_BY_SYNTH_DEF = new Map(
  Object.entries( INSTRUMENT_CATALOG )
    .filter( ( [ , descriptor ] ) => descriptor.synthDef )
    .map( ( [ key, descriptor ] ) => [ descriptor.synthDef, key ] )
);

export function typeForSynthDef( name ) {
  const key = TYPE_BY_SYNTH_DEF.get( name );
  return key ? { key, descriptor: INSTRUMENT_CATALOG[ key ] } : null;
}
