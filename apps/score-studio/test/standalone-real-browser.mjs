#!/usr/bin/env node
import path from 'node:path';
import os from 'node:os';
import { existsSync, readdirSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { createScoreDocument, serializeScoreDocument } from '@awb/score';

const url = process.env.VERIFY_URL || 'http://localhost:5201';
const colliderRoot = process.env.AWB_COLLIDER_ROOT
  ?? '/Volumes/ARMED WITH SOUND/SuperCollider/awbCollider';
const scorePath = path.join( colliderRoot, 'examples/score-projects/sonic-attunement-01/attunement-01.score.json' );

async function findPlaywright() {
  const local = path.resolve( 'node_modules/playwright/index.mjs' );
  if ( existsSync( local ) ) return local;
  const cache = path.join( os.homedir(), '.npm/_npx' );
  for ( const directory of existsSync( cache ) ? readdirSync( cache ) : [] ) {
    const candidate = path.join( cache, directory, 'node_modules/playwright/index.mjs' );
    if ( existsSync( candidate ) ) return candidate;
  }
  throw new Error( 'Playwright not found; run `npx playwright@latest install chromium` once.' );
}

const raw = JSON.parse( await readFile( scorePath, 'utf8' ) );
const documentText = serializeScoreDocument( createScoreDocument( {
  ...raw,
  meta: { title: 'Sonic Attunement 01', description: 'Real standalone browser fixture.', tags: [ 'integration-fixture' ] }
} ) );
const { chromium } = await import( await findPlaywright() );
const browser = await chromium.launch();
const page = await browser.newPage( { viewport: { width: 1440, height: 900 } } );
const errors = [];
page.on( 'pageerror', ( error ) => errors.push( error.message ) );
let passed = 0;

try {
  await page.goto( url, { waitUntil: 'domcontentloaded' } );
  await page.getByText( 'AWB', { exact: true } ).waitFor();
  passed += 1;
  await page.locator( 'input[type=file]' ).setInputFiles( {
    name: 'attunement-01.score.json', mimeType: 'application/json', buffer: Buffer.from( documentText )
  } );
  await page.getByText( 'Opened attunement-01.score.json', { exact: true } ).waitFor();
  if ( await page.locator( '.scoreEvent' ).count() !== 11 ) throw new Error( 'browser did not load all eleven events' );
  passed += 1;

  await page.getByRole( 'button', { name: 'standalone', exact: true } ).click();
  await page.getByRole( 'button', { name: 'Load revision', exact: true } ).click();
  await page.getByText( 'Revision 1 ready · 2 SynthDefs.', { exact: true } ).waitFor( { timeout: 60000 } );
  passed += 1;
  await page.locator( '.timelineScroll' ).evaluate( ( scroll, time ) => {
    scroll.scrollLeft = time * 22;
    const lane = scroll.querySelector( '.lane' );
    const rect = lane.getBoundingClientRect();
    lane.dispatchEvent( new MouseEvent( 'click', {
      bubbles: true, clientX: rect.left + 92 + time * 22, clientY: rect.top + 30
    } ) );
  }, 773 );
  await page.getByText( '773.000 s', { exact: true } ).waitFor();
  await page.getByRole( 'button', { name: 'Seek here', exact: true } ).click();
  passed += 1;
  await page.getByRole( 'button', { name: 'Play', exact: true } ).click();
  await page.waitForFunction( () => document.querySelectorAll( '.realization' ).length === 4 );
  passed += 1;
  const failure = await page.evaluate( () => window.__scoreSc?.log.find( ( line ) => line.startsWith( 'FAIL ' ) ) ?? null );
  if ( failure ) throw new Error( failure );
  passed += 1;
  await page.getByRole( 'button', { name: 'Stop', exact: true } ).click();
  await page.waitForFunction( () => window.__standaloneScore?.getState().liveCount === 0 );
  passed += 1;
  if ( errors.length ) throw new Error( `browser errors: ${ errors.join( '; ' ) }` );
  passed += 1;
  console.log( `standalone-real-browser: ${ passed }/8 pass (11 events, four final realizations, stopped immediately)` );
} catch ( error ) {
  console.error( `standalone-real-browser: FAIL after ${ passed }/8: ${ error.message }` );
  process.exitCode = 1;
} finally {
  await browser.close();
}
