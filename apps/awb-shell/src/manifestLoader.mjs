import path from 'node:path';
import { access, readFile } from 'node:fs/promises';

const MANIFEST_SCHEMA = 'awb.tool/1';
const PRELOAD_PROTOCOL = 1;
const ID_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const CAPABILITY_GROUPS = Object.freeze( [ 'filesystem', 'media', 'connections', 'rendering' ] );

function nonEmptyString( value, label ) {
  if ( typeof value !== 'string' || !value.trim() ) throw new Error( `${ label } must be a non-empty string.` );
  return value;
}

function containedPath( root, relative, label ) {
  nonEmptyString( relative, label );
  if ( path.isAbsolute( relative ) ) throw new Error( `${ label } must be relative to its artifact.` );
  const target = path.resolve( root, relative );
  const resolvedRoot = path.resolve( root );
  if ( target !== resolvedRoot && !target.startsWith( `${ resolvedRoot }${ path.sep }` ) ) {
    throw new Error( `${ label } escapes its artifact.` );
  }
  return target;
}

function boundedStringArray( value, label ) {
  if ( value === undefined ) return Object.freeze( [] );
  if ( !Array.isArray( value ) || value.length > 32
    || value.some( ( item ) => typeof item !== 'string' || !item || item.length > 64 ) ) {
    throw new Error( `${ label } must be an array of bounded capability names.` );
  }
  return Object.freeze( [ ...new Set( value ) ] );
}

