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
