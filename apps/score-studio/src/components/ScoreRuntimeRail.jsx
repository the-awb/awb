export default function ScoreRuntimeRail( { instrumentPanel, realizationsPanel } ) {
  return (
    <div className="runtimeRailContent">
      <header><h2>Runtime</h2><span>projection</span></header>
      <div className="railScroll">
        { instrumentPanel }
        { realizationsPanel }
      </div>
    </div>
  );
}
