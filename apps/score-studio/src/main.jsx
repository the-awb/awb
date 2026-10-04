import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.jsx';
import { HostedScoreClient } from './engine/HostedScoreClient.js';
import { createBrowserHost } from './host/browserHost.js';
import { createDesktopHost } from './host/desktopHost.js';
import { createNeutralDesktopHost } from './host/neutralDesktopHost.js';
import './styles.css';

const host = globalThis.awbHost
  ? createNeutralDesktopHost()
  : globalThis.awbDesktopHost ? createDesktopHost()
  : createBrowserHost( { launch: {
    endpoint: import.meta.env.VITE_HOSTED_ENDPOINT ?? '',
    initialScoreURL: import.meta.env.VITE_HOSTED_SCORE_URL ?? '',
    initialScoreName: import.meta.env.VITE_HOSTED_SCORE_NAME ?? 'hosted.score.json',
    toolInstanceID: import.meta.env.VITE_TOOL_INSTANCE_ID ?? ''
  } } );
const createHostedClient = ( options ) => new HostedScoreClient( options );

let unsubscribeShellCommand = null;
if ( globalThis.awbHost ) {
  const context = globalThis.awbHost.initialLaunchContext();
  globalThis.awbHost.reportReady( { toolID: 'score-studio', viewID: context.viewID,
    toolInstanceID: context.toolInstanceID } );
}

const root = createRoot( document.getElementById( 'root' ) );
root.render(
  <StrictMode><App host={ host } createHostedClient={ createHostedClient } /></StrictMode>
);

if ( globalThis.awbHost ) unsubscribeShellCommand = globalThis.awbHost.onCommand( ( command ) => {
  if ( command?.type !== 'dispose' ) return;
  unsubscribeShellCommand?.(); root.unmount();
  globalThis.awbHost.reportDetailedState( { disposeAcknowledged: true } );
} );
