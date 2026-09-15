function scanCode( text ) {
  const isCode = new Uint8Array( text.length );
  let i = 0;
  while ( i < text.length ) {
    const c = text[ i ], next = text[ i + 1 ];
    if ( c === '/' && next === '/' ) {
      while ( i < text.length && text[ i ] !== '\n' ) i++;
      continue;
    }
    if ( c === '/' && next === '*' ) {
      let depth = 1;
      i += 2;
      while ( i < text.length && depth > 0 ) {
        if ( text[ i ] === '/' && text[ i + 1 ] === '*' ) { depth++; i += 2; continue; }
        if ( text[ i ] === '*' && text[ i + 1 ] === '/' ) { depth--; i += 2; continue; }
        i++;
      }
      continue;
    }
    if ( c === '"' || c === "'" ) {
      const quote = c;
      i++;
      while ( i < text.length ) {
        if ( text[ i ] === '\\' ) { i += 2; continue; }
        if ( text[ i ] === quote ) { i++; break; }
        i++;
      }
      continue;
    }
    if ( c === '$' ) {
      i += text[ i + 1 ] === '\\' ? 3 : 2;
      continue;
    }
    isCode[ i ] = 1;
    i++;
  }
  return isCode;
}

export function lineRangeAt( text, pos ) {
  let from = pos, to = pos;
  while ( from > 0 && text[ from - 1 ] !== '\n' ) from--;
  while ( to < text.length && text[ to ] !== '\n' ) to++;
  return { from, to };
}

export function regionRangeAt( text, pos ) {
  const isCode = scanCode( text );
  for ( let start = lastColumnZeroParenAt( text, isCode, pos ); start >= 0;
    start = lastColumnZeroParenAt( text, isCode, start - 1 ) ) {
    const end = matchForward( text, isCode, start );
    if ( end >= 0 && pos <= end ) return { from: start, to: end + 1 };
  }
  return null;
}

function lastColumnZeroParenAt( text, isCode, from ) {
  for ( let i = Math.min( from, text.length - 1 ); i >= 0; i-- ) {
    if ( text[ i ] === '(' && isCode[ i ] && ( i === 0 || text[ i - 1 ] === '\n' ) ) return i;
  }
  return -1;
}

function matchForward( text, isCode, start ) {
  let depth = 0;
  for ( let i = start; i < text.length; i++ ) {
    if ( !isCode[ i ] ) continue;
    if ( text[ i ] === '(' ) depth++;
    else if ( text[ i ] === ')' ) {
      depth--;
      if ( depth === 0 ) return i;
    }
  }
  return -1;
}

export function evalRangeAt( text, selFrom, selTo, mode ) {
  if ( selFrom !== selTo ) return { from: selFrom, to: selTo };
  if ( mode === 'region' ) {
    const region = regionRangeAt( text, selFrom );
    if ( region ) return region;
  }
  const line = lineRangeAt( text, selFrom );
  return text.slice( line.from, line.to ).trim() ? line : null;
}
