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
  return null;
}

const playwright = await findPlaywright();
if ( !playwright ) throw new Error( 'Playwright not found; run `npx playwright@latest install chromium` once.' );
const { chromium } = await import( playwright );
const browser = await chromium.launch();
const page = await browser.newPage( { viewport: { width: 1440, height: 900 } } );
const failures = [];
page.on( 'pageerror', ( error ) => failures.push( error.message ) );

try {
  await page.goto( url, { waitUntil: 'domcontentloaded' } );
  await page.getByText( 'AWB', { exact: true } ).waitFor();
  if ( await page.locator( '.scoreEvent' ).count() !== 3 ) failures.push( 'expected three seeded score events' );

  await page.getByRole( 'button', { name: 'Synth lifecycle', exact: true } ).click();
  if ( await page.locator( '.synthLane' ).count() !== 2 ) failures.push( 'expected one lifecycle lane per authored synth create' );
  if ( await page.locator( '.lifecycleEvent.create' ).count() !== 2 ) failures.push( 'lifecycle view did not project both create events' );
  if ( await page.locator( '.lifecycleEvent.release' ).count() !== 2 ) failures.push( '@all release was not projected onto both synth lanes' );
  await page.getByRole( 'button', { name: 'Structure', exact: true } ).click();

  await page.locator( '.scoreEvent' ).first().click();
  if ( !( await page.locator( '.eventJson' ).isVisible() ) ) failures.push( 'event inspector did not open' );
  await page.getByLabel( 'Event time' ).fill( '4.5' );
  await page.getByLabel( 'Event path' ).fill( 'phrase/low' );
  await page.getByRole( 'button', { name: 'Apply event', exact: true } ).click();
  if ( !( await page.locator( '.laneName' ).filter( { hasText: 'phrase' } ).isVisible() ) ) {
    failures.push( 'time/path event edit did not reach the canonical document' );
  }
  await page.getByRole( 'button', { name: 'Undo', exact: true } ).click();
  await page.getByRole( 'button', { name: 'Redo', exact: true } ).click();
  if ( await page.getByLabel( 'Event time' ).inputValue() !== '4.5' ) failures.push( 'redo did not restore the event edit' );

  await page.getByLabel( 'Group name' ).fill( 'movement' );
  await page.getByRole( 'button', { name: 'Group', exact: true } ).click();
  if ( !( await page.locator( '.laneName' ).filter( { hasText: 'movement' } ).isVisible() ) ) {
    failures.push( 'group verb did not reach the canonical document' );
  }

  await page.getByRole( 'button', { name: 'standalone', exact: true } ).click();
  if ( !( await page.getByRole( 'button', { name: 'Start audio', exact: true } ).isVisible() ) ) {
    failures.push( 'standalone runtime controls did not appear' );
  }

  await page.getByRole( 'button', { name: 'Console', exact: true } ).click();
  await page.locator( '.cm-editor' ).waitFor();
  await page.locator( '.consoleWorkspace' ).getByRole( 'button', { name: 'Attach sclang', exact: true } ).click();
  await page.getByText( 'Ctrl-enter evaluates a line', { exact: false } ).waitFor( { timeout: 90000 } );
  await page.getByRole( 'button', { name: 'Working document', exact: true } ).click();
  if ( !( await page.getByText( 'No projection received yet.', { exact: false } ).isVisible() ) ) {
    failures.push( 'working-document boundary did not render' );
  }
} finally {
  await browser.close();
}

if ( failures.length ) {
  failures.forEach( ( failure ) => console.error( `FAIL ${ failure }` ) );
  process.exit( 1 );
}
console.log( 'score-studio-browser: 12/12 pass' );
