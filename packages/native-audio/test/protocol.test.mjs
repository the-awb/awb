import assert from 'node:assert/strict';
import test from 'node:test';
import { AudioFrameDecoder, decodeAudioFrameHeader } from '../src/index.js';

function frame( sequence = 3n, channels = 14, samples = 512 ) {
  const result = Buffer.alloc( 44 + channels * samples * 4 );
  result.writeUInt32LE( 0x41425741, 0 ); result.writeUInt16LE( 1, 4 ); result.writeUInt16LE( 44, 6 );
  result.writeUInt32LE( 1, 8 ); result.writeBigUInt64LE( sequence, 12 ); result.writeBigUInt64LE( 900n, 20 );
  result.writeDoubleLE( 48000, 28 ); result.writeUInt32LE( channels, 36 ); result.writeUInt32LE( samples, 40 );
  return result;
}

test( 'decodes the versioned 14-channel frame header', () => {
  assert.deepEqual( decodeAudioFrameHeader( frame() ), {
    version: 1, flags: 1, sequence: 3n, hostTime: 900n, sampleRate: 48000, channelCount: 14, frameCount: 512
  } );
} );

test( 'reassembles split and adjacent helper frames', () => {
  const decoder = new AudioFrameDecoder(); const first = frame( 1n ); const second = frame( 2n );
  assert.deepEqual( decoder.push( first.subarray( 0, 73 ) ), [] );
  const result = decoder.push( Buffer.concat( [ first.subarray( 73 ), second ] ) );
  assert.equal( result.length, 2 );
  assert.equal( decodeAudioFrameHeader( result[ 1 ] ).sequence, 2n );
} );

test( 'rejects malformed and unbounded frames', () => {
  const malformed = frame(); malformed.writeUInt32LE( 999, 36 );
  assert.throws( () => decodeAudioFrameHeader( malformed ), /payload size mismatch/ );
  const oversized = frame(); oversized.writeUInt32LE( 0xffffffff, 40 );
  assert.throws( () => new AudioFrameDecoder().push( oversized ), /safety limit/ );
} );