export function validateToolManifest( input, artifactRoot ) {
  if ( !input || typeof input !== 'object' || Array.isArray( input ) ) throw new Error( 'Tool manifest must be an object.' );
  if ( input.schema !== MANIFEST_SCHEMA ) throw new Error( `Unsupported tool manifest schema: ${ input.schema ?? 'missing' }.` );
  if ( !ID_PATTERN.test( input.id ?? '' ) ) throw new Error( 'Tool id must be a lower-case kebab-case identifier.' );
  nonEmptyString( input.name, 'Tool name' );
  nonEmptyString( input.version, 'Tool version' );
  if ( !input.renderer || typeof input.renderer !== 'object' ) throw new Error( 'Tool renderer is required.' );
  if ( input.renderer.preloadProtocol !== PRELOAD_PROTOCOL ) {
    throw new Error( `Unsupported preload protocol: ${ input.renderer.preloadProtocol ?? 'missing' }.` );
  }
  const rendererEntry = containedPath( artifactRoot, input.renderer.entry, 'Renderer entry' );
  const launchProfiles = input.launchProfiles ?? [];
  if ( !Array.isArray( launchProfiles ) || launchProfiles.length > 16 ) throw new Error( 'launchProfiles must be a bounded array.' );
  const profileIDs = new Set();
  const profiles = launchProfiles.map( ( profile ) => {
    if ( !profile || typeof profile !== 'object' || !ID_PATTERN.test( profile.id ?? '' ) ) {
      throw new Error( 'Each launch profile needs a kebab-case id.' );
    }
    if ( profileIDs.has( profile.id ) ) throw new Error( `Duplicate launch profile: ${ profile.id }.` );
    profileIDs.add( profile.id );
    return Object.freeze( { id: profile.id, label: nonEmptyString( profile.label, 'Launch profile label' ) } );
  } );
  const requested = input.capabilities ?? {};
  const capabilities = Object.freeze( Object.fromEntries( CAPABILITY_GROUPS.map( ( group ) => [
    group, boundedStringArray( requested[ group ], `capabilities.${ group }` )
  ] ) ) );
  const connectionPolicies = Object.freeze( Object.fromEntries( Object.entries( input.connectionPolicies ?? {} ).map( ( [ id, policy ] ) => {
    if ( !capabilities.connections.includes( id ) || !policy || typeof policy !== 'object' ) throw new Error( `Invalid connection policy: ${ id }.` );
    const allowedPrefixes = boundedStringArray( policy.allowedPrefixes, `connectionPolicies.${ id }.allowedPrefixes` );
    if ( !allowedPrefixes.length || allowedPrefixes.some( ( prefix ) => !prefix.startsWith( '/' ) ) ) throw new Error( `Connection policy ${ id } needs OSC address prefixes.` );
    for ( const field of [ 'clientIdentityAddress', 'disconnectAddress' ] ) {
      if ( policy[ field ] !== undefined && ( typeof policy[ field ] !== 'string' || !policy[ field ].startsWith( '/' ) ) ) throw new Error( `${ field } must be an OSC address.` );
    }
    const clientIdentityAddresses = boundedStringArray(
      policy.clientIdentityAddresses ?? ( policy.clientIdentityAddress ? [ policy.clientIdentityAddress ] : [] ),
      `connectionPolicies.${ id }.clientIdentityAddresses`
    );
    const disconnectAddresses = boundedStringArray(
      policy.disconnectAddresses ?? ( policy.disconnectAddress ? [ policy.disconnectAddress ] : [] ),
      `connectionPolicies.${ id }.disconnectAddresses`
    );
    if ( [ ...clientIdentityAddresses, ...disconnectAddresses ].some( ( address ) => !address.startsWith( '/' ) ) ) {
      throw new Error( `Connection policy ${ id } identity and disconnect entries must be OSC addresses.` );
    }
    return [ id, Object.freeze( { allowedPrefixes, clientIdentityAddresses, disconnectAddresses } ) ];
  } ) ) );
  let nodeManagerBinding = null;
  if ( input.hostBindings?.nodeManager !== undefined ) {
    const binding = input.hostBindings.nodeManager;
    if ( !binding || typeof binding !== 'object' || !/^[A-Za-z][A-Za-z0-9_-]{0,63}$/.test( binding.toolSource ?? '' ) ) {
      throw new Error( 'hostBindings.nodeManager needs a bounded toolSource.' );
    }
    nodeManagerBinding = Object.freeze( { toolSource: binding.toolSource } );
  }
  if ( !Array.isArray( input.documentKinds ?? [] ) || ( input.documentKinds ?? [] ).length > 32 ) {
    throw new Error( 'documentKinds must be a bounded array.' );
  }
  const documentKindIDs = new Set();
  const documentKinds = ( input.documentKinds ?? [] ).map( ( kind ) => {
    if ( !kind || typeof kind !== 'object' || !ID_PATTERN.test( kind.id ?? '' ) ) throw new Error( 'Document kind needs a kebab-case id.' );
    if ( documentKindIDs.has( kind.id ) ) throw new Error( `Duplicate document kind: ${ kind.id }.` );
    documentKindIDs.add( kind.id );
    const extensions = boundedStringArray( kind.extensions, `documentKinds.${ kind.id }.extensions` );
    if ( !extensions.length || extensions.some( ( extension ) => !/^[A-Za-z0-9.-]+$/.test( extension ) ) ) throw new Error( `Document kind ${ kind.id } needs safe extensions.` );
    const actions = boundedStringArray( kind.actions, `documentKinds.${ kind.id }.actions` );
    if ( actions.some( ( action ) => ![ 'new', 'recent', 'browse' ].includes( action ) ) ) throw new Error( `Document kind ${ kind.id } has an unsupported action.` );
    const profileID = kind.profileID ?? 'standalone';
    if ( !profileIDs.has( profileID ) ) throw new Error( `Document kind ${ kind.id } uses unknown launch profile: ${ profileID }.` );
    return Object.freeze( { id: kind.id, label: nonEmptyString( kind.label, 'Document kind label' ), extensions, actions,
      profileID } );
  } );
  const width = Number( input.view?.defaultWidth ?? 1200 );
  const height = Number( input.view?.defaultHeight ?? 800 );
  if ( !Number.isInteger( width ) || width < 480 || width > 4096
    || !Number.isInteger( height ) || height < 320 || height > 2160 ) throw new Error( 'Tool view dimensions are invalid.' );
  return Object.freeze( {
    schema: MANIFEST_SCHEMA,
    id: input.id,
    name: input.name,
    version: input.version,
    artifactRoot: path.resolve( artifactRoot ),
    renderer: Object.freeze( {
      entry: input.renderer.entry,
      entryPath: rendererEntry,
      preloadProtocol: PRELOAD_PROTOCOL,
      crossOriginIsolated: Boolean( input.renderer.crossOriginIsolated )
    } ),
    view: Object.freeze( { defaultWidth: width, defaultHeight: height, allowMultiple: input.view?.allowMultiple !== false } ),
    launchProfiles: Object.freeze( profiles ),
    capabilities, connectionPolicies,
    hostBindings: Object.freeze( { nodeManager: nodeManagerBinding } ),
    documentKinds: Object.freeze( documentKinds )
  } );
}

export async function loadToolManifest( artifactRoot ) {
  const manifestPath = path.join( path.resolve( artifactRoot ), 'tool-manifest.json' );
  let parsed;
  try { parsed = JSON.parse( await readFile( manifestPath, 'utf8' ) ); }
  catch ( error ) { throw new Error( `Cannot load ${ manifestPath }: ${ error.message }`, { cause: error } ); }
  const manifest = validateToolManifest( parsed, artifactRoot );
  try { await access( manifest.renderer.entryPath ); }
  catch { throw new Error( `Renderer entry does not exist: ${ manifest.renderer.entry }.` ); }
  return manifest;
}

export async function loadToolArtifacts( roots ) {
  const tools = new Map();
  const failures = [];
  for ( const root of roots ) {
    try {
      const manifest = await loadToolManifest( root );
      if ( tools.has( manifest.id ) ) throw new Error( `Duplicate tool id: ${ manifest.id }.` );
      tools.set( manifest.id, manifest );
    } catch ( error ) { failures.push( Object.freeze( { artifactRoot: path.resolve( root ), error: error.message } ) ); }
  }
  return { tools, failures: Object.freeze( failures ) };
}

export { MANIFEST_SCHEMA, PRELOAD_PROTOCOL };
