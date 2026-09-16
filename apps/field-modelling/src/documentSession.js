import {
  FIELD_CONFIG_SCHEMA, createFieldConfig, parseFieldConfig, parseScoreProject, serializeFieldConfig
} from '@awb/field-documents';

export const saveableFieldState = ( state ) => {
  const { instruments, room, surfaces, microphones, display, timeFactor, meta } = state;
  return { instruments, room, surfaces, microphones, display, timeFactor, meta };
};

export const fieldConfigFromState = ( state, options = {} ) => createFieldConfig(
  saveableFieldState( state ),
  { title: state.meta?.title || 'Untitled field', ...options }
);

export function stateFromFieldConfig( config ) {
  const parsed = typeof config === 'string' ? parseFieldConfig( config ) : config;
  if ( parsed.schema !== FIELD_CONFIG_SCHEMA ) throw new Error( 'Not an AWB Field config.' );
  return parsed.field;
}

export async function openInitialDocument( host, launchContext ) {
  const record = await host?.request( 'filesystem.initial-file' );
  if ( !record ) return { kind: 'new', config: null, file: null, project: null };
  const opened = await host.request( 'filesystem.read-file', { handle: record.handle,
    markRecent: true, documentKindID: launchContext.payload?.documentKindID } );
  if ( opened.name.toLowerCase().endsWith( '.awb-project.json' ) ) {
    const project = parseScoreProject( opened.text );
    const resolved = await host.request( 'filesystem.resolve-score-project', { handle: opened.handle,
      bindingID: launchContext.payload?.bindingID ?? null, toolID: 'field-modelling' } );
    const configFile = await host.request( 'filesystem.read-file', { handle: resolved.config.handle,
      markRecent: false } );
    return { kind: 'project', project, binding: resolved.binding,
      config: parseFieldConfig( configFile.text ), file: { ...configFile, originalText: configFile.text },
      score: resolved.score };
  }
  return { kind: 'config', config: parseFieldConfig( opened.text ),
    file: { ...opened, originalText: opened.text }, project: null };
}

export async function saveFieldDocument( host, state, file, { saveAs = false } = {} ) {
  const config = fieldConfigFromState( state, { configID: file?.configID ?? crypto.randomUUID() } );
  const text = serializeFieldConfig( config );
  const result = await host.request( 'filesystem.save-file', {
    handle: file?.handle ?? null, saveAs: saveAs || !file?.handle,
    suggestedName: `${ ( state.meta?.title || 'untitled-field' ).replaceAll( /[^a-z0-9_-]+/gi, '-' ) }.field.json`,
    filters: [ { name: 'AWB Field Config', extensions: [ 'field.json' ] } ], text,
    expectedText: saveAs ? null : file?.originalText ?? null,
    markRecent: true, documentKindID: 'field-config'
  } );
  return result ? { ...result, originalText: text, configID: config.configID } : file;
}
