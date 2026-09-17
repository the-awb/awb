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

async function outputPeak( seconds = 0.25 ) {
  return page.evaluate( ( windowSeconds ) => {
    const samples = window.__scoreSc?.readRecentSamples( windowSeconds );
    if ( !samples ) return 0;
    let result = 0;
    for ( const channel of [ samples.x, samples.y ] ) {
      for ( const value of channel ) result = Math.max( result, Math.abs( value ) );
    }
    return result;
  }, seconds );
}

async function waitForAudibleOutput( threshold, timeout = 8000 ) {
  let peak = 0;
  const deadline = Date.now() + timeout;
  while ( Date.now() < deadline && peak < threshold ) {
    peak = await outputPeak();
    if ( peak < threshold ) await page.waitForTimeout( 50 );
  }
  return peak;
}

try {
  await page.goto( url, { waitUntil: 'domcontentloaded' } );
  await page.getByText( 'AWB', { exact: true } ).waitFor();
  await page.getByRole( 'button', { name: 'Instruments', exact: true } ).click();
  await page.getByRole( 'button', { name: 'standalone', exact: true } ).click();
  passed += 1;
  const checks = [
    { label: 'Basic', definition: 'fieldBasic', prepare: [ [ 'attackT', 0.05 ], [ 'releaseT', 0.05 ] ], threshold: 0.05 },
    { label: 'Substrate', definition: 'substrate', prepare: [ [ 'attackT', 0.05 ], [ 'releaseT', 0.05 ] ], threshold: 0.04 },
    { label: 'Substrate 2', definition: 'substrate2', prepare: [ [ 'attackT', 0.05 ], [ 'releaseT', 0.05 ] ], threshold: 0.04 },
    { label: 'Resobass2', definition: 'resonantBassEnv2', prepare: [ [ 'ampEnvRatio', 0.02 ] ], threshold: 0.02 }
  ];
  const peaks = {};
  for ( const check of checks ) {
    const card = page.locator( '.liveInstrument' ).filter( {
      has: page.getByText( `\\${ check.definition }`, { exact: true } )
    } );
    for ( const [ control, value ] of check.prepare ) {
      await card.getByLabel( `Live ${ control }`, { exact: true } ).fill( String( value ) );
    }
    await page.getByRole( 'button', { name: `Start ${ check.label }`, exact: true } ).click();
    await card.waitFor( { state: 'visible', timeout: 60000 } );
    await page.getByText( '4 live instrument SynthDefs ready.', { exact: true } ).waitFor();
    const peak = await waitForAudibleOutput( check.threshold );
    if ( peak < check.threshold ) {
      throw new Error( `live ${ check.label } remained inaudible (peak ${ peak.toFixed( 6 ) })` );
    }
    peaks[ check.definition ] = peak;
    await page.getByRole( 'button', { name: `Free ${ check.label }`, exact: true } ).click();
    await page.waitForFunction( ( definition ) => !window.__scoreSc?.nodes?.[ definition ], check.definition );
    await page.waitForTimeout( 350 );
  }
  passed += 4;

  await page.getByRole( 'button', { name: 'Audition', exact: true } ).click();
  const envelopePeak = await waitForAudibleOutput( 0.05 );
  if ( envelopePeak < 0.05 ) {
    throw new Error( `editable envelope instrument remained inaudible (peak ${ envelopePeak.toFixed( 6 ) })` );
  }
  const installedEnvelope = await page.evaluate( () => window.__scoreSc?.nodes?.awbEnvelopeLab?.params?.env ?? null );
  if ( !Array.isArray( installedEnvelope ) || installedEnvelope.length !== 20
    || installedEnvelope[ 1 ] !== 3 ) {
    throw new Error( `editable Env array did not reach /n_setn: ${ JSON.stringify( installedEnvelope ) }` );
  }
  peaks.awbEnvelopeLab = envelopePeak;
  passed += 2;
  await page.locator( '.envelopeLab' ).getByRole( 'button', { name: 'Stop', exact: true } ).click();
  await page.waitForFunction( () => !window.__scoreSc?.nodes?.awbEnvelopeLab );

  await page.getByRole( 'button', { name: 'Start Basic', exact: true } ).click();
  await page.locator( '.liveInstrument.running' ).filter( { hasText: 'fieldBasic' } )
    .waitFor( { timeout: 60000 } );
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
  console.log( `live-instrument-browser: ${ passed }/12 pass (${ Object.entries( peaks )
    .map( ( [ definition, peak ] ) => `${ definition } ${ peak.toFixed( 4 ) }` ).join( ', ' ) }; live n_set, gated release)` );
} catch ( error ) {
  console.error( `live-instrument-browser: FAIL after ${ passed }/12: ${ error.message }` );
  process.exitCode = 1;
} finally {
  await browser.close();
}
