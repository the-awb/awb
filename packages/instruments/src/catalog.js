// The practice-specific instrument vocabulary. This is deliberately plain data: browser, desktop
// and offline integrations need one meaning for these names, without inheriting a renderer or a
// live SuperCollider engine. Helpers below materialise the small speaker-dependent parts.

const numberEditor = ( label, min, max, step, decimals, unit = '' ) => (
  { kind: 'number', label, min, max, step, decimals, unit }
);

const envelopeTimeEditor = ( label ) => numberEditor( label, 0, 3600, 0.1, 2, ' s' );

const RAW_CATALOG = {
  basic: {
    key: 'basic',
    label: 'Basic',
    synthDef: 'fieldBasic',
    gainControl: 'amp',
    primaryFrequency: { kind: 'speakerControl', prefix: 'freq', speakerIndex: 0 },
    amplitudeEnvelope: {
      kind: 'asr',
      attack: { kind: 'control', name: 'attackT', default: 2 },
      release: { kind: 'control', name: 'releaseT', default: 4 }
    },
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
    amplitudeEnvelope: {
      kind: 'asr',
      attack: { kind: 'control', name: 'attackT', default: 12 },
      release: { kind: 'control', name: 'releaseT', default: 12 }
    },
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
    amplitudeEnvelope: {
      kind: 'asr',
      attack: { kind: 'control', name: 'attackT', default: 30 },
      release: { kind: 'control', name: 'releaseT', default: 30 }
    },
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
    amplitudeEnvelope: {
      kind: 'asr',
      attack: { kind: 'product', names: [ 'sustain', 'ampEnvRatio' ], defaults: [ 5, 0.5 ] },
      release: { kind: 'product', names: [ 'sustain', 'ampEnvRatio' ], defaults: [ 5, 0.5 ] }
    },
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
      ampEnvRatio: { role: 'envelopeRatio', synthDefault: 0.5, editor: numberEditor( 'Attack/release ratio', 0, 4, 0.01, 2, '×' ) }
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
      decimals: control.editor.decimals, unit: control.editor.unit
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

function envelopeSegmentLength( segment, params ) {
  if ( !segment ) return null;
  if ( segment.kind === 'control' ) {
    const value = Number( params[ segment.name ] ?? segment.default );
    return Number.isFinite( value ) && value >= 0 ? value : null;
  }
  if ( segment.kind === 'product' ) {
    const values = segment.names.map( ( name, index ) => Number( params[ name ] ?? segment.defaults[ index ] ) );
    const value = values.reduce( ( product, item ) => product * item, 1 );
    return values.every( ( item ) => Number.isFinite( item ) && item >= 0 ) ? value : null;
  }
  return null;
}

export function instrumentEnvelopeLengths( key, params = {} ) {
  const envelope = instrumentType( key )?.amplitudeEnvelope;
  if ( !envelope ) return null;
  const attack = envelopeSegmentLength( envelope.attack, params );
  const release = envelopeSegmentLength( envelope.release, params );
  return attack === null || release === null ? null : Object.freeze( { attack, release } );
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
