const host = globalThis.awbHost;
const toolsElement = document.querySelector( '#tools' );
const viewsElement = document.querySelector( '#views' );
const failuresElement = document.querySelector( '#failures' );
const hostElement = document.querySelector( '#host' );
const hostActionsElement = document.querySelector( '#host-actions' );
const hostMessageElement = document.querySelector( '#host-message' );

const escapeHTML = ( value ) => `${ value }`.replace( /[&<>"']/g, ( character ) => ( {
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;'
} )[ character ] );

async function render() {
  const snapshot = await host.request( 'shell.snapshot' );
  const facts = [ [ 'sclang', snapshot.host.sclang ], [ 'scsynth', snapshot.host.scsynth ],
    [ 'SynthDef context', snapshot.host.synthDefs ], [ 'NodeManager', snapshot.host.nodeManager ] ];
  hostElement.innerHTML = facts.map( ( [ label, fact ] ) => `<div class="host-fact"><span>${ escapeHTML( label ) }</span><strong>${ escapeHTML( fact?.status ?? 'unavailable' ) }</strong>${ label === 'sclang' && fact?.mode ? `<small>${ escapeHTML( fact.mode ) }</small>` : '' }</div>` ).join( '' );
  const control = snapshot.host.control ?? {}; const managed = snapshot.nativeScHost ?? {};
  const nodePolicy = control.nodeManagerPolicy ?? 'unknown';
  hostActionsElement.innerHTML = `<button class="secondary" data-host-action="open-ide">Open SuperCollider</button>${ control.mode === 'headless' || managed.owned
    ? '<button class="secondary" data-host-action="stop-headless">Stop headless host</button>'
    : `<button class="secondary" data-host-action="start-headless" ${ control.status === 'ready' ? 'disabled' : '' }>Start headless host</button>` }${ control.status === 'ready'
    ? `<button data-host-action="audio-probe" ${ snapshot.host.scsynth?.status === 'ready' ? '' : 'disabled' }>Test tone</button><button class="secondary" data-host-action="nm-whenNeeded" ${ nodePolicy === 'whenNeeded' ? 'disabled' : '' }>NodeManager when needed</button><button class="secondary" data-host-action="nm-always" ${ nodePolicy === 'always' ? 'disabled' : '' }>Always on</button><button class="secondary" data-host-action="nm-manual" ${ nodePolicy === 'manual' ? 'disabled' : '' }>Off / manual</button>` : '' }`;
  toolsElement.innerHTML = snapshot.tools.map( ( tool ) => `<article class="card"><h3>${ escapeHTML( tool.name ) }</h3><p class="meta">${ escapeHTML( tool.id ) } · ${ escapeHTML( tool.version ) }</p>${ tool.launchProfiles.map( ( profile ) => `<button data-tool="${ escapeHTML( tool.id ) }" data-profile="${ escapeHTML( profile.id ) }">${ escapeHTML( profile.label ) }</button>` ).join( '' ) }${ tool.documentKinds.map( ( kind ) => `<div class="documents"><p class="meta">${ escapeHTML( kind.label ) }</p>${ kind.actions.includes( 'new' ) ? `<button class="secondary" data-document-tool="${ tool.id }" data-document-kind="${ kind.id }" data-document-action="new">New</button>` : '' }${ kind.actions.includes( 'browse' ) ? `<button class="secondary" data-document-tool="${ tool.id }" data-document-kind="${ kind.id }" data-document-action="browse">Browse</button>` : '' }${ kind.actions.includes( 'recent' ) ? kind.recentItems.map( ( item ) => `<button class="secondary recent" data-document-tool="${ tool.id }" data-document-kind="${ kind.id }" data-document-action="recent" data-recent-id="${ item.recentID }">${ escapeHTML( item.name ) }</button>` ).join( '' ) : '' }</div>` ).join( '' ) }</article>` ).join( '' ) || '<p class="empty">No valid tools installed.</p>';
  viewsElement.innerHTML = snapshot.views.map( ( view ) => `<article class="card"><h3>${ escapeHTML( view.toolName ) }</h3><p class="meta">${ escapeHTML( view.lifecycle ) } · ${ escapeHTML( view.toolSessionID ?? 'standalone' ) }</p>${ view.liveRuntime.containers.length ? `<p class="live">${ view.liveRuntime.containers.length } live container · ${ view.liveRuntime.entries.length } entries</p>` : '' }<button class="secondary" data-focus="${ view.viewID }">Focus</button>${ view.canOpenScoreField ? `<button class="secondary" data-open-score-field="${ view.viewID }">Open Field for this score</button>` : '' }<button class="secondary" data-close="${ view.viewID }">Close</button></article>` ).join( '' ) || '<p class="empty">No active tool views.</p>';
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
  if ( target.dataset.openScoreField ) await host.request( 'shell.open-field-for-score', { viewID: target.dataset.openScoreField } );
  if ( target.dataset.close ) await host.request( 'shell.close', { viewID: target.dataset.close } );
  if ( target.dataset.hostAction ) {
    hostMessageElement.textContent = '';
    try {
      const action = target.dataset.hostAction;
      if ( action === 'open-ide' ) await host.request( 'shell.open-supercollider' );
      else if ( action === 'start-headless' ) await host.request( 'shell.start-headless-sc' );
      else if ( action === 'stop-headless' ) await host.request( 'shell.stop-headless-sc' );
      else if ( action === 'audio-probe' ) {
        const result = await host.request( 'shell.audio-probe' );
        hostMessageElement.textContent = `Played ${ result.frequency } Hz on ${ result.server }`;
      }
      else if ( action.startsWith( 'nm-' ) ) await host.request( 'shell.nodemanager', { action: action.slice( 3 ) } );
    } catch ( error ) { hostMessageElement.textContent = error.message; }
  }
  await render();
} );
host.onCommand( ( command ) => { if ( command?.type === 'shell-registry-changed' ) render(); } );
host.reportReady( { surface: 'toolkit-home' } );
render();
