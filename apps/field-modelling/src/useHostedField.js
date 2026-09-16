import { useEffect, useMemo, useSyncExternalStore } from 'react';
import { HostedFieldClient } from './engine/HostedFieldClient.js';
import { projectScoreRealizations } from './engine/scoreProjection.js';

const EMPTY_VOICES = Object.freeze( { external: Object.freeze( [] ),
  voicesRef: Object.freeze( { current: new Map() } ), isSounding: () => false } );

export function useHostedField( { context, document, speakers, enabled } ) {
  const client = useMemo( () => new HostedFieldClient(), [] );
  const runtime = useSyncExternalStore( client.subscribe, client.getState, client.getState );
  useEffect( () => {
    if ( !enabled || !document || !context.connections?.endpoint ) return undefined;
    client.connect( context.connections.endpoint, { scoreID: document.scoreID,
      revision: document.revision, runID: context.payload.runID } );
    return () => client.disconnect();
  }, [ client, context.connections?.endpoint, context.payload?.runID, document, enabled ] );
  const projection = useMemo( () => projectScoreRealizations( document, runtime, speakers ),
    [ document, runtime.realizations, speakers ] );
  const voices = useMemo( () => enabled ? Object.freeze( { external: projection.instruments,
    voicesRef: Object.freeze( { current: new Map() } ), isSounding: () => false } ) : EMPTY_VOICES,
  [ enabled, projection.instruments ] );
  return Object.freeze( { runtime, projection, voices } );
}
