export default function ScoreFocusPanel( { selectedEntry, children } ) {
  return (
    <div className="focusPanelContent">
      <header>
        <div><h2>Event</h2><strong>{ selectedEntry?.id ?? 'No selection' }</strong></div>
        { selectedEntry && <small>{ selectedEntry.event?.type ?? 'event' } at { selectedEntry.time } s</small> }
      </header>
      <div className="focusPanelScroll">
        { selectedEntry ? children : <p className="emptyCopy">Select an authored event to edit its payload.</p> }
      </div>
    </div>
  );
}
