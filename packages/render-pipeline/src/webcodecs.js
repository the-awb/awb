import {
  AudioSample,
  AudioSampleSource,
  BufferTarget,
  Mp4OutputFormat,
  Output,
  Quality,
  StreamTarget,
  VideoSample,
  VideoSampleSource
} from 'mediabunny';

const QUALITY_BPP = { draft: 0.04, standard: 0.09, high: 0.18 };

export const QUALITY_OPTIONS = [
  { value: 'draft', label: 'Draft (smallest file)' },
  { value: 'standard', label: 'Standard' },
  { value: 'high', label: 'High (largest file)' }
];

export const bitrateFor = ( width, height, fps, quality ) =>
  Math.round( width * height * fps * ( QUALITY_BPP[ quality ] ?? QUALITY_BPP.standard ) );

export const formatBytes = ( bytes ) =>
  bytes >= 1e9 ? `${ ( bytes / 1e9 ).toFixed( 1 ) } GB` : `${ Math.round( bytes / 1e6 ) } MB`;

export const webCodecsAvailable = () =>
  typeof globalThis.VideoEncoder !== 'undefined' && typeof globalThis.AudioEncoder !== 'undefined';

const addAudioTrack = ( { output, audioBuffer, cueIn, cueOut, onPhase } ) => {
  if ( !audioBuffer ) return null;

  const sampleRate = audioBuffer.sampleRate;
  const numberOfChannels = Math.min( audioBuffer.numberOfChannels, 2 );
  const startSample = Math.floor( cueIn * sampleRate );
  const endSample = Math.min( Math.floor( cueOut * sampleRate ), audioBuffer.length );
  const channels = [];
  for ( let channel = 0; channel < numberOfChannels; channel++ ) {
    channels.push( audioBuffer.getChannelData( channel ) );
  }

  const source = new AudioSampleSource( {
    codec: 'aac',
    quality: new Quality( { bitrate: 192000 } )
  } );
  output.addAudioTrack( source );

  return async () => {
    onPhase?.( 'Encoding audio' );
    const chunkSize = 8192;
    for ( let sourceOffset = startSample; sourceOffset < endSample; sourceOffset += chunkSize ) {
      const frameCount = Math.min( chunkSize, endSample - sourceOffset );
      const planar = new Float32Array( frameCount * numberOfChannels );
      for ( let channel = 0; channel < numberOfChannels; channel++ ) {
        planar.set(
          channels[ channel ].subarray( sourceOffset, sourceOffset + frameCount ),
          channel * frameCount
        );
      }
      const sample = new AudioSample( {
        data: planar,
        format: 'f32-planar',
        numberOfChannels,
        sampleRate,
        timestamp: ( sourceOffset - startSample ) / sampleRate
      } );
      try {
        await source.add( sample );
      } finally {
        sample.close();
      }
    }
    source.close();
  };
};

/**
 * Browser H.264/AAC MP4 sink for runRenderPipeline, encoded and muxed by Mediabunny.
 *
 * `job` is preferred and supplies dimensions, frame rate and cue range. Individual fields and a
 * numeric frame index remain accepted for compatibility with hosts migrating from the original
 * app-local sink.
 */
export const createWebCodecsSink = async ( options = {} ) => {
  const {
    job,
    quality = 'standard',
    audioBuffer = null,
    fileName = 'render.mp4',
    fileHandle = null,
    onPhase = null
  } = options;
  const width = job?.output?.width ?? options.width;
  const height = job?.output?.height ?? options.height;
  const fps = job?.output?.fps ?? options.fps;
  const cueIn = job?.timeline?.cueInSeconds ?? options.cueIn ?? 0;
  const cueOut = job?.timeline?.cueOutSeconds ?? options.cueOut ?? audioBuffer?.duration ?? 0;
  const bitrate = bitrateFor( width, height, fps, quality );

  const writable = fileHandle ? await fileHandle.createWritable() : null;
  const target = writable ? new StreamTarget( writable ) : new BufferTarget();
  const output = new Output( {
    target,
    format: new Mp4OutputFormat( { fastStart: writable ? 'fragmented' : 'in-memory' } )
  } );
  const videoSource = new VideoSampleSource( {
    codec: 'avc',
    quality: new Quality( { bitrate, bitrateMode: 'variable' } ),
    keyFrameInterval: 2,
    latencyMode: 'quality'
  } );
  output.addVideoTrack( videoSource, { frameRate: fps } );
  const encodeAudio = addAudioTrack( { output, audioBuffer, cueIn, cueOut, onPhase } );

  try {
    await output.start();
    await encodeAudio?.();
  } catch ( error ) {
    await output.cancel().catch( () => {} );
    throw error;
  }

  return {
    name: 'webcodecs',
    detail: `Mediabunny H.264 @ ${ ( bitrate / 1e6 ).toFixed( 1 ) } Mbps variable${ writable ? ', streaming to disk' : '' }`,

    async addFrame( frameSource, frame ) {
      const frameIndex = typeof frame === 'number' ? frame : frame.frameIndex;
      const sourceWidth = frameSource.displayWidth ?? frameSource.width ?? frameSource.videoWidth;
      const sourceHeight = frameSource.displayHeight ?? frameSource.height ?? frameSource.videoHeight;
      if ( sourceWidth !== width || sourceHeight !== height ) {
        throw new RangeError(
          `frame ${ frameIndex } is ${ sourceWidth }x${ sourceHeight }; job requests ${ width }x${ height }`
        );
      }
      const sample = new VideoSample( frameSource, {
        timestamp: frameIndex / fps,
        duration: 1 / fps
      } );
      try {
        await videoSource.add( sample, {
          keyFrame: frameIndex % Math.max( 1, Math.round( fps * 2 ) ) === 0
        } );
      } finally {
        sample.close();
      }
    },

    async finish( { frameCount } = {} ) {
      onPhase?.( 'Finalising video' );
      videoSource.close();
      await output.finalize();
      if ( writable ) {
        return { blob: null, fileName, frameCount, message: 'Saved to the file you chose.' };
      }
      return { blob: new Blob( [ target.buffer ], { type: 'video/mp4' } ), fileName, frameCount };
    },

    async abort() {
      if ( output.state !== 'finalized' && output.state !== 'canceled' ) {
        await output.cancel();
      }
    }
  };
};
