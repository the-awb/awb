import { lazy, Suspense, useState } from 'react';

const ScConsolePanel = lazy( () => import( '@awb/sc-console/react' )
  .then( ( module ) => ( { default: module.ScConsolePanel } ) ) );

const STARTER = `// Browser sclang scratchpad. This is not the canonical score.
// Ctrl-enter evaluates a line; Cmd/Shift-enter evaluates a ( ) region.

(
{ SinOsc.ar(60, 0, 0.12) ! 2 }.play;
)
`;

export default function ConsoleWorkspace( { sc, sclang, workingDocument, mode } ) {
  const [ tab, setTab ] = useState( 'scratch' );
  return (
    <section className="consoleWorkspace">
      <div className="subtabs">
        <button className={ tab === 'scratch' ? 'active' : '' } onClick={ () => setTab( 'scratch' ) }>Scratch console</button>
        <button className={ tab === 'working' ? 'active' : '' } onClick={ () => setTab( 'working' ) }>Working document</button>
        <span className="spacer" />
        <span>{ mode === 'hosted' ? 'Hosted working documents arrive from desktop SC.' : 'Console uses browser sclang.' }</span>
      </div>
      { tab === 'scratch' ? (
        <Suspense fallback={ <div className="emptyState">Loading editor…</div> }>
          <ScConsolePanel
            sclang={ sclang }
            onAttach={ sclang.attach }
            sc={ sc }
            storageKey="awb.score-studio.console.scd"
            initialDocument={ STARTER }
            orientation="horizontal"
            exposeDevGlobals={ import.meta.env.DEV }
          />
        </Suspense>
      ) : (
        <div className="workingDocument">
          <div className="workingHeader">
            <strong>Generated .score.scd</strong>
            <span>Read-only projection; never the canonical document.</span>
          </div>
          <pre>{ workingDocument || 'No projection received yet. The desktop agent owns SC document generation.' }</pre>
        </div>
      ) }
    </section>
  );
}
