// Shared setup for the browser checks in this directory.
//
// Why these exist at all: most of what's hard about this app can't be caught by a unit test or by
// looking at the page. The audio pipeline is a chain of Web Audio nodes feeding a WebGL draw loop,
// and its failure modes are things like "the engine booted but the tap is reading the silent
// worklet" or "the trail is frozen but still lit" - both of which look perfectly healthy in a
// screenshot. So each check drives the real app in a real browser and asserts on something that
// can only be true if the pipeline is actually moving.
//
// Playwright is deliberately NOT a devDependency: these are run by hand when touching the audio
// path, not in CI, and it's a large install to carry for that. `npx playwright` once and it's
// found here.

import { existsSync, readdirSync } from 'node:fs';
import path from 'node:path';
import os from 'node:os';

const findPlaywright = () => {
  const local = path.resolve( 'node_modules/playwright/index.mjs' );
  if ( existsSync( local ) ) return local;
  // npx caches under a content-hashed directory name, so glob rather than hardcode it.
  const npxCache = path.join( os.homedir(), '.npm/_npx' );
  if ( existsSync( npxCache ) ) {
    for ( const dir of readdirSync( npxCache ) ) {
      const candidate = path.join( npxCache, dir, 'node_modules/playwright/index.mjs' );
      if ( existsSync( candidate ) ) return candidate;
    }
  }
  return null;
};

export const DEV_URL = process.env.VERIFY_URL || 'http://localhost:5183';

export const openApp = async ( {
  viewport = { width: 1400, height: 950 },
  initScript,
  url = DEV_URL,
  settleMs = 4000
} = {} ) => {
  const playwrightPath = findPlaywright();
  if ( !playwrightPath ) {
    console.error( 'Playwright not found. Run `npx playwright@latest install chromium` first.' );
    process.exit( 1 );
  }
  const { chromium } = await import( playwrightPath );

  // Without this the AudioContext stays suspended until a trusted gesture, and scsynth never
  // answers anything - it processes OSC on its audio thread.
  // Headless Chromium commonly falls back to SwiftShader, which is useful for functional checks
  // but makes GPU performance figures meaningless. Opt into a visible, hardware-accelerated run
  // for directional profiling with VERIFY_HEADED=1.
  const browser = await chromium.launch( {
    headless: process.env.VERIFY_HEADED !== '1',
    args: [ '--autoplay-policy=no-user-gesture-required' ]
  } );
  const page = await ( await browser.newContext( { viewport } ) ).newPage();
  page.on( 'pageerror', ( e ) => console.log( '  PAGEERROR', e.message.slice( 0, 200 ) ) );
  if ( initScript ) await page.addInitScript( initScript );

  await page.goto( url, { waitUntil: 'domcontentloaded' } );
  await page.waitForTimeout( settleMs );
  return { browser, page };
};

// The SuperCollider block in the Source tab, addressed by its label rather than by any class name
// or nth-child, so restyling the panel doesn't silently break every check.
export const scRow = ( page ) =>
  page.locator( 'text=/🎹 SuperCollider/' ).first().locator( 'xpath=ancestor::div[1]' );

export const engineRunning = ( page ) =>
  page.evaluate( () => document.body.innerText.includes( '● running' ) );

export const waitForEngine = async ( page, seconds = 60 ) => {
  for ( let i = 0; i < seconds; i++ ) {
    if ( await engineRunning( page ) ) return true;
    await page.waitForTimeout( 1000 );
  }
  return false;
};

// Is the visualization actually moving?
//
// A single screenshot can't tell you: the persistence trail stays lit after the audio stops, so a
// dead pipeline renders a perfectly convincing still image. (This caught a false positive in an
// earlier check that counted lit pixels and passed against a frozen trail.) Two frames apart is
// the only honest test.
export const canvasAnimating = async ( page, gapMs = 900 ) => {
  const shot = async () => ( await page.locator( 'canvas' ).first().screenshot() ).toString( 'base64' );
  const before = await shot();
  await page.waitForTimeout( gapMs );
  return before !== await shot();
};

export const report = ( results ) => {
  let failed = 0;
  for ( const [ label, ok, note ] of results ) {
    if ( !ok ) failed++;
    console.log( `  ${ ok ? 'PASS' : 'FAIL' }  ${ label }${ note ? `  (${ note })` : '' }` );
  }
  console.log( failed ? `\n${ failed } check(s) failed.` : '\nAll checks passed.' );
  process.exitCode = failed ? 1 : 0;
};
