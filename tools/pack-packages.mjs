import { mkdir, rm } from 'node:fs/promises';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';

const root = path.resolve( path.dirname( fileURLToPath( import.meta.url ) ), '..' );
const destination = path.join( root, 'artifacts' );
const npmCache = path.join( tmpdir(), 'awb-package-npm-cache' );
const packages = [
  '@awb/score',
  '@awb/sc-wasm',
  '@awb/sc-console',
  '@awb/instruments',
  '@awb/field-engine',
  '@awb/lissajous-engine',
  '@awb/render-pipeline'
];

await rm( destination, { recursive: true, force: true } );
await mkdir( destination, { recursive: true } );

for ( const workspace of packages ) {
  const result = spawnSync(
    'npm', [ 'pack', '--workspace', workspace, '--pack-destination', destination ],
    { cwd: root, stdio: 'inherit', env: { ...process.env, npm_config_cache: npmCache } }
  );
  if ( result.status !== 0 ) process.exit( result.status ?? 1 );
}
