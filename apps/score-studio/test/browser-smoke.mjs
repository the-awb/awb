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
await page.route( '**/synthdefs/awbEnvelopeLab.scsyndef', async ( route ) => {
  await new Promise( ( resolve ) => setTimeout( resolve, 350 ) );
  await route.continue();
} );
await page.addInitScript( () => {
  Object.defineProperty( window, 'showSaveFilePicker', { value: undefined, configurable: true } );
} );
page.on( 'pageerror', ( error ) => failures.push( error.message ) );

try {
  await page.goto( url, { waitUntil: 'domcontentloaded' } );
  await page.getByText( 'AWB', { exact: true } ).waitFor();
  if ( !( await page.locator( '.activityRail' ).isVisible() )
    || !( await page.locator( '.railPanel' ).isVisible() ) ) {
    failures.push( 'left activity rail and separate content panel are missing' );
  }
  if ( await page.getByRole( 'button', { name: 'New', exact: true } ).count() !== 1
    || await page.getByRole( 'button', { name: 'Open…', exact: true } ).count() !== 1
    || await page.getByRole( 'button', { name: 'Demo score', exact: true } ).count() !== 1 ) {
    failures.push( 'browser document ingress controls are missing' );
  }
  await page.locator( '.activityRail' ).getByRole( 'button', { name: 'Instruments', exact: true } ).click();
  if ( !( await page.getByRole( 'listbox', { name: 'Instrument inventory', exact: true } ).isVisible() )
    || await page.getByRole( 'option', { name: /substrate/ } ).count() !== 1 ) {
    failures.push( 'left instrument tab did not show its pinned score inventory' );
  }
  await page.locator( '.activityRail' ).getByRole( 'button', { name: 'Document', exact: true } ).click();
  await page.getByRole( 'button', { name: 'Collapse left panel', exact: true } ).click();
  if ( await page.locator( '.panelLayout.leftCollapsed' ).count() !== 1 ) failures.push( 'left panel did not collapse independently' );
  if ( !( await page.locator( '.activityRail' ).isVisible() ) || await page.locator( '.railPanel' ).isVisible() ) {
    failures.push( 'left collapse did not preserve the activity rail while hiding its content panel' );
  }
  await page.getByRole( 'button', { name: 'Expand left panel', exact: true } ).click();
  await page.getByRole( 'button', { name: 'Collapse right panel', exact: true } ).click();
  if ( await page.locator( '.panelLayout.rightCollapsed' ).count() !== 1 ) failures.push( 'right panel did not collapse independently' );
  await page.getByRole( 'button', { name: 'Expand right panel', exact: true } ).click();
  const bottomBeforeResize = await page.locator( '.bottomPanel' ).evaluate( ( element ) => element.getBoundingClientRect().height );
  const resizeHandle = await page.getByRole( 'separator', { name: 'Resize edit panel' } ).boundingBox();
  if ( !resizeHandle ) failures.push( 'bottom panel resize handle is missing' );
  else {
    await page.mouse.move( resizeHandle.x + 20, resizeHandle.y + 2 );
    await page.mouse.down();
    await page.mouse.move( resizeHandle.x + 20, resizeHandle.y - 45, { steps: 3 } );
    await page.mouse.up();
    const bottomAfterResize = await page.locator( '.bottomPanel' ).evaluate( ( element ) => element.getBoundingClientRect().height );
    if ( bottomAfterResize <= bottomBeforeResize ) failures.push( 'bottom panel did not resize vertically' );
  }
  await page.getByRole( 'button', { name: 'Collapse edit panel', exact: true } ).click();
  if ( await page.locator( '.panelLayout.bottomCollapsed' ).count() !== 1 ) failures.push( 'bottom panel did not collapse independently' );
  await page.getByRole( 'button', { name: 'Expand edit panel', exact: true } ).click();
  if ( await page.locator( '.instrumentCard' ).count() !== 1 ) failures.push( 'seed score instrument panel did not deduplicate SynthDefs' );
  const seedInstrument = page.locator( '.instrumentCard' ).first();
  if ( !( await seedInstrument.getByText( '\\substrate', { exact: true } ).isVisible() ) ) {
    failures.push( 'seed score instrument panel did not name its SynthDef' );
  }
  await seedInstrument.locator( 'summary' ).click();
  await seedInstrument.getByText( 'freqA=60', { exact: true } ).waitFor( { timeout: 5000 } )
    .catch( () => failures.push( 'instrument panel did not disclose compiled SynthDef controls' ) );
  await page.locator( '.viewTabs' ).getByRole( 'button', { name: 'Instruments', exact: true } ).click();
  if ( !( await page.getByRole( 'heading', { name: 'Hosted instruments', exact: true } ).isVisible() ) ) failures.push( 'hosted instrument boundary is missing' );
  if ( await page.getByRole( 'button', { name: 'Prepare audio', exact: true } ).count() ) failures.push( 'hosted mode exposed browser audio preparation' );
  await page.getByRole( 'button', { name: 'standalone', exact: true } ).click();
  await page.locator( '.activityRail' ).getByRole( 'button', { name: 'Instruments', exact: true } ).click();
  const inventory = page.getByRole( 'listbox', { name: 'Instrument inventory', exact: true } );
  await inventory.getByRole( 'option', { name: /awbSchedulerPulse/ } ).waitFor();
  if ( await inventory.getByText( 'system / context', { exact: true } ).count() === 0 ) {
    failures.push( 'browser system SynthDefs were not available in the instrument inventory' );
  }
  const inventorySearch = page.getByLabel( 'Search instruments', { exact: true } );
  await inventory.getByRole( 'option', { name: /awbEnvelopeLab/ } ).click();
  await inventory.getByRole( 'option', { name: /awbSchedulerPulse/ } ).click();
  await page.getByLabel( 'Draft freq', { exact: true } ).waitFor();
  await page.waitForTimeout( 450 );
  if ( await page.locator( '.focusPanelContent > header strong' ).textContent() !== '\\awbSchedulerPulse' ) {
    failures.push( 'a late SynthDef description replaced the newer instrument focus' );
  }
  await inventorySearch.fill( 'SchedulerPulse' );
  if ( await inventory.getByRole( 'option' ).count() !== 1 ) failures.push( 'instrument inventory search did not filter rows' );
  await inventory.getByRole( 'option', { name: /awbSchedulerPulse/ } ).click();
  await page.getByRole( 'heading', { name: 'SynthDef', exact: true } ).waitFor();
  await page.getByLabel( 'Draft freq', { exact: true } ).waitFor();
  if ( !( await inventory.getByRole( 'option', { name: /awbSchedulerPulse.*audio/ } ).isVisible() ) ) {
    failures.push( 'modelled SynthDef did not disclose its audio/control/utility classification' );
  }
  if ( await page.locator( '.bottomPanel' ).getByText( 'browser bundle', { exact: false } ).count() === 0 ) {
    failures.push( 'selected system SynthDef did not create a visibly sourced bottom-panel draft' );
  }
  await page.locator( '.activityRail' ).getByRole( 'button', { name: 'Document', exact: true } ).click();
  await page.getByRole( 'button', { name: 'Collapse left panel', exact: true } ).click();
  await page.getByRole( 'button', { name: 'Expand left panel', exact: true } ).click();
  await page.locator( '.activityRail' ).getByRole( 'button', { name: 'Instruments', exact: true } ).click();
  const persistedInstrument = inventory.getByRole( 'option', { name: /awbSchedulerPulse/ } );
  if ( await inventorySearch.inputValue() !== 'SchedulerPulse'
    || !( await persistedInstrument.isVisible() )
    || !( await persistedInstrument.getByText( 'modelled', { exact: true } ).isVisible() )
    || !( await persistedInstrument.getByText( 'loaded', { exact: true } ).isVisible() ) ) {
    failures.push( 'instrument search and admitted model state did not survive tab/collapse changes' );
  }
  await page.locator( '.activityRail' ).getByRole( 'button', { name: 'Document', exact: true } ).click();
  if ( await page.locator( '.liveInstrument' ).count() !== 4 ) failures.push( 'live instrument tab did not expose the four catalogued instruments' );
  if ( !( await page.getByRole( 'heading', { name: 'Live instruments', exact: true } ).isVisible() ) ) failures.push( 'live instrument workspace heading is missing' );
  if ( !( await page.getByRole( 'heading', { name: 'Envelope lab', exact: true } ).isVisible() ) ) failures.push( 'editable envelope instrument is missing' );
  if ( await page.locator( '.envelopeCurveEditor circle' ).count() !== 4 ) failures.push( 'default ADSR did not render four editable points' );
  await page.locator( '.envelopeEditorTabs' ).getByRole( 'button', { name: 'segments', exact: true } ).click();
  if ( await page.locator( '.envelopeSegment' ).count() !== 3 ) failures.push( 'segment editor did not expose the ADSR stages' );
  await page.getByLabel( 'Envelope form', { exact: true } ).selectOption( 'triangle' );
  if ( await page.locator( '.envelopeSegment' ).count() !== 2 ) failures.push( 'envelope template did not replace the editable structure' );
  await page.locator( '.envelopeEditorTabs' ).getByRole( 'button', { name: 'raw', exact: true } ).click();
  if ( !( await page.getByLabel( 'Envelope JSON', { exact: true } ).isVisible() ) ) failures.push( 'raw envelope editor mode is missing' );
  if ( await page.getByLabel( 'Live freqL', { exact: true } ).inputValue() !== '60' ) failures.push( 'live Basic GUI did not use the compiled frequency default' );
  if ( Number( await page.getByLabel( 'Live amp', { exact: true } ).first().inputValue() ) !== 1 ) failures.push( 'live instrument gain did not preserve the SynthDef default' );
  if ( !( await page.getByText( 'Amplitude envelope: 2s attack · 4s release', { exact: true } ).isVisible() ) ) failures.push( 'live instrument did not disclose its audible envelope timing' );
  await page.getByRole( 'button', { name: 'Score', exact: true } ).click();
  if ( await page.locator( '.transportPosition strong' ).count() !== 1
    || await page.locator( '.scoreToolbar .timeReadout' ).count() !== 0 ) {
    failures.push( 'transport and timeline strips did not reduce to one authoritative time display' );
  }
  if ( !( await page.getByRole( 'button', { name: 'Synth lifecycle', exact: true } ).evaluate( ( button ) => button.classList.contains( 'active' ) ) ) ) {
    failures.push( 'synth lifecycle is not the default score layout' );
  }
  if ( await page.locator( '.synthLane' ).count() !== 2 ) failures.push( 'expected one lifecycle lane per authored synth create' );
  if ( await page.locator( '.synthBar' ).count() !== 2 ) failures.push( 'lifecycle view did not render one bar per synth' );
  if ( await page.locator( '.expandedTrigger.release' ).count() !== 0 ) failures.push( 'seed score still contains an authored release' );
  if ( await page.locator( '.synthTriggerTick.auto-release' ).count() !== 2 ) failures.push( 'finite seed notes lost their derived release boundaries' );
  const toolbarHeightClosed = await page.locator( '.scoreToolbars' ).evaluate( ( element ) => element.getBoundingClientRect().height );
  await page.locator( '.eventCommandPalette summary' ).click();
  const paletteGeometry = await page.locator( '.scoreToolbars' ).evaluate( ( element ) => ( {
    toolbarHeight: element.getBoundingClientRect().height,
    toolbarBottom: element.getBoundingClientRect().bottom,
    menuBottom: element.querySelector( '.eventCommandPalette > div' ).getBoundingClientRect().bottom
  } ) );
  if ( paletteGeometry.toolbarHeight !== toolbarHeightClosed ) failures.push( 'opening Add changed the fixed toolbar height' );
  if ( paletteGeometry.menuBottom <= paletteGeometry.toolbarBottom ) failures.push( 'Add menu did not overlay the score below the toolbar' );
  for ( const label of [ '+ note', '+ synth', '+ set', '+ release', '+ free' ] ) {
    if ( await page.getByRole( 'button', { name: label, exact: true } ).count() !== 1 ) {
      failures.push( `score command palette is missing ${ label }` );
    }
  }
  await page.locator( '.eventCommandPalette summary' ).click();
  const firstBar = page.locator( '.synthBar' ).first();
  await page.locator( '.tick' ).nth( 1 ).click();
  await firstBar.click();
  await page.locator( '.eventCommandPalette summary' ).click();
  await page.getByRole( 'button', { name: '+ set', exact: true } ).click();
  const inheritedFreq = page.getByLabel( 'Payload freqA', { exact: true } );
  const inheritedAmp = page.getByLabel( 'Payload amp', { exact: true } );
  if ( await inheritedFreq.inputValue() !== '' || await inheritedFreq.getAttribute( 'placeholder' ) !== '36' ) {
    failures.push( 'set editor did not show the parent frequency as a non-authored default' );
  }
  if ( await inheritedAmp.inputValue() !== '' || await inheritedAmp.getAttribute( 'placeholder' ) !== '0.25' ) {
    failures.push( 'set editor did not expose a non-catalogued parent control as an inherited default' );
  }
  const sparseSetBefore = JSON.parse( await page.getByLabel( 'Event payload' ).inputValue() );
  if ( sparseSetBefore.freqA !== undefined || sparseSetBefore.amp !== undefined ) {
    failures.push( 'inherited set defaults leaked into the authored payload' );
  }
  await inheritedAmp.fill( '0.5' );
  const sparseSetAfter = JSON.parse( await page.getByLabel( 'Event payload' ).inputValue() );
  if ( sparseSetAfter.amp !== 0.5 || sparseSetAfter.freqA !== undefined ) {
    failures.push( 'set editor did not serialize only the explicitly changed control' );
  }
  await page.getByRole( 'button', { name: 'Delete', exact: true } ).click();
  await firstBar.click();
  await page.locator( '.eventCommandPalette summary' ).click();
  await page.getByRole( 'button', { name: '+ release', exact: true } ).click();
  if ( await page.locator( '.expandedTrigger.release' ).count() !== 1 ) failures.push( 'authored release was not projected as a child of its parent synth lane' );
  if ( await page.locator( '.expandedTrigger.release' ).count() !== 1 ) failures.push( 'expanded synth did not disclose its release trigger' );
  const releaseTrigger = page.locator( '.expandedTrigger.release' ).first();
  const releaseBox = await releaseTrigger.boundingBox();
  if ( !releaseBox ) failures.push( 'could not locate expanded release trigger for drag test' );
  else {
    const releaseTimeBeforeDrag = Number( await page.getByLabel( 'Event time' ).inputValue() );
    await page.mouse.move( releaseBox.x + 5, releaseBox.y + 5 );
    await page.mouse.down();
    await page.mouse.move( releaseBox.x + 27, releaseBox.y + 5, { steps: 3 } );
    await page.mouse.up();
    if ( Number( await page.getByLabel( 'Event time' ).inputValue() ) <= releaseTimeBeforeDrag ) {
      failures.push( 'expanded lifecycle trigger drag did not edit its canonical entry' );
    }
  }
  await page.getByRole( 'button', { name: 'Delete', exact: true } ).click();
  const synthOrder = await page.locator( '.synthLaneName strong' ).allTextContents();
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
  if ( await page.locator( '.scoreEvent' ).count() !== 2 ) failures.push( 'expected two seeded score events' );

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
  if ( await page.locator( '.bottomPanel .eventJson' ).count() !== 1 ) failures.push( 'event editor was not relocated to the bottom focus panel' );
  const eventSynthDef = page.getByLabel( 'Event SynthDef', { exact: true } );
  if ( await eventSynthDef.evaluate( ( element ) => element.tagName ) !== 'SELECT'
    || await eventSynthDef.locator( 'option[value="resonantBassEnv2"]' ).count() !== 1 ) {
    failures.push( 'event SynthDef picker did not expose explicit active instrument choices' );
  } else {
    if ( await eventSynthDef.locator( 'option[value="resonantBassEnv2"]' ).textContent() !== 'resonantBassEnv2' ) {
      failures.push( 'event SynthDef picker exposed an empty label for an active instrument' );
    }
    await eventSynthDef.selectOption( 'resonantBassEnv2' );
    const switchedPayload = JSON.parse( await page.getByLabel( 'Event payload' ).inputValue() );
    if ( switchedPayload.def !== 'resonantBassEnv2' ) failures.push( 'event SynthDef choice did not update the payload' );
    await eventSynthDef.selectOption( 'substrate' );
  }
  const frequencyControl = page.getByLabel( 'Payload freqA', { exact: true } );
  if ( !( await frequencyControl.isVisible() ) ) failures.push( 'typed frequency payload control did not render' );
  else {
    await frequencyControl.fill( '440' );
    await page.getByRole( 'button', { name: 'Apply event', exact: true } ).click();
    const payload = JSON.parse( await page.getByLabel( 'Event payload' ).inputValue() );
    if ( payload.freqA !== 440 ) failures.push( 'typed payload edit did not reach raw JSON and canonical entry' );
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

  await page.getByRole( 'button', { name: 'Generate SC document', exact: true } ).click();
  if ( !( await page.getByText( 'Desktop score projection stored in app data.', { exact: true } ).isVisible() ) ) {
    failures.push( 'standalone desktop score projection was not retained in app data' );
  }
  if ( !( await page.getByText( 'AWB GENERATED SCORE PROJECTION', { exact: false } ).isVisible() ) ) {
    failures.push( 'standalone generation did not open the local SC working document' );
  }
  await page.getByLabel( 'SC output type' ).selectOption( 'browser-pseq' );
  await page.getByRole( 'button', { name: 'Generate SC document', exact: true } ).click();
  if ( !( await page.getByText( 'Browser Pseq reduction stored in app data.', { exact: true } ).isVisible() ) ) {
    failures.push( 'standalone Pseq reduction was not retained in app data' );
  }
  if ( !( await page.getByText( 'AWB GENERATED BROWSER PSEQ REDUCTION', { exact: false } ).isVisible() ) ) {
    failures.push( 'Pseq reduction did not become the working document' );
  }
  const storedProjection = await page.evaluate( () => JSON.parse(
    localStorage.getItem( 'awb.score.projection.untitled-score.browser-pseq' )
  ) );
  if ( !Number.isInteger( storedProjection?.revision )
    || !storedProjection?.text?.includes( '~scorePattern = Pseq' ) ) {
    failures.push( 'Pseq app-data record did not preserve the generated revision and text' );
  }

  await page.getByRole( 'button', { name: 'Console', exact: true } ).click();
  await page.getByRole( 'button', { name: 'Scratch console', exact: true } ).click();
  await page.locator( '.cm-editor' ).waitFor();
  await page.locator( '.consoleWorkspace' ).getByRole( 'button', { name: 'Attach sclang', exact: true } ).click();
  await page.getByText( 'Ctrl-enter evaluates a line', { exact: false } ).waitFor( { timeout: 90000 } );
  await page.getByRole( 'button', { name: 'Working document', exact: true } ).click();
  if ( !( await page.getByText( 'AWB GENERATED BROWSER PSEQ REDUCTION', { exact: false } ).isVisible() ) ) {
    failures.push( 'local SC working document disappeared after attaching browser sclang' );
  }
  page.once( 'dialog', ( dialog ) => dialog.accept() );
  await page.getByRole( 'button', { name: 'Demo score', exact: true } ).click();
  await page.getByRole( 'button', { name: 'Score', exact: true } ).click();
  if ( await page.locator( '.synthLane' ).count() !== 11 ) failures.push( 'bundled real demo did not open as a canonical score' );
  if ( await page.locator( '.titleInput' ).inputValue() !== 'Sonic Attunement 01' ) failures.push( 'bundled demo metadata did not load' );
  if ( await page.locator( '.synthEnvelope' ).count() !== 11 ) failures.push( 'real demo did not render one envelope strip per synth row' );
  if ( await page.locator( '.instrumentCard' ).count() !== 2 ) failures.push( 'real demo instrument panel did not show its two SynthDefs' );
  const polyLane = page.locator( '.synthLane' ).filter( { has: page.locator( '.synthLaneName small' ).filter( { hasText: '×' } ) } ).first();
  if ( await polyLane.count() ) {
    await polyLane.locator( '.synthDisclosure' ).click();
    if ( await polyLane.locator( '.synthVoiceChild' ).count() < 2 ) failures.push( 'polyphonic score event did not expose derived voice children' );
    else {
      await polyLane.locator( '.synthVoiceChild' ).first().click();
      if ( !( await page.locator( '.eventMetaBar' ).textContent() ).includes( 'Voice 1 of ' ) ) {
        failures.push( 'selecting a polyphonic child did not scope the event editor to that voice' );
      }
      const childFrequency = page.getByLabel( 'Payload freqA', { exact: true } );
      const siblingBefore = JSON.parse( await page.getByLabel( 'Event payload' ).inputValue() ).freqA[ 1 ];
      await childFrequency.fill( '300' );
      const childEdit = JSON.parse( await page.getByLabel( 'Event payload' ).inputValue() ).freqA;
      if ( childEdit[ 0 ] !== 300 || childEdit[ 1 ] !== siblingBefore ) {
        failures.push( 'editing one polyphonic child did not update only its parent array slot' );
      }
    }
  }
  await page.waitForTimeout( 250 );
  const fittedSize = await page.locator( '.timelineScroll' ).evaluate( ( scroll ) => ( {
    viewport: scroll.clientWidth,
    content: scroll.querySelector( '.timeline' ).getBoundingClientRect().width
  } ) );
  if ( fittedSize.content > fittedSize.viewport + 2 ) {
    failures.push( `opened score did not fit automatically (${ fittedSize.content }px in ${ fittedSize.viewport }px)` );
  }
  const tickPositions = await page.locator( '.tick' ).evaluateAll( ( ticks ) =>
    ticks.map( ( tick ) => tick.getBoundingClientRect().x ) );
  const closestTicks = Math.min( ...tickPositions.slice( 1 ).map( ( position, index ) => position - tickPositions[ index ] ) );
  if ( closestTicks < 68 ) failures.push( `adaptive ruler labels are only ${ closestTicks }px apart` );
  const rulerTop = await page.locator( '.ruler' ).evaluate( ( element ) => element.getBoundingClientRect().top );
  await page.locator( '.timelineScroll' ).evaluate( ( scroll ) => { scroll.scrollTop = 320; } );
  await page.waitForTimeout( 50 );
  const pinnedRulerTop = await page.locator( '.ruler' ).evaluate( ( element ) => element.getBoundingClientRect().top );
  if ( Math.abs( rulerTop - pinnedRulerTop ) > 2 ) failures.push( 'timeline ruler scrolled out of its pinned position' );
  await page.locator( '.synthBar' ).first().click();
  const frequencyInput = page.getByLabel( 'Payload freqA', { exact: true } );
  await frequencyInput.fill( '' );
  await frequencyInput.pressSequentially( '155.5', { delay: 20 } );
  await page.waitForTimeout( 100 );
  if ( Number( await frequencyInput.inputValue() ) !== 155.5 ) {
    failures.push( 'typed event control reverted before commit' );
  }
  const frequencyRaw = JSON.parse( await page.getByLabel( 'Event payload' ).inputValue() );
  if ( frequencyRaw.freqA !== 155.5 ) failures.push( 'typed event control did not update raw event data' );
  await page.getByRole( 'heading', { name: 'Event', exact: true } ).click();
  await page.locator( '.synthBar' ).nth( 1 ).click();
  await page.locator( '.synthBar' ).first().click();
  if ( Number( await page.getByLabel( 'Payload freqA', { exact: true } ).inputValue() ) !== 155.5 ) {
    failures.push( 'typed event control was not committed across blur and reselection' );
  }
  const releaseWidthBeforeRawEdit = await page.locator( '.synthEnvelope .envelopeRelease' ).first()
    .evaluate( ( element ) => element.getBoundingClientRect().width );
  const rawEvent = JSON.parse( await page.getByLabel( 'Event payload' ).inputValue() );
  rawEvent.releaseT = 36;
  await page.getByLabel( 'Event payload' ).fill( JSON.stringify( rawEvent, null, 2 ) );
  if ( Number( await page.getByLabel( 'Payload releaseT', { exact: true } ).inputValue() ) !== 36 ) {
    failures.push( 'raw event JSON did not preview into typed payload controls' );
  }
  const releaseWidthAfterRawEdit = await page.locator( '.synthEnvelope .envelopeRelease' ).first()
    .evaluate( ( element ) => element.getBoundingClientRect().width );
  if ( releaseWidthAfterRawEdit <= releaseWidthBeforeRawEdit ) {
    failures.push( 'raw event JSON did not update the envelope projection' );
  }
  await page.getByRole( 'heading', { name: 'Event', exact: true } ).click();
  const durationHandle = page.getByRole( 'button', { name: 'Adjust rinse-01 duration', exact: true } );
  await durationHandle.scrollIntoViewIfNeeded();
  const durationHandleBox = await durationHandle.boundingBox();
  if ( !durationHandleBox ) failures.push( 'could not locate duration handle' );
  else {
    await page.mouse.move( durationHandleBox.x + 2, durationHandleBox.y + 2 );
    await page.mouse.down();
    await page.mouse.move( durationHandleBox.x + 36, durationHandleBox.y + 2, { steps: 4 } );
    if ( Number( await page.getByLabel( 'Payload dur', { exact: true } ).inputValue() ) <= 300 ) {
      failures.push( 'duration handle did not preview payload dur before pointer-up' );
    }
    await page.mouse.up();
    if ( Number( await page.getByLabel( 'Payload dur', { exact: true } ).inputValue() ) <= 300 ) {
      failures.push( 'duration handle did not update canonical dur' );
    }
  }
  const releaseHandle = page.getByRole( 'button', { name: 'Adjust rinse-01 Amplitude release', exact: true } );
  await releaseHandle.scrollIntoViewIfNeeded();
  const releaseHandleBox = await releaseHandle.boundingBox();
  if ( !releaseHandleBox ) failures.push( 'could not locate release envelope handle' );
  else {
    await page.mouse.move( releaseHandleBox.x + 2, releaseHandleBox.y + 2 );
    await page.mouse.down();
    await page.mouse.move( releaseHandleBox.x + 38, releaseHandleBox.y + 2, { steps: 4 } );
    if ( Number( await page.getByLabel( 'Payload releaseT', { exact: true } ).inputValue() ) <= 24 ) {
      failures.push( 'release handle did not preview payload releaseT before pointer-up' );
    }
    await page.mouse.up();
    if ( Number( await page.getByLabel( 'Payload releaseT', { exact: true } ).inputValue() ) <= 24 ) {
      failures.push( 'release envelope handle did not update the canonical SynthDef control' );
    }
  }
  await page.getByRole( 'button', { name: 'Expand rinse-01', exact: true } ).click();
  const tremoloHandle = page.getByRole( 'button', { name: 'Adjust rinse-01 Tremolo depth attack', exact: true } );
  await tremoloHandle.scrollIntoViewIfNeeded();
  const tremoloHandleBox = await tremoloHandle.boundingBox();
  if ( !tremoloHandleBox ) failures.push( 'could not locate non-amplitude envelope handle' );
  else {
    await page.mouse.move( tremoloHandleBox.x + 2, tremoloHandleBox.y + 2 );
    await page.mouse.down();
    await page.mouse.move( tremoloHandleBox.x + 24, tremoloHandleBox.y + 2, { steps: 4 } );
    await page.mouse.up();
    const tremoloEvent = JSON.parse( await page.getByLabel( 'Event payload' ).inputValue() );
    if ( !( tremoloEvent.tremA > 0 ) ) {
      failures.push( 'non-amplitude envelope handle did not update its SynthDef control' );
    }
  }
} finally {
  await browser.close();
}

if ( failures.length ) {
  failures.forEach( ( failure ) => console.error( `FAIL ${ failure }` ) );
  process.exit( 1 );
}
console.log( 'score-studio-browser: 78/78 pass' );
