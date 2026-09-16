const EMPTY = new Float32Array( 0 );

/**
 * Return the exact decoded-audio window [startTime, endTime).
 *
 * The input deliberately follows AudioBuffer's small read surface rather than requiring a Web
 * Audio class, so browser, Node and worker decoders can expose the same shape.
 */
export function sampleAudioWindow( audioBuffer, startTime, endTime ) {
  if ( !audioBuffer ) return { x: EMPTY, y: EMPTY };

  const sampleRate = audioBuffer.sampleRate;
  const leftChannel = audioBuffer.getChannelData( 0 );
  const rightChannel = audioBuffer.numberOfChannels > 1
    ? audioBuffer.getChannelData( 1 )
    : leftChannel;

  const startSample = Math.max( 0, Math.floor( startTime * sampleRate ) );
  const endSample = Math.min(
    leftChannel.length,
    Math.max( startSample, Math.floor( endTime * sampleRate ) )
  );
  const count = endSample - startSample;
  if ( count <= 0 ) return { x: EMPTY, y: EMPTY };

  return {
    x: leftChannel.slice( startSample, endSample ),
    y: rightChannel.slice( startSample, endSample )
  };
}

/** Sample only the requested interleaved stereo pairs from a multichannel decoded source. */
export function sampleAudioPairs( audioBuffer, startTime, endTime, pairIndices = [ 0 ] ) {
  if ( !audioBuffer ) return { pairs: {} };
  const sampleRate = audioBuffer.sampleRate;
  const startSample = Math.max( 0, Math.floor( startTime * sampleRate ) );
  const endSample = Math.min(
    audioBuffer.length,
    Math.max( startSample, Math.floor( endTime * sampleRate ) )
  );
  const pairs = {};
  for ( const pairIndex of new Set( pairIndices ) ) {
    if ( !Number.isInteger( pairIndex ) || pairIndex < 0 ) continue;
    const xChannel = pairIndex * 2;
    if ( xChannel >= audioBuffer.numberOfChannels ) continue;
    const yChannel = Math.min( xChannel + 1, audioBuffer.numberOfChannels - 1 );
    pairs[ pairIndex ] = {
      x: audioBuffer.getChannelData( xChannel ).slice( startSample, endSample ),
      y: audioBuffer.getChannelData( yChannel ).slice( startSample, endSample )
    };
  }
  return { pairs };
}

/** Select authored channels 0/1 as the listening/encoding master after discrete-pair analysis. */
export function selectMasterStereo( audioBuffer ) {
  if ( !audioBuffer || audioBuffer.numberOfChannels <= 0 ) return null;
  if ( audioBuffer.numberOfChannels === 2 ) return audioBuffer;

  const left = audioBuffer.getChannelData( 0 );
  const right = audioBuffer.numberOfChannels > 1 ? audioBuffer.getChannelData( 1 ) : left;
  return {
    sampleRate: audioBuffer.sampleRate,
    numberOfChannels: 2,
    length: audioBuffer.length,
    duration: audioBuffer.duration ?? audioBuffer.length / audioBuffer.sampleRate,
    getChannelData( channel ) {
      if ( channel === 0 ) return left;
      if ( channel === 1 ) return right;
      throw new RangeError( `Stereo master has no channel ${ channel }` );
    }
  };
}
