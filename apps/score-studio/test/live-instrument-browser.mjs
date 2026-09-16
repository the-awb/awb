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
  await page.getByRole( 'button', { name: 'Instruments', exact: true } ).click();
  passed += 1;
  await page.getByRole( 'button', { name: 'Start Basic', exact: true } ).click();
  await page.locator( '.liveInstrument.running' ).filter( { hasText: 'fieldBasic' } )
    .waitFor( { timeout: 60000 } );
  passed += 1;
  await page.getByText( '4 live instrument SynthDefs ready.', { exact: true } ).waitFor();
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
  if ( peak < 0.00001 ) throw new Error( `live Basic instrument remained silent (peak ${ peak.toFixed( 6 ) })` );
  passed += 1;

  await page.getByLabel( 'Live freqL', { exact: true } ).fill( '72' );
  await page.waitForTimeout( 100 );
  const liveFrequency = await page.evaluate( () => ( {
    input: document.querySelector( '[aria-label="Live freqL"]' )?.value,
    node: window.__scoreSc?.nodes?.fieldBasic ?? null
  } ) );
  if ( liveFrequency.input !== '72' || liveFrequency.node?.params?.freqL !== 72 ) {
    throw new Error( `live frequency edit did not reach the node snapshot: ${ JSON.stringify( liveFrequency ) }` );
  }
  passed += 1;
  const failure = await page.evaluate( () => window.__scoreSc?.log.find( ( line ) => line.startsWith( 'FAIL ' ) ) ?? null );
  if ( failure ) throw new Error( failure );
  passed += 1;

  await page.getByRole( 'button', { name: 'Release Basic', exact: true } ).click();
  await page.waitForFunction( () => !window.__scoreSc?.nodes?.fieldBasic, null, { timeout: 10000 } );
  passed += 1;
  if ( errors.length ) throw new Error( `browser errors: ${ errors.join( '; ' ) }` );
  passed += 1;
  console.log( `live-instrument-browser: ${ passed }/8 pass (Basic peak ${ peak.toFixed( 5 )}, live n_set, gated release)` );
} catch ( error ) {
  console.error( `live-instrument-browser: FAIL after ${ passed }/8: ${ error.message }` );
  process.exitCode = 1;
} finally {
  await browser.close();
}
