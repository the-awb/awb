import { BINARY_OPERATORS, DONE_ACTIONS, UNARY_OPERATORS, inputRole } from './domain.js';

const CONTROL_UGENS = new Set( [ 'Control', 'AudioControl', 'TrigControl', 'LagControl' ] );

function deepFreeze( value ) {
  if ( value && typeof value === 'object' && !Object.isFrozen( value ) ) {
    Object.freeze( value );
    for ( const child of Object.values( value ) ) deepFreeze( child );
  }
  return value;
}

function cloneData( value ) {
  if ( Array.isArray( value ) ) return value.map( cloneData );
  if ( value && typeof value === 'object' ) {
    return Object.fromEntries( Object.entries( value ).map( ( [ key, child ] ) => [ key, cloneData( child ) ] ) );
  }
  return value;
}

const refKey = ( reference ) => reference.kind === 'constant'
  ? `constant:${ reference.index }`
  : `ugen:${ reference.ugenIndex }:${ reference.outputIndex }`;

function analysisContext( definition ) {
  const controlsByParameter = new Map();
  for ( const control of definition.controls ) {
    for ( let channel = 0; channel < control.numChannels; channel++ ) {
      controlsByParameter.set( control.index + channel, { control, channel } );
    }
  }
  const controlForRef = ( reference ) => {
    if ( reference.kind !== 'ugen' ) return null;
    const ugen = definition.ugens[ reference.ugenIndex ];
    if ( !CONTROL_UGENS.has( ugen?.className ) ) return null;
    return controlsByParameter.get( ugen.specialIndex + reference.outputIndex ) ?? null;
  };
  const memo = new Map();
  const sources = ( reference, visiting = new Set() ) => {
    const direct = controlForRef( reference );
    if ( direct ) return [ direct ];
    if ( reference.kind === 'constant' ) return [];
    const key = refKey( reference );
    if ( memo.has( key ) ) return memo.get( key );
    if ( visiting.has( key ) ) return [];
    const nextVisiting = new Set( visiting ).add( key );
    const ugen = definition.ugens[ reference.ugenIndex ];
    const result = [ ...new Map( ( ugen?.inputs ?? [] ).flatMap( ( input ) => sources( input, nextVisiting ) )
      .map( ( item ) => [ `${ item.control.name }:${ item.channel }`, item ] ) ).values() ];
    memo.set( key, result );
    return result;
  };
  return { controlForRef, sources };
}

function expressionFor( definition, context, reference, visiting = new Set() ) {
  if ( reference.kind === 'constant' ) return { kind: 'constant', value: reference.value };
  const direct = context.controlForRef( reference );
  if ( direct ) return {
    kind: 'control', name: direct.control.name,
    ...( direct.control.numChannels > 1 ? { channel: direct.channel } : {} )
  };
  const key = refKey( reference );
  if ( visiting.has( key ) ) return { kind: 'cycle', reference: key };
  const ugen = definition.ugens[ reference.ugenIndex ];
  if ( !ugen ) return { kind: 'missingUgen', index: reference.ugenIndex, output: reference.outputIndex };
  const next = new Set( visiting ).add( key );
  if ( ugen.className === 'BinaryOpUGen' ) return {
    kind: 'binary', operator: BINARY_OPERATORS[ ugen.specialIndex ] ?? `special-${ ugen.specialIndex }`,
    left: expressionFor( definition, context, ugen.inputs[ 0 ], next ),
    right: expressionFor( definition, context, ugen.inputs[ 1 ], next )
  };
  if ( ugen.className === 'UnaryOpUGen' ) return {
    kind: 'unary', operator: UNARY_OPERATORS[ ugen.specialIndex ] ?? `special-${ ugen.specialIndex }`,
    value: expressionFor( definition, context, ugen.inputs[ 0 ], next )
  };
  return {
    kind: 'ugenOutput', ugen: ugen.className, index: ugen.index, output: reference.outputIndex,
    inputs: ugen.inputs.map( ( input ) => expressionFor( definition, context, input, next ) )
  };
}

