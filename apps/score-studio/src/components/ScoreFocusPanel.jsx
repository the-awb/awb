export default function ScoreFocusPanel( { focus, children } ) {
  const event = focus?.kind === 'scoreEvent';
  const synthDef = focus?.kind === 'synthDef';
  return (
    <div className="focusPanelContent">
      <header>
        <div><h2>{ event ? 'Event' : synthDef ? 'SynthDef' : 'Focus' }</h2>
          <strong>{ event ? focus.entry.id : synthDef ? `\\${ focus.name }` : 'No selection' }</strong></div>
        { event && <small>{ focus.entry.event?.type ?? 'event' } at { focus.entry.time } s</small> }
        { synthDef && <small>{ focus.source } · { focus.signalKind } · { focus.description?.fingerprint ?? 'interface unavailable' }</small> }
      </header>
      <div className="focusPanelScroll">
        { event || synthDef ? children
          : <p className="emptyCopy">Select an authored event or an instrument definition.</p> }
      </div>
    </div>
  );
}
