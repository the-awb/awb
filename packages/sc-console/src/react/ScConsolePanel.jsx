import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { EditorView, keymap, lineNumbers, highlightActiveLine, drawSelection, Decoration } from '@codemirror/view';
import { EditorState, StateEffect, StateField } from '@codemirror/state';
import { defaultKeymap, history, historyKeymap, indentWithTab } from '@codemirror/commands';
import { syntaxHighlighting, bracketMatching, indentUnit } from '@codemirror/language';
import { closeBrackets, closeBracketsKeymap } from '@codemirror/autocomplete';
import { scd, scdHighlight } from './scdMode.js';
import { evalRangeAt } from '../core/scdText.js';

const setFlash = StateEffect.define();
const clearFlash = StateEffect.define();
const flashMark = Decoration.mark( { class: 'cm-evalFlash' } );
const flashField = StateField.define( {
  create: () => Decoration.none,
  update( value, transaction ) {
    for ( const effect of transaction.effects ) {
      if ( effect.is( setFlash ) ) return Decoration.set( [ flashMark.range( effect.value.from, effect.value.to ) ] );
      if ( effect.is( clearFlash ) ) return Decoration.none;
    }
    return value.map( transaction.changes );
  },
  provide: ( field ) => EditorView.decorations.from( field )
} );

const theme = EditorView.theme( {
  '&': { fontSize: '12px', height: '100%', color: '#c9cdd4', background: '#111' },
  '.cm-scroller': { fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace', lineHeight: 1.55 },
  '.cm-content': { caretColor: '#e9d5ff' },
  '&.cm-focused .cm-cursor': { borderLeftColor: '#e9d5ff' },
  '.cm-gutters': { background: '#111', border: 'none', color: '#4c525c' },
  '.cm-activeLine': { background: 'rgba(255,255,255,0.03)' },
  '.cm-activeLineGutter': { background: 'transparent', color: '#8b93a1' },
  '&.cm-focused .cm-selectionBackground, .cm-selectionBackground, ::selection': { background: 'rgba(191,90,242,0.25)' },
  '.cm-evalFlash': { background: 'rgba(233,213,255,0.22)' }
}, { dark: true } );

export default function ScConsolePanel( {
  sclang,
  onAttach = sclang.attach,
  sc,
  storageKey = 'awb.console.scd',
  initialDocument = '',
  orientation = 'vertical',
  exposeDevGlobals = false
} ) {
  const hostRef = useRef( null );
  const viewRef = useRef( null );
  const evaluateRef = useRef( sclang.evaluate );
  const logRef = useRef( null );
  const [ lastSent, setLastSent ] = useState( null );

  useEffect( () => { evaluateRef.current = sclang.evaluate; }, [ sclang.evaluate ] );

  const send = useCallback( ( view, mode ) => {
    const selection = view.state.selection.main;
    const range = evalRangeAt( view.state.doc.toString(), selection.from, selection.to, mode );
    if ( !range ) return true;
    const code = view.state.doc.sliceString( range.from, range.to );
    view.dispatch( { effects: setFlash.of( range ) } );
    setTimeout( () => viewRef.current?.dispatch( { effects: clearFlash.of( null ) } ), 280 );
    const ok = evaluateRef.current( code );
    setLastSent( ok ? null : 'sclang is not attached.' );
    return true;
  }, [] );

  useLayoutEffect( () => {
    let saved = null;
    try { saved = localStorage.getItem( storageKey ); } catch { /* storage is optional */ }
    const view = new EditorView( {
      parent: hostRef.current,
      state: EditorState.create( {
        doc: saved ?? initialDocument,
        extensions: [
          lineNumbers(), history(), drawSelection(), highlightActiveLine(), bracketMatching(),
          closeBrackets(), indentUnit.of( '    ' ), scd, syntaxHighlighting( scdHighlight ),
          flashField, theme,
          keymap.of( [
            { key: 'Ctrl-Enter', run: ( editor ) => send( editor, 'line' ), preventDefault: true },
            { key: 'Mod-Enter', run: ( editor ) => send( editor, 'region' ), preventDefault: true },
            { key: 'Shift-Enter', run: ( editor ) => send( editor, 'region' ), preventDefault: true }
          ] ),
          keymap.of( [ ...closeBracketsKeymap, ...defaultKeymap, ...historyKeymap, indentWithTab ] ),
          EditorView.updateListener.of( ( update ) => {
            if ( !update.docChanged ) return;
            try { localStorage.setItem( storageKey, update.state.doc.toString() ); } catch { /* optional */ }
          } )
        ]
      } )
    } );
    viewRef.current = view;
    if ( exposeDevGlobals ) window.__consoleView = view;
    return () => {
      if ( exposeDevGlobals && window.__consoleView === view ) delete window.__consoleView;
      view.destroy();
      viewRef.current = null;
    };
  }, [ exposeDevGlobals, initialDocument, send, storageKey ] );

  useEffect( () => {
    const element = logRef.current;
    if ( element ) element.scrollTop = element.scrollHeight;
  }, [ sclang.log ] );

  const section = {
    minHeight: 0, display: 'flex', flexDirection: 'column', gap: 6,
    border: '1px solid #2a2a2a', borderRadius: 4, padding: 8, background: '#111'
  };
  return (
    <div style={ { height: '100%', minHeight: 0, display: 'flex', flexDirection: 'column', gap: 8 } }>
      <div style={ { color: '#888', fontSize: 10, lineHeight: 1.45 } }>
        { sc?.isBooted ? 'Engine running. ' : '' }
        { sclang.isAttached
          ? 'Ctrl-enter evaluates a line; Cmd/Shift-enter evaluates a block; Cmd-period stops everything.'
          : sclang.status === 'attaching'
            ? 'Starting sclang — compiling its class library may take a while.'
            : 'The editor is live, but evaluation waits until sclang is attached.' }
        { !sclang.isAttached && sclang.status !== 'attaching' && (
          <button onClick={ onAttach } style={ { marginLeft: 8 } }>Attach sclang</button>
        ) }
      </div>
      <div style={ {
        flex: 1, minHeight: 0, display: 'grid', gap: 8,
        gridTemplateColumns: orientation === 'horizontal' ? 'minmax(0, 3fr) minmax(0, 2fr)' : 'minmax(0, 1fr)',
        gridTemplateRows: orientation === 'horizontal' ? 'minmax(0, 1fr)' : 'minmax(150px, 3fr) minmax(90px, 2fr)'
      } }>
        <section style={ section }>
          <strong style={ { fontSize: 11 } }>Code</strong>
          <div ref={ hostRef } style={ { flex: 1, minHeight: 0, overflow: 'hidden', borderRadius: 3 } } />
          { lastSent && <span style={ { color: '#e0954a', fontSize: 10 } }>⚠ { lastSent }</span> }
        </section>
        <section style={ section }>
          <strong style={ { fontSize: 11 } }>Post window</strong>
          <pre ref={ logRef } style={ { flex: 1, minHeight: 0, overflow: 'auto', margin: 0, fontSize: 10, lineHeight: 1.45, whiteSpace: 'pre-wrap', color: '#c9cdd4' } }>
            { sclang.log.length ? sclang.log.join( '\n' ) : 'Nothing posted yet.' }
          </pre>
          { sclang.error && <span style={ { color: '#e0954a', fontSize: 10 } }>⚠ { sclang.error }</span> }
        </section>
      </div>
    </div>
  );
}
