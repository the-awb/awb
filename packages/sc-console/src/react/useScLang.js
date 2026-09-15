import { useCallback, useEffect, useRef, useState } from 'react';
import { createScLangBridge } from '@awb/sc-wasm/core';

const noSuspend = () => () => {};

export function useScLang( sc, {
  importSclang,
  locateFile,
  exposeDevGlobals = false,
  suspendWork = noSuspend,
  maxLogLines = 500
} = {} ) {
  const bridgeRef = useRef( null );
  const [ status, setStatus ] = useState( 'idle' );
  const [ log, setLog ] = useState( [] );
  const [ error, setError ] = useState( null );

  const append = useCallback( ( line ) => {
    setLog( ( previous ) => [ ...previous.slice( -( maxLogLines - 1 ) ), line ] );
  }, [ maxLogLines ] );

  const attach = useCallback( async () => {
    if ( bridgeRef.current?.isAttached || status === 'attaching' ) return;
    setStatus( 'attaching' );
    setError( null );
    try {
      const engine = await sc.boot();
      if ( !engine ) throw new Error( 'the engine is not running' );
      const bridge = createScLangBridge( {
        importSclang,
        locateFile,
        exposeDevGlobals,
        getScsynthModule: sc.getEngine,
        getBootOptions: sc.getBootOptions,
        subscribeOscReply: sc.subscribeOscReply,
        onPrint: append,
        onServerQuit: () => sc.shutdown(),
        onBootRequest: async () => {
          const fresh = await sc.boot();
          if ( fresh ) await sc.reloadSynthDefs();
          return fresh;
        }
      } );
      bridgeRef.current = bridge;
      const resume = suspendWork();
      let ok;
      try { ok = await bridge.attach(); } finally { resume?.(); }
      setStatus( ok ? 'attached' : 'failed' );
      if ( !ok ) setError( 'handshake did not complete — s.serverRunning is still false' );
    } catch ( caught ) {
      bridgeRef.current = null;
      setStatus( 'failed' );
      setError( caught.message || String( caught ) );
    }
  }, [ append, exposeDevGlobals, importSclang, locateFile, sc, status, suspendWork ] );

  const evaluate = useCallback( ( code ) => {
    const bridge = bridgeRef.current;
    if ( !bridge?.isAttached ) return false;
    bridge.runCode( code );
    return true;
  }, [] );

  useEffect( () => sc.subscribePrint?.( ( line ) => append( `scsynth: ${ line }` ) ), [ append, sc ] );

  const isAttached = status === 'attached';
  useEffect( () => {
    if ( !isAttached ) return undefined;
    const onKey = ( event ) => {
      if ( event.key === '.' && ( event.metaKey || event.ctrlKey || event.altKey ) ) {
        event.preventDefault();
        evaluate( 'CmdPeriod.run;' );
      }
    };
    document.addEventListener( 'keydown', onKey );
    return () => document.removeEventListener( 'keydown', onKey );
  }, [ evaluate, isAttached ] );

  useEffect( () => () => bridgeRef.current?.detach(), [] );

  return { status, isAttached, log, error, attach, evaluate };
}
