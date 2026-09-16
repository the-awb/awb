export const FIELD_CONFIG_SCHEMA = 'awb.field-config/1';
export const SCORE_PROJECT_SCHEMA = 'awb.score-project/1';

const jsonClone = ( value, label ) => {
  let text;
  try { text = JSON.stringify( value ); } catch { throw new TypeError( `${ label } must be JSON-serializable.` ); }
  if ( text === undefined ) throw new TypeError( `${ label } must be JSON-serializable.` );
  return JSON.parse( text );
};

const object = ( value, label ) => {
  if ( !value || typeof value !== 'object' || Array.isArray( value ) ) throw new TypeError( `${ label } must be an object.` );
  return value;
};

const string = ( value, label ) => {
  if ( typeof value !== 'string' || !value.trim() ) throw new TypeError( `${ label } must be a non-empty string.` );
  return value;
};

const relative = ( value, label ) => {
  const candidate = string( value, label );
  if ( candidate.startsWith( '/' ) || /^[A-Za-z]:[\\/]/.test( candidate ) ) throw new Error( `${ label } must be relative.` );
  const segments = candidate.replaceAll( '\\', '/' ).split( '/' );
  let depth = 0;
  for ( const segment of segments ) {
    if ( !segment || segment === '.' ) continue;
    if ( segment === '..' ) depth -= 1; else depth += 1;
    if ( depth < 0 ) throw new Error( `${ label } escapes the project directory.` );
  }
  return candidate;
};

export function validateFieldConfig( input ) {
  const value = jsonClone( object( input, 'Field config' ), 'Field config' );
  if ( value.schema !== FIELD_CONFIG_SCHEMA ) throw new Error( `Unsupported field config schema: ${ value.schema ?? 'none' }.` );
  object( value.field, 'field' );
  object( value.field.room, 'field.room' );
  if ( !Array.isArray( value.field.instruments ) ) throw new TypeError( 'field.instruments must be an array.' );
  if ( !Array.isArray( value.field.microphones ) ) throw new TypeError( 'field.microphones must be an array.' );
  object( value.field.surfaces, 'field.surfaces' );
  object( value.field.display, 'field.display' );
  if ( value.phaseLock !== undefined ) object( value.phaseLock, 'phaseLock' );
  if ( value.camera !== undefined ) object( value.camera, 'camera' );
  return Object.freeze( value );
}

export function createFieldConfig( field, { configID = crypto.randomUUID(), title = 'Untitled field',
  camera = {}, phaseLock = { resynchroniseSeconds: 30 } } = {} ) {
  return validateFieldConfig( { schema: FIELD_CONFIG_SCHEMA, configID: string( configID, 'configID' ),
    title: string( title, 'title' ), field: jsonClone( field, 'field' ), camera, phaseLock } );
}

export function serializeFieldConfig( value ) {
  return `${ JSON.stringify( validateFieldConfig( value ), null, 2 ) }\n`;
}

export function parseFieldConfig( text ) {
  if ( typeof text !== 'string' || Buffer.byteLength( text ) > 16 * 1024 * 1024 ) throw new Error( 'Field config text is invalid or too large.' );
  return validateFieldConfig( JSON.parse( text ) );
}

export function validateScoreProject( input ) {
  const value = jsonClone( object( input, 'Score project' ), 'Score project' );
  if ( value.schema !== SCORE_PROJECT_SCHEMA ) throw new Error( `Unsupported score project schema: ${ value.schema ?? 'none' }.` );
  string( value.projectID, 'projectID' ); object( value.score, 'score' );
  relative( value.score.path, 'score.path' ); string( value.score.scoreID, 'score.scoreID' );
  if ( !Array.isArray( value.tools ) ) throw new TypeError( 'tools must be an array.' );
  const ids = new Set();
  for ( const [ index, binding ] of value.tools.entries() ) {
    object( binding, `tools[${ index }]` ); const bindingID = string( binding.bindingID, `tools[${ index }].bindingID` );
    if ( ids.has( bindingID ) ) throw new Error( `Duplicate bindingID: ${ bindingID }.` ); ids.add( bindingID );
    string( binding.tool, `tools[${ index }].tool` ); relative( binding.config, `tools[${ index }].config` );
    if ( binding.role !== undefined ) string( binding.role, `tools[${ index }].role` );
  }
  return Object.freeze( value );
}

export function serializeScoreProject( value ) {
  return `${ JSON.stringify( validateScoreProject( value ), null, 2 ) }\n`;
}

export function parseScoreProject( text ) {
  if ( typeof text !== 'string' || Buffer.byteLength( text ) > 1024 * 1024 ) throw new Error( 'Score project text is invalid or too large.' );
  return validateScoreProject( JSON.parse( text ) );
}

export function resolveProjectPath( projectPath, relativePath ) {
  if ( typeof projectPath !== 'string' || !projectPath.startsWith( '/' ) ) throw new Error( 'Project path must be absolute.' );
  relative( relativePath, 'Project member path' );
  const root = projectPath.slice( 0, projectPath.lastIndexOf( '/' ) ) || '/';
  const stack = root.split( '/' ).filter( Boolean );
  for ( const segment of relativePath.replaceAll( '\\', '/' ).split( '/' ) ) {
    if ( !segment || segment === '.' ) continue;
    if ( segment === '..' ) stack.pop(); else stack.push( segment );
  }
  return `/${ stack.join( '/' ) }`;
}

export function resolveScoreProject( value, projectPath ) {
  const project = validateScoreProject( value );
  return Object.freeze( { project, scorePath: resolveProjectPath( projectPath, project.score.path ),
    tools: Object.freeze( project.tools.map( ( binding ) => Object.freeze( { ...binding,
      configPath: resolveProjectPath( projectPath, binding.config ) } ) ) ) } );
}
