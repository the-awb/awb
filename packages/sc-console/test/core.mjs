import assert from 'node:assert/strict';
import { evalRangeAt, regionRangeAt } from '../src/core/index.js';

const atCursor = ( fixture, mode = 'region' ) => {
  const position = fixture.indexOf( '|' );
  const text = fixture.replace( '|', '' );
  const range = evalRangeAt( text, position, position, mode );
  return range ? text.slice( range.from, range.to ) : null;
};

assert.equal( atCursor( 'a = 1;\nb =| 2;', 'line' ), 'b = 2;' );
assert.equal( atCursor( 'a = 1;\n|\nb = 2;', 'line' ), null );
assert.equal( atCursor( '(\n  // )\n  y = |2;\n)' ), '(\n  // )\n  y = 2;\n)' );
assert.equal( atCursor( '(\n  "a )".postln;\n  y = |2;\n)' ), '(\n  "a )".postln;\n  y = 2;\n)' );
assert.equal( atCursor( '(\n  /* ) */\n  y = |2;\n)' ), '(\n  /* ) */\n  y = 2;\n)' );
assert.equal( atCursor( '(\n  $) .postln;\n  y = |2;\n)' ), '(\n  $) .postln;\n  y = 2;\n)' );
assert.equal( atCursor( '(\n  a = 1;\n)\nb =| 2;' ), 'b = 2;' );
assert.equal( regionRangeAt( 'f(\n  1\n);', 5 ), null );

console.log( 'All sclang console selection rules hold.' );