function constantValue( reference ) {
  return reference?.kind === 'constant' ? reference.value : null;
}

function endpointRolesFrom( definition, startIndex ) {
  const roles = new Set();
  const queue = [ startIndex ];
  const visited = new Set();
  while ( queue.length ) {
    const sourceIndex = queue.shift();
    if ( visited.has( sourceIndex ) ) continue;
    visited.add( sourceIndex );
    for ( const ugen of definition.ugens ) {
      ugen.inputs.forEach( ( reference, inputIndex ) => {
        if ( reference.kind !== 'ugen' || reference.ugenIndex !== sourceIndex ) return;
        const role = inputRole( ugen, inputIndex );
        if ( role ) roles.add( role );
        queue.push( ugen.index );
      } );
    }
  }
  return [ ...roles ].sort();
}

function reachesOutputGain( definition, envelopeIndex ) {
  const queue = [ { index: envelopeIndex, passedAudioMultiply: false } ];
  const visited = new Set();
  while ( queue.length ) {
    const current = queue.shift();
    const visitKey = `${ current.index }:${ current.passedAudioMultiply }`;
    if ( visited.has( visitKey ) ) continue;
    visited.add( visitKey );
    for ( const ugen of definition.ugens ) {
      for ( let inputIndex = 0; inputIndex < ugen.inputs.length; inputIndex++ ) {
        const input = ugen.inputs[ inputIndex ];
        if ( input.kind !== 'ugen' || input.ugenIndex !== current.index ) continue;
        if ( [ 'Out', 'ReplaceOut', 'OffsetOut' ].includes( ugen.className ) && inputIndex > 0 ) {
          if ( current.passedAudioMultiply ) return true;
          continue;
        }
        let passedAudioMultiply = current.passedAudioMultiply;
        let transparent = false;
        if ( ugen.className === 'BinaryOpUGen' && BINARY_OPERATORS[ ugen.specialIndex ] === '*' ) {
          transparent = true;
          const other = ugen.inputs[ inputIndex === 0 ? 1 : 0 ];
          if ( other?.kind === 'ugen' && definition.ugens[ other.ugenIndex ]?.rate === 'audio' ) {
            passedAudioMultiply = true;
          }
        }
        if ( ugen.className === 'BinaryOpUGen' || ugen.className === 'UnaryOpUGen'
          || [ 'Sum3', 'Sum4', 'K2A', 'A2K' ].includes( ugen.className ) ) transparent = true;
        if ( ugen.className === 'MulAdd' ) {
          transparent = true;
          if ( inputIndex === 1 ) passedAudioMultiply = true;
        }
        if ( ugen.className === 'Pan2' ) {
          transparent = inputIndex === 0 || inputIndex === 2;
          if ( inputIndex === 2 ) passedAudioMultiply = true;
        }
        if ( ugen.className === 'Balance2' ) {
          transparent = inputIndex === 0 || inputIndex === 1 || inputIndex === 3;
          if ( inputIndex === 3 ) passedAudioMultiply = true;
        }
        // Crossing an oscillator, filter, delay, envelope or another functional UGen changes what
        // the source means. It may still influence the output, but it is no longer evidence that
        // this EnvGen itself is acting as the output-gain envelope.
        if ( transparent ) queue.push( { index: ugen.index, passedAudioMultiply } );
      }
    }
  }
  return false;
}

