const host = globalThis.awbHost;
const toolsElement = document.querySelector( '#tools' );
const viewsElement = document.querySelector( '#views' );
const failuresElement = document.querySelector( '#failures' );
const hostElement = document.querySelector( '#host' );

const escapeHTML = ( value ) => `${ value }`.replace( /[&<>"']/g, ( character ) => ( {
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;'
} )[ character ] );

async function render() {
  const snapshot = await host.request( 'shell.snapshot' );
  const facts = [ [ 'sclang', snapshot.host.sclang ], [ 'scsynth', snapshot.host.scsynth ],
    [ 'SynthDef context', snapshot.host.synthDefs ], [ 'NodeManager', snapshot.host.nodeManager ] ];
  hostElement.innerHTML = facts.map( ( [ label, fact ] ) => `<div class="host-fact"><span>${ escapeHTML( label ) }</span><strong>${ escapeHTML( fact?.status ?? 'unavailable' ) }</strong></div>` ).join( '' );
  toolsElement.innerHTML = snapshot.tools.map( ( tool ) => `<article class="card"><h3>${ escapeHTML( tool.name ) }</h3><p class="meta">${ escapeHTML( tool.id ) } · ${ escapeHTML( tool.version ) }</p>${ tool.launchProfiles.map( ( profile ) => `<button data-tool="${ escapeHTML( tool.id ) }" data-profile="${ escapeHTML( profile.id ) }">${ escapeHTML( profile.label ) }</button>` ).join( '' ) }${ tool.documentKinds.map( ( kind ) => `<div class="documents"><p class="meta">${ escapeHTML( kind.label ) }</p>${ kind.actions.includes( 'new' ) ? `<button class="secondary" data-document-tool="${ tool.id }" data-document-kind="${ kind.id }" data-document-action="new">New</button>` : '' }${ kind.actions.includes( 'browse' ) ? `<button class="secondary" data-document-tool="${ tool.id }" data-document-kind="${ kind.id }" data-document-action="browse">Browse</button>` : '' }${ kind.actions.includes( 'recent' ) ? kind.recentItems.map( ( item ) => `<button class="secondary recent" data-document-tool="${ tool.id }" data-document-kind="${ kind.id }" data-document-action="recent" data-recent-id="${ item.recentID }">${ escapeHTML( item.name ) }</button>` ).join( '' ) : '' }</div>` ).join( '' ) }</article>` ).join( '' ) || '<p class="empty">No valid tools installed.</p>';
  viewsElement.innerHTML = snapshot.views.map( ( view ) => `<article class="card"><h3>${ escapeHTML( view.toolName ) }</h3><p class="meta">${ escapeHTML( view.lifecycle ) } · ${ escapeHTML( view.toolSessionID ?? 'standalone' ) }</p>${ view.liveRuntime.containers.length ? `<p class="live">${ view.liveRuntime.containers.length } live container · ${ view.liveRuntime.entries.length } entries</p>` : '' }<button class="secondary" data-focus="${ view.viewID }">Focus</button><button class="secondary" data-close="${ view.viewID }">Close</button></article>` ).join( '' ) || '<p class="empty">No active tool views.</p>';
  document.querySelector( '#failures-section' ).hidden = snapshot.failures.length === 0;
  failuresElement.innerHTML = snapshot.failures.map( ( failure ) => `<p>${ escapeHTML( failure.error ) }</p>` ).join( '' );
}

document.addEventListener( 'click', async ( event ) => {
  const target = event.target.closest( 'button' );
  if ( !target ) return;
  if ( target.dataset.tool ) await host.request( 'shell.launch', { toolID: target.dataset.tool, profileID: target.dataset.profile, launchOrigin: 'desktop' } );
  if ( target.dataset.documentAction ) await host.request( 'shell.launch-document', {
    toolID: target.dataset.documentTool, documentKindID: target.dataset.documentKind,
    action: target.dataset.documentAction, recentID: target.dataset.recentId ?? null
  } );
  if ( target.dataset.focus ) await host.request( 'shell.focus', { viewID: target.dataset.focus } );
  if ( target.dataset.close ) await host.request( 'shell.close', { viewID: target.dataset.close } );
  await render();
} );
host.onCommand( ( command ) => { if ( command?.type === 'shell-registry-changed' ) render(); } );
host.reportReady( { surface: 'toolkit-home' } );
render();
