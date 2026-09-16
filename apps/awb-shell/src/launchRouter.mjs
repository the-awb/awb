import crypto from 'node:crypto';

function boundedObject( value, label, maximum = 32 * 1024 ) {
  const candidate = value ?? {};
  if ( !candidate || typeof candidate !== 'object' || Array.isArray( candidate ) ) throw new Error( `${ label } must be an object.` );
  if ( Buffer.byteLength( JSON.stringify( candidate ) ) > maximum ) throw new Error( `${ label } is too large.` );
  return candidate;
}

export function normalizeLaunchRequest( request ) {
  if ( !request || typeof request !== 'object' ) throw new Error( 'Launch request must be an object.' );
  if ( typeof request.toolID !== 'string' || !request.toolID ) throw new Error( 'Launch request needs toolID.' );
  if ( request.toolSessionID !== null && request.toolSessionID !== undefined
    && ( typeof request.toolSessionID !== 'string' || !request.toolSessionID || request.toolSessionID.length > 256 ) ) {
    throw new Error( 'toolSessionID must be null or a bounded string.' );
  }
  const origin = request.launchOrigin ?? 'desktop';
  if ( ![ 'desktop', 'supercollider', 'web' ].includes( origin ) ) throw new Error( `Unknown launch origin: ${ origin }.` );
  return Object.freeze( {
    requestID: typeof request.requestID === 'string' && request.requestID ? request.requestID : crypto.randomUUID(),
    toolID: request.toolID,
    toolSessionID: request.toolSessionID ?? null,
    launchOrigin: origin,
    profileID: request.profileID ?? null,
    owner: boundedObject( request.owner ?? { kind: 'none', pid: null }, 'owner', 1024 ),
    connections: boundedObject( request.connections, 'connections' ),
    payload: boundedObject( request.payload, 'payload' )
  } );
}

export class LaunchRouter {
  constructor( { tools, registry, createView, focusView } ) {
    this.tools = tools;
    this.registry = registry;
    this.createView = createView;
    this.focusView = focusView;
  }

  async launch( rawRequest ) {
    let request;
    try { request = normalizeLaunchRequest( rawRequest ); }
    catch ( error ) { return { requestID: rawRequest?.requestID ?? null, status: 'failed', error: error.message }; }
    const tool = this.tools.get( request.toolID );
    if ( !tool ) return { requestID: request.requestID, status: 'failed', error: `Unknown tool: ${ request.toolID }.` };
    if ( request.profileID && !tool.launchProfiles.some( ( profile ) => profile.id === request.profileID ) ) {
      return { requestID: request.requestID, status: 'failed', error: `Unknown profile ${ request.profileID } for ${ request.toolID }.` };
    }
    const existing = this.registry.findSession( request.toolID, request.toolSessionID );
    if ( existing ) {
      await this.focusView( existing.viewID );
      return { requestID: request.requestID, status: 'focused-existing', viewID: existing.viewID };
    }
    if ( !tool.view.allowMultiple && this.registry.list().some( ( view ) => view.toolID === request.toolID ) ) {
      return { requestID: request.requestID, status: 'failed', error: `${ tool.name } allows one view.` };
    }
    try {
      const viewID = crypto.randomUUID();
      this.registry.add( { viewID, toolID: tool.id, toolSessionID: request.toolSessionID, requestID: request.requestID,
        launchOrigin: request.launchOrigin, owner: request.owner, requestPayload: request.payload,
        lifecycle: 'requested' } );
      await this.createView( { viewID, request, tool } );
      return { requestID: request.requestID, status: 'accepted', viewID };
    } catch ( error ) {
      const failed = this.registry.list().find( ( view ) => view.requestID === request.requestID );
      if ( failed ) this.registry.update( failed.viewID, { lifecycle: 'failed', lastError: error.message } );
      return { requestID: request.requestID, status: 'failed', error: error.message };
    }
  }
}
