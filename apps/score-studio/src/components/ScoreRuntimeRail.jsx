// The live projection of what the engine is actually doing: which definitions are loaded, which
// audition voices are alive, which score realizations are playing. It sits in the left rail's
// Runtime tab, so the rail supplies the heading and the scroller and this supplies the sections.
export default function ScoreRuntimeRail( { instrumentPanel, auditionPanel, realizationsPanel } ) {
  return (
    <div className="runtimeRailContent">
      { instrumentPanel }
      { auditionPanel }
      { realizationsPanel }
    </div>
  );
}
