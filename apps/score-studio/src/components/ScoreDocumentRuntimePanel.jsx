import { SC_PROJECTION_KINDS } from '../engine/localScProjection.js';
import { MODES } from '../state/scoreSession.js';

export default function ScoreDocumentRuntimePanel( {
  session, dirty, documentIngress, file, scoreFolder, projectionKind, localProjection,
  hostCapabilities, inputRef, endpoint, hosted, hostedCanPlay, hostedMessage, connected,
  standalone, standaloneReadiness, standaloneMessage, sc, sclang,
  onTitleChange, onNew, onOpen, onOpenDemo, onChooseFolder, onSave, onProjectionKind,
  onGenerateSc, onRetryProjection, onRefreshFolder, onOpenFolderScore, onFallbackFile,
  onEndpointChange, onHostedConnect, onHostedDisconnect, onHostedLoad, onHostedState,
  onOpenHostedDocument, onStandaloneAudio, onAttachSclang, onStandaloneLoad, onStandaloneQuit
} ) {
  return <>
    <section className="documentSummary filePanel">
      <h2>Score document</h2>
      <label>Title<input className="titleInput" value={ session.document.meta.title }
        onChange={ ( event ) => onTitleChange( event.target.value ) } /></label>
      <span className={ `saveState ${ dirty ? 'dirty' : '' }` }>{ dirty ? 'unsaved changes' : 'saved' }</span>
      <div className="fileButtons">
        { documentIngress.new && <button onClick={ onNew }>New</button> }
        { documentIngress.open && <button onClick={ onOpen }>Open…</button> }
        { documentIngress.demo && <button onClick={ onOpenDemo }>Demo score</button> }
        { documentIngress.browse && <button onClick={ onChooseFolder }>Open folder…</button> }
        <button onClick={ () => onSave( false ) }>Save</button>
        <button onClick={ () => onSave( true ) }>Save as…</button>
        <label className="projectionChoice">SC output
          <select aria-label="SC output type" value={ projectionKind }
            onChange={ ( event ) => onProjectionKind( event.target.value ) }>
            <option value={ SC_PROJECTION_KINDS.DESKTOP_SCORE }>Desktop score</option>
            <option value={ SC_PROJECTION_KINDS.BROWSER_PSEQ }>Browser Pseq reduction</option>
          </select>
        </label>
        <button onClick={ onGenerateSc }>Generate SC document</button>
        { file.pendingIdentity && <button disabled={ !connected } onClick={ onRetryProjection }>Retry SC export</button> }
      </div>
      { scoreFolder.handle && <div className="scoreFolder">
        <div className="scoreFolderHeader"><strong>{ scoreFolder.name }</strong>
          <button onClick={ onRefreshFolder }>Refresh</button></div>
        { scoreFolder.files.map( ( item ) => <button key={ item.name }
          className={ file.name === item.name ? 'active' : '' }
          onClick={ () => onOpenFolderScore( item ) }>{ item.name }</button> ) }
      </div> }
      { scoreFolder.message && <p className="fileMessage">{ scoreFolder.message }</p> }
      { hostCapabilities.fileInputFallback && <input ref={ inputRef } hidden type="file"
        accept=".json,.score.json,application/json" onChange={ onFallbackFile } /> }
      <dl className="identity">
        <dt>File</dt><dd>{ file.name ?? 'not saved' }</dd>
        <dt>Score ID</dt><dd>{ session.document.scoreID }</dd>
        <dt>Revision</dt><dd>{ session.document.revision }</dd>
        <dt>Entries</dt><dd>{ session.document.entries.length }</dd>
        <dt>SC pair</dt><dd>{ file.projectionStatus }</dd>
        <dt>App SC</dt><dd>{ localProjection
          ? `${ localProjection.kind === SC_PROJECTION_KINDS.BROWSER_PSEQ ? 'Pseq' : 'desktop' } r${ localProjection.revision }`
          : 'not generated' }</dd>
      </dl>
      { file.message && <p className="fileMessage">{ file.message }</p> }
      <p className="boundaryNote">JSON is canonical. Generated SC documents are projections retained in local app data; desktop score and browser Pseq outputs have different runtime contracts.</p>
    </section>
    <section className="runtimeContext">
      <h2>{ session.mode === MODES.HOSTED ? 'Hosted runtime' : 'Standalone runtime' }</h2>
      { session.mode === MODES.HOSTED ? <>
        <label>WebSocket endpoint<input value={ endpoint } placeholder="Waiting for the frozen host endpoint"
          onChange={ ( event ) => onEndpointChange( event.target.value ) } /></label>
        <div className="runtimeButtons hostedConnection">
          <button disabled={ !endpoint || hosted.status === 'connecting' || connected }
            onClick={ onHostedConnect }>Connect</button>
          <button disabled={ !connected } onClick={ onHostedDisconnect }>Disconnect</button>
          <button disabled={ !connected } onClick={ onHostedLoad }>Load revision</button>
          <button disabled={ !connected } onClick={ onHostedState }>State</button>
          <button disabled={ !connected } onClick={ onOpenHostedDocument }>Open SC document</button>
        </div>
        <dl className="identity compact"><dt>Status</dt><dd>{ hosted.status }</dd><dt>Protocol</dt><dd>{ hosted.protocolVersion ?? '—' }</dd><dt>SynthDefs</dt><dd>{ hosted.synthDefContext.inventory ? `${ hosted.synthDefContext.inventory.length } in desktop context` : hosted.synthDefContext.status }</dd><dt>Audio</dt><dd>{ hosted.readiness.engine }</dd><dt>Playback</dt><dd>{ hostedCanPlay ? 'ready' : hosted.readiness.reason }</dd><dt>Remote</dt><dd>{ hosted.scoreID ? `${ hosted.scoreID } r${ hosted.remoteRevision }` : 'not loaded' }</dd></dl>
        { ( hostedMessage || hosted.error ) && <p className={ hosted.error ? 'error' : 'fileMessage' }>{ hostedMessage || hosted.error }</p> }
        <p className="boundaryNote">Desktop sclang remains the scheduling, transport and loaded-definition authority.</p>
      </> : <>
        <div className="runtimeButtons">
          <button disabled={ sc.audioContextState === 'running' || sc.status === 'loading' || sc.status === 'booting' }
            onClick={ onStandaloneAudio }>{ sc.audioContextState === 'running' ? 'Audio running' : sc.isBooted ? 'Resume audio' : 'Start audio' }</button>
          <button disabled={ sclang.isAttached || sclang.status === 'attaching' }
            onClick={ onAttachSclang }>{ sclang.isAttached ? 'sclang attached' : 'Attach sclang' }</button>
          <button disabled={ sc.status === 'loading' || sc.status === 'booting' }
            onClick={ onStandaloneLoad }>Load revision</button>
          <button disabled={ !sc.isBooted } onClick={ onStandaloneQuit }>Quit</button>
        </div>
        <dl className="identity compact"><dt>Status</dt><dd>{ standalone.status }</dd><dt>Audio</dt><dd>{ standaloneReadiness.engine } / { standaloneReadiness.audio }</dd><dt>Playback</dt><dd>{ standaloneReadiness.canPlay ? 'ready' : standaloneReadiness.reason }</dd><dt>Loaded</dt><dd>{ standalone.scoreID ? `${ standalone.scoreID } r${ standalone.revision }` : 'not loaded' }</dd><dt>Nodes</dt><dd>{ standalone.liveCount }</dd></dl>
        { standaloneMessage && <p className={ standalone.status === 'failed' ? 'error' : 'fileMessage' }>{ standaloneMessage }</p> }
        <p className="boundaryNote">The browser owns only nodes created by this standalone run. Seeking remains event-boundary seeking in this slice.</p>
        { ( sc.error || sclang.error ) && <p className="error">{ sc.error || sclang.error }</p> }
      </> }
    </section>
  </>;
}
