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
  await page.getByRole( 'button', { name: 'standalone', exact: true } ).click();
  await page.getByRole( 'button', { name: 'Play', exact: true } ).click();
  await page.getByText( /Revision 0 ready · 1 SynthDef\./ ).waitFor( { timeout: 60000 } );
  passed += 1;
  await page.locator( '.realizations .runtimeRealizationGroup' ).first().waitFor( { timeout: 10000 } );
  passed += 1;

  let peak = 0;
  const deadline = Date.now() + 8000;
  while ( Date.now() < deadline && peak < 0.00001 ) {
    peak = await page.evaluate( () => {
      const samples = window.__scoreSc?.readRecentSamples( 0.5 );
      if ( !samples ) return 0;
      let result = 0;
      for ( const channel of [ samples.x, samples.y ] ) {
        for ( const value of channel ) result = Math.max( result, Math.abs( value ) );
      }
      return result;
    } );
    if ( peak < 0.00001 ) await page.waitForTimeout( 50 );
  }
  if ( peak < 0.00001 ) throw new Error( `standalone score remained silent (peak ${ peak.toFixed( 6 ) })` );
  passed += 1;
  await page.waitForFunction( () => window.__standaloneScore?.getState().status === 'ended', null,
    { timeout: 30000 } );
  passed += 1;
  if ( errors.length ) throw new Error( `browser errors: ${ errors.join( '; ' ) }` );
  passed += 1;
  console.log( `standalone-audio: ${ passed }/6 pass (peak ${ peak.toFixed( 5 ) })` );
} catch ( error ) {
  console.error( `standalone-audio: FAIL after ${ passed }/6: ${ error.message }` );
  process.exitCode = 1;
} finally {
  await browser.close();
}
