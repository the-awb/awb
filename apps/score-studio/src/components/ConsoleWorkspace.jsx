import { lazy, Suspense, useEffect, useState } from 'react';

const ScConsolePanel = lazy( () => import( '@awb/sc-console/react' )
  .then( ( module ) => ( { default: module.ScConsolePanel } ) ) );

const STARTER = `// Browser sclang scratchpad. This is not the canonical score.
// Ctrl-enter evaluates a line; Cmd/Shift-enter evaluates a ( ) region.

(
{ SinOsc.ar(60, 0, 0.12) ! 2 }.play;
)
`;

export default function ConsoleWorkspace( { sc, sclang, workingDocument, mode } ) {
  const [ tab, setTab ] = useState( () => workingDocument ? 'working' : 'scratch' );
  useEffect( () => {
    if ( mode === 'hosted' || workingDocument ) setTab( 'working' );
  }, [ mode, workingDocument ] );
  return (
    <section className="consoleWorkspace">
      <div className="subtabs">
        { mode === 'standalone' && <button className={ tab === 'scratch' ? 'active' : '' } onClick={ () => setTab( 'scratch' ) }>Scratch console</button> }
        <button className={ tab === 'working' ? 'active' : '' } onClick={ () => setTab( 'working' ) }>Working document</button>
        <span className="spacer" />
        <span>{ mode === 'hosted' ? 'Hosted working documents arrive from desktop SC.' : 'Console uses browser sclang.' }</span>
      </div>
      { mode === 'standalone' && tab === 'scratch' ? (
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
          <pre>{ workingDocument || 'No projection generated yet. Generate locally, or connect a desktop host for its validated projection.' }</pre>
        </div>
      ) }
    </section>
  );
}
