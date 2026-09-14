import { instrumentType } from '@awb/instruments';

// Balance2's equal-power balance law: pos=-1 -> full left, 0 -> 0.707/0.707,
// +1 -> full right. Used by substrate/substrate2's slow movement pan LFO.
export function balanceAmp( freqQ, movement, t ) {
  let q0 = 0.8 * Math.sin( 2 * Math.PI * freqQ * t ) * movement;
  q0 = Math.max( -1, Math.min( 1, q0 ) );
  const a = ( q0 + 1 ) * Math.PI / 4;
  return [ Math.cos( a ), Math.sin( a ) ];
}

const FIELD_PROJECTIONS = {
  basic: {
    defaultChannels: () => ( {} ),
    project( params, _channels, speakers, timeFactor ) {
      return speakers.map( ( speaker, index ) => {
        const freq = params[ `freq${ speaker.id }` ] ?? 0;
        const amp = params[ `amp${ speaker.id }` ] ?? 0;
        return {
          slot: speaker.id,
          freq: freq * timeFactor,
          gl: index === 0 ? amp : 0,
          gr: index === 0 ? 0 : amp
        };
      } );
    }
  },

  substrate: {
    defaultChannels: () => ( {} ),
    project( params, _channels, _speakers, timeFactor, t ) {
      const [ ampL, ampR ] = balanceAmp( params.freqQ * timeFactor, params.movement, t );
      return [
        { slot: 'carrier', freq: params.freqA * timeFactor, gl: ampL, gr: 0 },
        { slot: 'beat', freq: ( params.freqA + params.beat ) * timeFactor, gl: 0, gr: ampR }
      ];
    }
  },

  substrate2: {
    defaultChannels: () => ( {
      base: { active: true }, pulse: { active: true }, beat: { active: true }
    } ),
    project( params, channels, _speakers, timeFactor, t ) {
      const [ ampL, ampR ] = balanceAmp( params.freqQ * timeFactor, params.movement, t );
      const { flip, slowBeatBlend, beatBlend, freq, slowBeat, beat } = params;
      const wBaseL = flip ? ( 1 - beatBlend ) : ( 1 - slowBeatBlend );
      const wBaseR = flip ? ( 1 - slowBeatBlend ) : ( 1 - beatBlend );
      const wPulseL = flip ? 0 : slowBeatBlend;
      const wPulseR = flip ? slowBeatBlend : 0;
      const wBeatL = flip ? beatBlend : 0;
      const wBeatR = flip ? 0 : beatBlend;
      const out = [];
      if ( channels.base?.active ) {
        out.push( { slot: 'base', freq: freq * timeFactor, gl: ampL * wBaseL, gr: ampR * wBaseR } );
      }
      if ( channels.pulse?.active ) {
        out.push( { slot: 'pulse', freq: ( freq + slowBeat ) * timeFactor, gl: ampL * wPulseL, gr: ampR * wPulseR } );
      }
      if ( channels.beat?.active ) {
        out.push( { slot: 'beat', freq: ( freq + slowBeat + beat ) * timeFactor, gl: ampL * wBeatL, gr: ampR * wBeatR } );
      }
      return out;
    }
  },

  // PM sideband decomposition is deliberately unimplemented. Sounding does not imply that the
  // field renderer can represent it, and an empty projection is more honest than invented light.
  resobass2: {
    defaultChannels: () => ( {} ),
    project: () => []
  }
};

export function defaultFieldChannels( type ) {
  if ( !instrumentType( type ) ) return {};
  return FIELD_PROJECTIONS[ type ]?.defaultChannels() ?? {};
}

// Project one known AWB instrument into ideal sinusoidal components for the analytic field. This
// does not synthesize audio or propagate it through space; shaders.js and fieldProbe.js do the
// latter after flattenChannels has applied app/session mixing state.
export function projectInstrumentToFieldComponents( instrument, speakers, timeFactor, t ) {
  if ( !instrumentType( instrument.type ) ) return [];
  return FIELD_PROJECTIONS[ instrument.type ]?.project(
    instrument.params, instrument.channels, speakers, timeFactor, t
  ) ?? [];
}
