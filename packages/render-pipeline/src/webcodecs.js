import { Muxer, ArrayBufferTarget, FileSystemWritableFileStreamTarget } from 'mp4-muxer';

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

const avcCandidates = ( width, height ) => {
  const mbs = Math.ceil( width / 16 ) * Math.ceil( height / 16 );
  return mbs > 8704 ? [ 'avc1.640034', 'avc1.640033', 'avc1.4D0034' ]
    : mbs > 3600 ? [ 'avc1.640028', 'avc1.640033', 'avc1.4D0028' ]
      : [ 'avc1.64001F', 'avc1.640028', 'avc1.42001F' ];
};

const pickBitrateMode = async ( config ) => {
  for ( const bitrateMode of [ 'variable', 'constant' ] ) {
    try {
      const support = await VideoEncoder.isConfigSupported( { ...config, bitrateMode } );
      if ( support.supported ) return bitrateMode;
    } catch { /* next */ }
  }
  return undefined;
};

const pickVideoCodec = async ( width, height, bitrate, fps ) => {
  for ( const codec of avcCandidates( width, height ) ) {
    try {
      const support = await VideoEncoder.isConfigSupported( { codec, width, height, bitrate, framerate: fps } );
      if ( support.supported ) return codec;
    } catch { /* next */ }
  }
  return null;
};

const encodeAudioTrack = async ( { muxer, audioBuffer, cueIn, cueOut, onError } ) => {
  if ( !audioBuffer ) return null;
  const sampleRate = audioBuffer.sampleRate;
  const numberOfChannels = Math.min( audioBuffer.numberOfChannels, 2 );
  const bitrate = 192000;

  let codec = null;
  for ( const candidate of [ 'mp4a.40.2', 'opus' ] ) {
    try {
      const support = await AudioEncoder.isConfigSupported( { codec: candidate, sampleRate, numberOfChannels, bitrate } );
      if ( support.supported ) { codec = candidate; break; }
    } catch { /* next */ }
  }
  if ( !codec ) return null;

  let failure = null;
  const encoder = new AudioEncoder( {
    output: ( chunk, meta ) => muxer.addAudioChunk( chunk, meta ),
    error: ( error ) => { failure = error; onError?.( error ); }
  } );
  encoder.configure( { codec, sampleRate, numberOfChannels, bitrate } );

  const startSample = Math.floor( cueIn * sampleRate );
  const endSample = Math.min( Math.floor( cueOut * sampleRate ), audioBuffer.length );
  const total = Math.max( 0, endSample - startSample );
  const chunkSize = 8192;
  const channels = [];
  for ( let channel = 0; channel < numberOfChannels; channel++ ) {
    channels.push( audioBuffer.getChannelData( channel ) );
  }

  for ( let offset = 0; offset < total && !failure; offset += chunkSize ) {
    const frames = Math.min( chunkSize, total - offset );
    const planar = new Float32Array( frames * numberOfChannels );
    for ( let channel = 0; channel < numberOfChannels; channel++ ) {
      planar.set(
        channels[ channel ].subarray( startSample + offset, startSample + offset + frames ),
        channel * frames
      );
    }
    const data = new AudioData( {
      format: 'f32-planar',
      sampleRate,
      numberOfFrames: frames,
      numberOfChannels,
      timestamp: Math.round( ( offset / sampleRate ) * 1e6 ),
      data: planar
    } );
    encoder.encode( data );
    data.close();
    while ( encoder.encodeQueueSize > 16 ) await new Promise( ( resolve ) => setTimeout( resolve, 0 ) );
  }

  await encoder.flush();
  encoder.close();
  return { codec, numberOfChannels, sampleRate };
};

/**
 * A browser WebCodecs/MP4 sink for runRenderPipeline.
 *
 * `job` is preferred and supplies dimensions, frame rate and cue range. The individual fields
 * remain accepted so existing producers can migrate without changing their output in the same
 * commit. Likewise addFrame accepts either a pipeline frame context or a numeric frame index.
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
  const codec = await pickVideoCodec( width, height, bitrate, fps );
  if ( !codec ) throw new Error( `No supported H.264 configuration for ${ width }x${ height }` );

  const writable = fileHandle ? await fileHandle.createWritable() : null;
  const target = writable ? new FileSystemWritableFileStreamTarget( writable ) : new ArrayBufferTarget();
  const muxer = new Muxer( {
    target,
    video: { codec: 'avc', width, height, frameRate: fps },
    audio: audioBuffer ? {
      codec: 'aac',
      numberOfChannels: Math.min( audioBuffer.numberOfChannels, 2 ),
      sampleRate: audioBuffer.sampleRate
    } : undefined,
    fastStart: writable ? 'fragmented' : 'in-memory'
  } );

  let encoderError = null;
  const encoder = new VideoEncoder( {
    output: ( chunk, meta ) => muxer.addVideoChunk( chunk, meta ),
    error: ( error ) => { encoderError = error; }
  } );
  const bitrateMode = await pickBitrateMode( { codec, width, height, bitrate, framerate: fps } );
  encoder.configure( {
    codec,
    width,
    height,
    bitrate,
    framerate: fps,
    latencyMode: 'quality',
    ...( bitrateMode ? { bitrateMode } : {} )
  } );

  onPhase?.( 'Encoding audio' );
  await encodeAudioTrack( { muxer, audioBuffer, cueIn, cueOut } );
  const keyFrameInterval = Math.max( 1, Math.round( fps * 2 ) );

  return {
    name: 'webcodecs',
    detail: `${ codec } @ ${ ( bitrate / 1e6 ).toFixed( 1 ) } Mbps ${ bitrateMode || 'default' }${ writable ? ', streaming to disk' : '' }`,

    async addFrame( frameSource, frame ) {
      if ( encoderError ) throw encoderError;
      const frameIndex = typeof frame === 'number' ? frame : frame.frameIndex;
      const videoFrame = new VideoFrame( frameSource, {
        timestamp: Math.round( ( frameIndex / fps ) * 1e6 ),
        duration: Math.round( 1e6 / fps )
      } );
      encoder.encode( videoFrame, { keyFrame: frameIndex % keyFrameInterval === 0 } );
      videoFrame.close();
      while ( encoder.encodeQueueSize > 8 && !encoderError ) {
        await new Promise( ( resolve ) => setTimeout( resolve, 0 ) );
      }
    },

    async finish( { frameCount } = {} ) {
      onPhase?.( 'Finalising video' );
      await encoder.flush();
      encoder.close();
      muxer.finalize();
      if ( writable ) {
        await writable.close();
        return { blob: null, fileName, frameCount, message: 'Saved to the file you chose.' };
      }
      return { blob: new Blob( [ target.buffer ], { type: 'video/mp4' } ), fileName, frameCount };
    },

    async abort() {
      try { encoder.close(); } catch { /* already closed */ }
      try { await writable?.close(); } catch { /* already closed */ }
    }
  };
};
