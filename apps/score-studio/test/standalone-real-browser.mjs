#!/usr/bin/env node
import path from 'node:path';
import os from 'node:os';
import { existsSync, readdirSync } from 'node:fs';

const url = process.env.VERIFY_URL || 'http://localhost:5201';

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
  await page.getByRole( 'button', { name: 'Demo score', exact: true } ).click();
  await page.getByText( 'Opened sonic-attunement-01.score.json', { exact: true } ).waitFor();
  if ( await page.locator( '.synthBar' ).count() !== 11 ) throw new Error( 'browser did not load all eleven events' );
  passed += 1;

  await page.getByRole( 'button', { name: 'standalone', exact: true } ).click();
  await page.getByRole( 'button', { name: 'Load revision', exact: true } ).click();
  await page.getByText( 'Revision 1 ready · 2 SynthDefs.', { exact: true } ).waitFor( { timeout: 60000 } );
  passed += 1;
  await page.locator( '.synthBar' ).last().evaluate( ( finalBar ) => {
    const lane = finalBar.closest( '.synthLane' );
    const rect = finalBar.getBoundingClientRect();
    lane.dispatchEvent( new MouseEvent( 'dblclick', {
      bubbles: true, clientX: rect.left, clientY: rect.bottom + 2
    } ) );
  } );
  await page.getByText( '773.000 s', { exact: true } ).waitFor();
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
  console.log( `standalone-real-browser: ${ passed }/8 pass (bundled demo, four final realizations, stopped immediately)` );
} catch ( error ) {
  console.error( `standalone-real-browser: FAIL after ${ passed }/8: ${ error.message }` );
  process.exitCode = 1;
} finally {
  await browser.close();
}
