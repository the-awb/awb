import { StreamLanguage, HighlightStyle } from '@codemirror/language';
import { tags as t } from '@lezer/highlight';

const TOKEN_TAGS = {
  comment: t.comment, string: t.string, symbol: t.atom, character: t.string,
  number: t.number, keyword: t.keyword, builtin: t.standard( t.variableName ),
  class: t.className, name: t.variableName, argument: t.propertyName,
  envvar: t.macroName, primitive: t.macroName, operator: t.operator,
  punctuation: t.punctuation
};

const scd = StreamLanguage.define( {
  name: 'scd',
  tokenTable: TOKEN_TAGS,
  startState: () => ( { commentDepth: 0 } ),
  token( stream, state ) {
    if ( state.commentDepth > 0 ) {
      while ( !stream.eol() ) {
        if ( stream.match( '/*' ) ) { state.commentDepth++; continue; }
        if ( stream.match( '*/' ) ) { state.commentDepth--; if ( state.commentDepth === 0 ) break; continue; }
        stream.next();
      }
      return 'comment';
    }
    if ( stream.eatSpace() ) return null;
    if ( stream.match( '//' ) ) { stream.skipToEnd(); return 'comment'; }
    if ( stream.match( '/*' ) ) { state.commentDepth = 1; return 'comment'; }
    if ( stream.match( /^\$\\?./ ) ) return 'character';
    if ( stream.match( /^"(?:[^\\"]|\\.)*"?/ ) ) return 'string';
    if ( stream.match( /^'(?:[^\\']|\\.)*'?/ ) ) return 'symbol';
    if ( stream.match( /^\\\w*/ ) ) return 'symbol';
    if ( stream.match( /^\b\d+r[0-9a-zA-Z]*(\.[0-9A-Z]*)?/ ) ) return 'number';
    if ( stream.match( /^\b0[xX][0-9a-fA-F]+/ ) ) return 'number';
    if ( stream.match( /^\b\d+(s+|b+|[sb]\d+)\b/ ) ) return 'number';
    if ( stream.match( /^((\d+(\.\d+)?([eE][-+]?\d+)?(pi)?)|pi)\b/ ) ) return 'number';
    if ( stream.match( /^(?:arg|classvar|const|super|this|var)\b/ ) ) return 'keyword';
    if ( stream.match( /^(?:false|inf|nil|true|thisFunction|thisFunctionDef|thisMethod|thisProcess|thisThread|currentEnvironment|topEnvironment)\b/ ) ) return 'builtin';
    if ( stream.match( /^~\w+/ ) ) return 'envvar';
    if ( stream.match( /^_\w+/ ) ) return 'primitive';
    if ( stream.match( /^[A-Za-z_]\w*:/ ) ) return 'argument';
    if ( stream.match( /^[A-Z]\w*/ ) ) return 'class';
    if ( stream.match( /^[a-z]\w*/ ) ) return 'name';
    if ( stream.match( /^[-.,;#()[\]{}]/ ) ) return 'punctuation';
    if ( stream.match( /^[+\-*/&|^%<>=!?]+/ ) ) return 'operator';
    stream.next();
    return null;
  },
  languageData: {
    commentTokens: { line: '//', block: { open: '/*', close: '*/' } },
    closeBrackets: { brackets: [ '(', '[', '{', '"' ] }
  }
} );

const scdHighlight = HighlightStyle.define( [
  { tag: t.comment, color: '#5f6672', fontStyle: 'italic' },
  { tag: t.string, color: '#9ad18f' },
  { tag: t.number, color: '#e0954a' },
  { tag: t.keyword, color: '#bf5af2' },
  { tag: t.standard( t.variableName ), color: '#bf5af2' },
  { tag: t.className, color: '#7fb8ff' },
  { tag: t.atom, color: '#e9d5ff' },
  { tag: t.variableName, color: '#c9cdd4' },
  { tag: t.propertyName, color: '#d9a441' },
  { tag: t.operator, color: '#8b93a1' },
  { tag: t.punctuation, color: '#8b93a1' },
  { tag: t.macroName, color: '#e0954a' }
] );

export { scd, scdHighlight };
