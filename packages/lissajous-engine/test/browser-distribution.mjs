#!/usr/bin/env node

import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { canvasAnimating, openApp, report } from './browser.mjs';

const packageRoot = path.resolve( path.dirname( fileURLToPath( import.meta.url ) ), '..' );
const exampleRoot = path.join( packageRoot, 'examples/browser-distribution' );
const distRoot = path.join( packageRoot, 'dist' );
const contentType = ( file ) => file.endsWith( '.html' ) ? 'text/html; charset=utf-8' :
  'text/javascript; charset=utf-8';

const server = createServer( async ( request, response ) => {
  try {
    const url = new URL( request.url, 'http://localhost' );
    const relative = decodeURIComponent( url.pathname ).replace( /^\/+/, '' );
    const base = relative.startsWith( 'dist/' ) ? distRoot : exampleRoot;
    const local = relative.startsWith( 'dist/' ) ? relative.slice( 5 ) : relative;
    const file = path.resolve( base, local || 'esm.html' );
    if ( !file.startsWith( `${ base }${ path.sep }` ) ) throw new Error( 'path outside fixture root' );
    response.writeHead( 200, { 'Content-Type': contentType( file ) } );
    response.end( await readFile( file ) );
  } catch {
    response.writeHead( 404 );
    response.end( 'Not found' );
  }
} );

await new Promise( ( resolve, reject ) => {
  server.once( 'error', reject );
  server.listen( 0, '127.0.0.1', resolve );
} );
const baseUrl = `http://127.0.0.1:${ server.address().port }`;
const results = [];

for ( const fixture of [
  { page: 'esm.html', ready: 'esmDistributionReady', label: 'direct browser ESM' },
  { page: 'global.html', ready: 'globalDistributionReady', label: 'classic script tag' }
] ) {
  const opened = await openApp( { url: `${ baseUrl }/${ fixture.page }`, settleMs: 300 } );
  try {
    await opened.page.waitForFunction( ( ready ) => globalThis[ ready ] === true, fixture.ready );
    results.push( [ `${ fixture.label } creates the vanilla engine`, true ] );
    results.push( [ `${ fixture.label } owns a working animation loop`,
      await canvasAnimating( opened.page, 250 ) ] );
    const resources = await opened.page.evaluate( () => performance.getEntriesByType( 'resource' )
      .map( ( entry ) => entry.name ) );
    results.push( [ `${ fixture.label } loads no source tree, React or R3F runtime`,
      !resources.some( ( url ) => /\/src\/|react|@react-three\/fiber/i.test( url ) ),
      resources.map( ( url ) => new URL( url ).pathname ).join( ', ' ) ] );
  } finally {
    await opened.page.evaluate( ( ready ) => {
      const prefix = ready.replace( /Ready$/, '' );
      globalThis[ `${ prefix }Engine` ]?.dispose();
    }, fixture.ready ).catch( () => {} );
    await opened.browser.close();
  }
}

await new Promise( ( resolve ) => server.close( resolve ) );
report( results );
