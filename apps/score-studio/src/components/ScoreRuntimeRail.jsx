export default function ScoreRuntimeRail( { instrumentPanel, auditionPanel, realizationsPanel } ) {
  return (
    <div className="runtimeRailContent">
      <header><h2>Runtime</h2><span>projection</span></header>
      <div className="railScroll">
        { instrumentPanel }
        { auditionPanel }
        { realizationsPanel }
      </div>
    </div>
  );
}
