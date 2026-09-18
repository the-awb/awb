const NATIVE_PROFILE_ALIASES = new Set( [ 'attached', 'headless' ] );

export function canonicalNativeToolProfile( profileID ) {
  return NATIVE_PROFILE_ALIASES.has( profileID ) ? 'hosted' : profileID;
}

export function activeNativeHostMode( snapshot ) {
  if ( snapshot?.control?.mode === 'headless' ) return 'headless';
  if ( snapshot?.control?.mode === 'ide' || snapshot?.sclang?.status === 'attached' ) return 'attached';
  return null;
}
