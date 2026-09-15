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
  if ( await page.locator( '.synthBar' ).count() !== 2 ) failures.push( 'lifecycle view did not render one bar per synth' );
  if ( await page.locator( '.synthTriggerTick.release' ).count() !== 2 ) failures.push( '@all release was not projected onto both synth bars' );
  await page.getByRole( 'button', { name: /Expand/ } ).first().click();
  if ( await page.locator( '.expandedTrigger.release' ).count() !== 1 ) failures.push( 'expanded synth did not disclose its release trigger' );
  const releaseTrigger = page.locator( '.expandedTrigger.release' ).first();
  const releaseBox = await releaseTrigger.boundingBox();
  if ( !releaseBox ) failures.push( 'could not locate expanded release trigger for drag test' );
  else {
    await page.mouse.move( releaseBox.x + 5, releaseBox.y + 5 );
    await page.mouse.down();
    await page.mouse.move( releaseBox.x + 27, releaseBox.y + 5, { steps: 3 } );
    await page.mouse.up();
    if ( Number( await page.getByLabel( 'Event time' ).inputValue() ) <= 1 ) {
      failures.push( 'expanded lifecycle trigger drag did not edit its canonical entry' );
    }
  }
  const synthOrder = await page.locator( '.synthLaneName strong' ).allTextContents();
  const firstBar = page.locator( '.synthBar' ).first();
  const barBox = await firstBar.boundingBox();
  if ( !barBox ) failures.push( 'could not locate synth bar for drag test' );
  else {
    await page.mouse.move( barBox.x + 6, barBox.y + 6 );
    await page.mouse.down();
    await page.mouse.move( barBox.x + 36, barBox.y + 6, { steps: 4 } );
    const orderDuringDrag = await page.locator( '.synthLaneName strong' ).allTextContents();
    await page.mouse.up();
    const orderAfterDrag = await page.locator( '.synthLaneName strong' ).allTextContents();
    if ( JSON.stringify( orderDuringDrag ) !== JSON.stringify( synthOrder )
      || JSON.stringify( orderAfterDrag ) !== JSON.stringify( synthOrder ) ) {
      failures.push( 'dragging a synth bar reordered lifecycle rows' );
    }
  }
  await page.getByRole( 'button', { name: 'Structure', exact: true } ).click();

  const widthBeforeZoom = await page.locator( '.timeline' ).evaluate( ( element ) => element.getBoundingClientRect().width );
  await page.getByRole( 'button', { name: 'Zoom in', exact: true } ).click();
  const widthAfterZoom = await page.locator( '.timeline' ).evaluate( ( element ) => element.getBoundingClientRect().width );
  if ( widthAfterZoom <= widthBeforeZoom ) failures.push( 'zoom in did not enlarge the timeline' );

  const firstEvent = page.locator( '.scoreEvent' ).first();
  await firstEvent.scrollIntoViewIfNeeded();
  const eventBox = await firstEvent.boundingBox();
  if ( !eventBox ) failures.push( 'could not locate first event for drag test' );
  else {
    await page.mouse.move( eventBox.x + 8, eventBox.y + 8 );
    await page.mouse.down();
    await page.mouse.move( eventBox.x + 48, eventBox.y + 8, { steps: 4 } );
    await page.mouse.up();
    await firstEvent.click();
    const draggedTime = Number( await page.getByLabel( 'Event time' ).inputValue() );
    if ( draggedTime <= 0 ) failures.push( `drag did not move the canonical event time (got ${ draggedTime })` );
  }

  if ( !( await page.locator( '.eventJson' ).isVisible() ) ) failures.push( 'event inspector did not open' );
  const frequencyControl = page.getByLabel( 'Payload freq', { exact: true } );
  if ( !( await frequencyControl.isVisible() ) ) failures.push( 'typed frequency payload control did not render' );
  else {
    await frequencyControl.fill( '440' );
    await page.getByRole( 'button', { name: 'Apply event', exact: true } ).click();
    const payload = JSON.parse( await page.getByLabel( 'Event payload' ).inputValue() );
    if ( payload.freq !== 440 ) failures.push( 'typed payload edit did not reach raw JSON and canonical entry' );
  }
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
  page.once( 'dialog', ( dialog ) => dialog.accept() );
  await page.getByRole( 'button', { name: 'Demo score', exact: true } ).click();
  await page.getByRole( 'button', { name: 'Score', exact: true } ).click();
  if ( await page.locator( '.scoreEvent' ).count() !== 11 ) failures.push( 'bundled real demo did not open as a canonical score' );
  if ( await page.locator( '.titleInput' ).inputValue() !== 'Sonic Attunement 01' ) failures.push( 'bundled demo metadata did not load' );
  await page.getByRole( 'button', { name: 'Synth lifecycle', exact: true } ).click();
  if ( await page.locator( '.synthEnvelope' ).count() !== 11 ) failures.push( 'real demo did not render one envelope strip per synth row' );
  await page.getByRole( 'button', { name: 'Fit timeline', exact: true } ).click();
  const tickPositions = await page.locator( '.tick' ).evaluateAll( ( ticks ) =>
    ticks.map( ( tick ) => tick.getBoundingClientRect().x ) );
  const closestTicks = Math.min( ...tickPositions.slice( 1 ).map( ( position, index ) => position - tickPositions[ index ] ) );
  if ( closestTicks < 68 ) failures.push( `adaptive ruler labels are only ${ closestTicks }px apart` );
  await page.locator( '.synthBar' ).first().click();
  const durationHandle = page.getByRole( 'button', { name: 'Adjust rinse-01 duration', exact: true } );
  await durationHandle.scrollIntoViewIfNeeded();
  const durationHandleBox = await durationHandle.boundingBox();
  if ( !durationHandleBox ) failures.push( 'could not locate duration handle' );
  else {
    await page.mouse.move( durationHandleBox.x + 2, durationHandleBox.y + 2 );
    await page.mouse.down();
    await page.mouse.move( durationHandleBox.x + 36, durationHandleBox.y + 2, { steps: 4 } );
    await page.mouse.up();
    if ( Number( await page.getByLabel( 'Payload dur', { exact: true } ).inputValue() ) <= 300 ) {
      failures.push( 'duration handle did not update canonical dur through legato' );
    }
  }
  const releaseHandle = page.getByRole( 'button', { name: 'Adjust rinse-01 release', exact: true } );
  await releaseHandle.scrollIntoViewIfNeeded();
  const releaseHandleBox = await releaseHandle.boundingBox();
  if ( !releaseHandleBox ) failures.push( 'could not locate release envelope handle' );
  else {
    await page.mouse.move( releaseHandleBox.x + 2, releaseHandleBox.y + 2 );
    await page.mouse.down();
    await page.mouse.move( releaseHandleBox.x + 38, releaseHandleBox.y + 2, { steps: 4 } );
    await page.mouse.up();
    if ( Number( await page.getByLabel( 'Payload releaseT', { exact: true } ).inputValue() ) <= 24 ) {
      failures.push( 'release envelope handle did not update the canonical SynthDef control' );
    }
  }
} finally {
  await browser.close();
}

if ( failures.length ) {
  failures.forEach( ( failure ) => console.error( `FAIL ${ failure }` ) );
  process.exit( 1 );
}
console.log( 'score-studio-browser: 31/31 pass' );
