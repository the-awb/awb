const CROSS_ORIGIN_HEADERS = Object.freeze( {
  'Cross-Origin-Embedder-Policy': Object.freeze( [ 'require-corp' ] ),
  'Cross-Origin-Opener-Policy': Object.freeze( [ 'same-origin' ] )
} );

export function responseHeadersForTool( tool, existing = {} ) {
  if ( !tool?.renderer?.crossOriginIsolated ) return existing;
  return { ...existing, ...CROSS_ORIGIN_HEADERS };
}

export function permitsMediaRequest( tool, permission, details = {} ) {
  if ( permission !== 'media' || !tool?.capabilities?.media?.includes( 'audio-input' ) ) return false;
  const mediaTypes = details.mediaTypes ?? [];
  return mediaTypes.length > 0 && mediaTypes.every( ( type ) => type === 'audio' );
}

export function permitsMediaCheck( tool, permission, details = {} ) {
  return permission === 'media'
    && tool?.capabilities?.media?.includes( 'audio-input' ) === true
    && details.mediaType === 'audio';
}

export { CROSS_ORIGIN_HEADERS };
