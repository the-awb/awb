#!/usr/bin/env node
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { listScoreDirectory, parseScoreFileText, readScoreHandle } from '../src/engine/scoreFiles.js';

const demoText = await readFile(
  new URL( '../public/examples/sonic-attunement-01.score.json', import.meta.url ), 'utf8'
);
const canonical = parseScoreFileText( demoText );
assert.equal( canonical.migrated, false );
assert.equal( canonical.document.schema, 'awb.score/1' );
assert.equal( canonical.document.entries.length, 11 );
assert.equal( canonical.document.entries.at( -1 ).time, 773 );

const legacy = JSON.parse( demoText );
delete legacy.schema;
delete legacy.meta;
const imported = parseScoreFileText( JSON.stringify( legacy ) );
assert.equal( imported.migrated, true );
assert.equal( imported.document.schema, 'awb.score/1' );
assert.equal( imported.document.meta.title, 'sonic-attunement-01' );

const handles = [
  { kind: 'file', name: 'z.score.json' },
  { kind: 'directory', name: 'nested' },
  { kind: 'file', name: 'ignore.json' },
  { kind: 'file', name: 'a.score.json' }
];
const directory = { async *values() { yield* handles; } };
assert.deepEqual( ( await listScoreDirectory( directory ) ).map( ( item ) => item.name ), [
  'a.score.json', 'z.score.json'
] );

const fileHandle = {
  async getFile() { return { name: 'demo.score.json', text: async () => demoText }; }
};
const read = await readScoreHandle( fileHandle );
assert.equal( read.handle, fileHandle );
assert.equal( read.document.scoreID, 'sonic-attunement-01' );

console.log( 'score-files: 11/11 pass' );
