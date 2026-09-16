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
  useEffect( () => {
    client.setObservedNodeIDs( projection.instruments.map( ( instrument ) => instrument.nodeId ) );
  }, [ client, projection.instruments ] );
  const phaseSnapshot = useMemo( () => {
    if ( !runtime.phaseSnapshot ) return null;
    const instruments = new Map( projection.instruments.map( ( instrument ) => [ Number( instrument.nodeId ), instrument ] ) );
    const slotsFor = ( instrument ) => instrument.type === 'basic'
      ? speakers.map( ( speaker ) => speaker.id )
      : instrument.type === 'substrate' ? [ 'carrier', 'beat' ]
        : instrument.type === 'substrate2' ? [ 'base', 'pulse', 'beat' ] : [];
    const corrections = runtime.phaseSnapshot.components.flatMap( ( component ) => {
      const instrument = instruments.get( Number( component.nodeID ) );
      const slot = instrument && slotsFor( instrument )[ component.componentIndex ];
      return slot === undefined ? [] : [ Object.freeze( { key: `${ instrument.id }:${ slot }`,
        relativePhase: component.relativePhase, frequency: component.frequency } ) ];
    } );
    const referenceInstrument = instruments.get( Number( runtime.phaseSnapshot.referenceNodeID ) );
    const referenceSlot = referenceInstrument
      && slotsFor( referenceInstrument )[ runtime.phaseSnapshot.referenceComponentIndex ];
    if ( !referenceInstrument || referenceSlot === undefined || corrections.length !== runtime.phaseSnapshot.components.length ) return null;
    return Object.freeze( { id: runtime.phaseSnapshot.id,
      observationBrowserTime: runtime.phaseSnapshot.observationBrowserTime,
      referenceKey: `${ referenceInstrument.id }:${ referenceSlot }`,
      referenceFrequency: runtime.phaseSnapshot.referenceFrequency,
      corrections: Object.freeze( corrections ) } );
  }, [ projection.instruments, runtime.phaseSnapshot, speakers ] );
  const voices = useMemo( () => enabled ? Object.freeze( { external: projection.instruments,
    voicesRef: Object.freeze( { current: new Map() } ), isSounding: () => false,
    phaseSnapshot } ) : EMPTY_VOICES,
  [ enabled, phaseSnapshot, projection.instruments ] );
  return Object.freeze( { runtime, projection, voices } );
}
