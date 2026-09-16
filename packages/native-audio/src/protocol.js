export const AUDIO_FRAME_MAGIC = 0x41425741;
export const AUDIO_FRAME_VERSION = 1;
export const AUDIO_FRAME_HEADER_BYTES = 44;

export function decodeAudioFrameHeader( input ) {
  const bytes = Buffer.isBuffer( input ) ? input : Buffer.from( input.buffer, input.byteOffset, input.byteLength );
  if ( bytes.byteLength < AUDIO_FRAME_HEADER_BYTES ) throw new Error( 'Native audio frame is shorter than its header.' );
  const magic = bytes.readUInt32LE( 0 );
  const version = bytes.readUInt16LE( 4 );
  const headerBytes = bytes.readUInt16LE( 6 );
  if ( magic !== AUDIO_FRAME_MAGIC ) throw new Error( 'Native audio frame has an invalid magic value.' );
  if ( version !== AUDIO_FRAME_VERSION || headerBytes !== AUDIO_FRAME_HEADER_BYTES ) {
    throw new Error( `Unsupported native audio frame version: ${ version }/${ headerBytes }.` );
  }
  const header = Object.freeze( {
    version,
    flags: bytes.readUInt32LE( 8 ),
    sequence: bytes.readBigUInt64LE( 12 ),
    hostTime: bytes.readBigUInt64LE( 20 ),
    sampleRate: bytes.readDoubleLE( 28 ),
    channelCount: bytes.readUInt32LE( 36 ),
    frameCount: bytes.readUInt32LE( 40 )
  } );
  const payloadBytes = header.channelCount * header.frameCount * Float32Array.BYTES_PER_ELEMENT;
  if ( bytes.byteLength !== AUDIO_FRAME_HEADER_BYTES + payloadBytes ) {
    throw new Error( `Native audio payload size mismatch: expected ${ payloadBytes }, received ${ bytes.byteLength - AUDIO_FRAME_HEADER_BYTES }.` );
  }
  return header;
}

export class AudioFrameDecoder {
  #pending = Buffer.alloc( 0 );
  push( chunk ) {
    this.#pending = this.#pending.length ? Buffer.concat( [ this.#pending, chunk ] ) : Buffer.from( chunk );
    const frames = [];
    while ( this.#pending.length >= AUDIO_FRAME_HEADER_BYTES ) {
      if ( this.#pending.readUInt32LE( 0 ) !== AUDIO_FRAME_MAGIC ) throw new Error( 'Native audio stream lost frame alignment.' );
      const channels = this.#pending.readUInt32LE( 36 );
      const samples = this.#pending.readUInt32LE( 40 );
      const length = AUDIO_FRAME_HEADER_BYTES + channels * samples * Float32Array.BYTES_PER_ELEMENT;
      if ( length > 64 * 1024 * 1024 ) throw new Error( 'Native audio frame exceeds the safety limit.' );
      if ( this.#pending.length < length ) break;
      const frame = this.#pending.subarray( 0, length );
      decodeAudioFrameHeader( frame );
      frames.push( frame );
      this.#pending = this.#pending.subarray( length );
    }
    return frames;
  }
}
