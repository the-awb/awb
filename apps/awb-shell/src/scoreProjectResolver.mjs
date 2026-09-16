import { parseScoreProject, resolveScoreProject } from '@awb/field-documents';

export function resolveToolBindingFromProject( text, projectPath, { toolID, bindingID = null } = {} ) {
  if ( typeof toolID !== 'string' || !toolID ) throw new Error( 'toolID is required.' );
  const resolved = resolveScoreProject( parseScoreProject( text ), projectPath );
  const matches = resolved.tools.filter( ( binding ) => binding.tool === toolID
    && ( bindingID === null || binding.bindingID === bindingID ) );
  if ( matches.length === 0 ) throw new Error( `Score project has no ${ toolID } binding${ bindingID ? ` named ${ bindingID }` : '' }.` );
  if ( matches.length > 1 ) throw new Error( `Score project has more than one ${ toolID } binding; choose bindingID explicitly.` );
  return Object.freeze( { project: resolved.project, scorePath: resolved.scorePath,
    binding: matches[ 0 ], configPath: matches[ 0 ].configPath } );
}
