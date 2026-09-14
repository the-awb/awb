// Parsing /g_queryTree.reply into something the app can show.
//
// This is the runtime counterpart to tools/verify/param-surface.mjs: that one proves offline that a
// param names a real control, this reads back what the SERVER is actually holding - including for
// synths the app did not create. sclang making a synth in the console is the case that matters;
// notifications are server-wide, so the app hears its /n_go, but /n_go carries only a node id. The
// def name and the control values only exist in a tree query.
//
// The reply is a flat, self-describing array with flag 1 (include control values):
//
//   flag, rootNodeID, childCount, then per node:
//     nodeID, childCount            childCount is -1 for a SYNTH, otherwise a group
//     if synth:  defName, numControls, then numControls x (name, value)
//     if group:  that many child nodes follow, depth first
//
// A control name comes back as a string normally, but as an INTEGER when the def gave the control
// no name - and a value comes back as a string when the control is mapped to a bus ("c1"), not as
// a number. Both are kept as-is rather than coerced, because a mapped control reporting "c1" is
// information, and turning it into NaN would throw it away.
export function parseQueryTree( args ) {
  let i = 0;
  const withControls = Number( args[ i++ ] ) === 1;
  const rootId = Number( args[ i++ ] );
  const rootChildren = Number( args[ i++ ] );
  const nodes = [];

  const readNode = ( parentId ) => {
    const id = Number( args[ i++ ] );
    const childCount = Number( args[ i++ ] );
    if ( childCount === -1 ) {
      const defName = String( args[ i++ ] );
      const controls = {};
      if ( withControls ) {
        const n = Number( args[ i++ ] );
        for ( let c = 0; c < n; c++ ) {
          const name = String( args[ i++ ] );
          const raw = args[ i++ ];
          const value = typeof raw === 'string' ? raw : Number( raw );
          if ( Object.hasOwn( controls, name ) ) {
            // A MULTICHANNEL control. scsynth reports one (name, value) pair per CHANNEL, reusing
            // the same name, so \substrate's difF[6] arrives as six `difF` entries. Assigning would
            // keep only the last, and the panel would then show channel 5's value while an /n_set
            // wrote channel 0 - wrong in both directions, and silent. Collected into an array so
            // the difference is visible to whatever renders it; /n_set cannot address one of these
            // anyway, that needs /n_setn.
            const prev = controls[ name ];
            controls[ name ] = Array.isArray( prev ) ? [ ...prev, value ] : [ prev, value ];
          } else {
            controls[ name ] = value;
          }
        }
      }
      nodes.push( { id, parentId, isGroup: false, defName, controls } );
      return;
    }
    nodes.push( { id, parentId, isGroup: true, defName: null, controls: {} } );
    for ( let c = 0; c < childCount; c++ ) readNode( id );
  };

  for ( let c = 0; c < rootChildren; c++ ) readNode( rootId );
  return nodes;
}
