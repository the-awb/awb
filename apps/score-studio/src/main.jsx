import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.jsx';
import { HostedScoreClient } from './engine/HostedScoreClient.js';
import { createBrowserHost } from './host/browserHost.js';
import { createDesktopHost } from './host/desktopHost.js';
import './styles.css';

const host = globalThis.awbDesktopHost
  ? createDesktopHost()
  : createBrowserHost( { launch: {
    endpoint: import.meta.env.VITE_HOSTED_ENDPOINT ?? '',
    initialScoreURL: import.meta.env.VITE_HOSTED_SCORE_URL ?? '',
    initialScoreName: import.meta.env.VITE_HOSTED_SCORE_NAME ?? 'hosted.score.json',
    toolSessionID: import.meta.env.VITE_TOOL_SESSION_ID ?? ''
  } } );
const createHostedClient = ( options ) => new HostedScoreClient( options );

createRoot( document.getElementById( 'root' ) ).render(
  <StrictMode><App host={ host } createHostedClient={ createHostedClient } /></StrictMode>
);
