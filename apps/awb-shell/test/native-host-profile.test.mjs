import test from 'node:test';
import assert from 'node:assert/strict';
import {
  activeNativeHostMode, canonicalNativeToolProfile
} from '../src/nativeHostProfile.mjs';

test( 'native tool profiles collapse to the hosted public contract', () => {
  assert.equal( canonicalNativeToolProfile( 'attached' ), 'hosted' );
  assert.equal( canonicalNativeToolProfile( 'headless' ), 'hosted' );
  assert.equal( canonicalNativeToolProfile( 'hosted' ), 'hosted' );
  assert.equal( canonicalNativeToolProfile( 'standalone' ), 'standalone' );
} );

test( 'hosted launch reuses the active native host ownership mode', () => {
  assert.equal( activeNativeHostMode( { control: { mode: 'ide' } } ), 'attached' );
  assert.equal( activeNativeHostMode( { sclang: { status: 'attached' }, control: { status: 'reconnecting' } } ), 'attached' );
  assert.equal( activeNativeHostMode( { control: { mode: 'headless', status: 'booting' } } ), 'headless' );
  assert.equal( activeNativeHostMode( { sclang: { status: 'absent' }, control: { status: 'unavailable' } } ), null );
} );