function analyseEnvelopes( definition, context ) {
  return definition.ugens.filter( ( ugen ) => ugen.className === 'EnvGen' ).map( ( ugen ) => {
    const stageCount = constantValue( ugen.inputs[ 6 ] );
    const stages = Number.isInteger( stageCount ) && stageCount >= 0
      ? Array.from( { length: stageCount }, ( _, index ) => {
        const offset = 9 + index * 4;
        return {
          target: expressionFor( definition, context, ugen.inputs[ offset ] ),
          duration: expressionFor( definition, context, ugen.inputs[ offset + 1 ] ),
          shape: expressionFor( definition, context, ugen.inputs[ offset + 2 ] ),
          curve: expressionFor( definition, context, ugen.inputs[ offset + 3 ] )
        };
      } )
      : [];
    const doneCode = constantValue( ugen.inputs[ 4 ] );
    const endpointRoles = endpointRolesFrom( definition, ugen.index );
    const outputGain = reachesOutputGain( definition, ugen.index );
    return {
      ugenIndex: ugen.index,
      rate: ugen.rate,
      gate: expressionFor( definition, context, ugen.inputs[ 0 ] ),
      levelScale: expressionFor( definition, context, ugen.inputs[ 1 ] ),
      levelBias: expressionFor( definition, context, ugen.inputs[ 2 ] ),
      timeScale: expressionFor( definition, context, ugen.inputs[ 3 ] ),
      doneAction: { code: doneCode, name: DONE_ACTIONS[ doneCode ] ?? ( doneCode === null ? 'dynamic' : `unknown-${ doneCode }` ) },
      envelope: {
        initialLevel: expressionFor( definition, context, ugen.inputs[ 5 ] ),
        stageCount,
        releaseNode: constantValue( ugen.inputs[ 7 ] ),
        loopNode: constantValue( ugen.inputs[ 8 ] ),
        stages
      },
      targets: [ ...new Set( [ ...( outputGain ? [ 'outputGain' ] : [] ),
        ...endpointRoles.filter( ( role ) => role !== 'outputSignal' ) ] ) ].sort(),
      reachesOutput: endpointRoles.includes( 'outputSignal' ),
      freesNode: doneCode === 2
    };
  } );
}

export function buildSynthDefInterface( definition, { specs = {} } = {} ) {
  if ( !definition?.ugens || !definition?.controls ) {
    throw new TypeError( 'buildSynthDefInterface: expected a parsed SynthDef definition' );
  }
  const context = analysisContext( definition );
  const usageByControl = new Map( definition.controls.map( ( control ) => [ control.name, [] ] ) );
  for ( const ugen of definition.ugens ) {
    ugen.inputs.forEach( ( reference, inputIndex ) => {
      const role = inputRole( ugen, inputIndex );
      if ( !role ) return;
      for ( const source of context.sources( reference ) ) {
        usageByControl.get( source.control.name )?.push( {
          role, ugen: ugen.className, ugenIndex: ugen.index, inputIndex,
          ...( source.control.numChannels > 1 ? { channel: source.channel } : {} )
        } );
      }
    } );
  }
  const controls = definition.controls.map( ( control ) => {
    const usages = [ ...new Map( usageByControl.get( control.name )
      .map( ( usage ) => [ JSON.stringify( usage ), usage ] ) ).values() ];
    return {
      ...control,
      spec: Object.hasOwn( specs, control.name ) ? cloneData( specs[ control.name ] ) : null,
      roles: [ ...new Set( usages.map( ( usage ) => usage.role ) ) ].sort(),
      usages
    };
  } );
  return deepFreeze( {
    schema: 'awb.synthdef-interface/1',
    name: definition.name,
    controls,
    envelopes: analyseEnvelopes( definition, context ),
    outputs: definition.ugens.filter( ( ugen ) => [ 'Out', 'ReplaceOut', 'OffsetOut' ].includes( ugen.className ) )
      .map( ( ugen ) => ( { ugen: ugen.className, ugenIndex: ugen.index, channels: Math.max( 0, ugen.inputs.length - 1 ) } ) ),
    ugens: definition.ugens.map( ( ugen ) => ( { className: ugen.className, rate: ugen.rate, specialIndex: ugen.specialIndex } ) )
  } );
}
