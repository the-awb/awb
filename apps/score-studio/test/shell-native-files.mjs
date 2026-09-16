#!/usr/bin/env node
import assert from 'node:assert/strict';
import os from 'node:os';
import path from 'node:path';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { hashScoreDocument, parseScoreDocument } from '@awb/score';
import { saveCanonicalPath, saveProjectionPath } from '../shell/nativeFiles.mjs';

const temporary = await mkdtemp( path.join( os.tmpdir(), 'awb-shell-native-' ) );
try {
  const source = await readFile(
    new URL( '../public/examples/sonic-attunement-01.score.json', import.meta.url ), 'utf8'
  );
  const document = parseScoreDocument( source );
  const canonical = path.join( temporary, 'piece.score.json' );
  await saveCanonicalPath( canonical, source );
  const expectedHash = await hashScoreDocument( document );
  await saveCanonicalPath( canonical, source, { expectedHash } );
  await writeFile( canonical, source.replace( 'Sonic Attunement 01', 'External edit' ), 'utf8' );
  await assert.rejects( saveCanonicalPath( canonical, source, { expectedHash } ), /changed on disk/ );

  const projection = path.join( temporary, 'piece.score.scd' );
  await saveProjectionPath( projection, '// first' );
  await saveProjectionPath( projection, '// second', { expectedText: '// first' } );
  await assert.rejects(
    saveProjectionPath( projection, '// third', { expectedText: '// stale' } ), /changed on disk/
  );
  assert.equal( await readFile( projection, 'utf8' ), '// second' );
  console.log( 'shell-native-files: pass' );
} finally {
  await rm( temporary, { recursive: true, force: true } );
}
