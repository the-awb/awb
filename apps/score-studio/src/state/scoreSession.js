import { adoptIds, createScoreDocument, makeEvent, reviseScoreDocument, sortScore } from '@awb/score';

export const MODES = Object.freeze( { HOSTED: 'hosted', STANDALONE: 'standalone' } );

export function seedDocument( scoreID = 'untitled-score' ) {
  return createScoreDocument( {
    scoreID,
    meta: { title: 'Untitled score', description: '', tags: [] },
    entries: sortScore( [
      makeEvent( 0, { type: 'note', def: 'substrate', freqA: 36, dur: 8 }, { id: 'n1', path: [ 'opening' ] } ),
      makeEvent( 8, { type: 'note', def: 'substrate', freqA: 40, dur: 8 }, { id: 'n2', path: [ 'answer' ] } ),
      makeEvent( 20, { type: 'release', target: '@all' }, { id: 'n3', path: [] } )
    ] )
  } );
}

export function createSessionState( document = seedDocument() ) {
  adoptIds( document.entries );
  return {
    document,
    undo: [],
    selected: [],
    mode: MODES.HOSTED,
    view: 'score',
    playhead: 0,
    workingDocument: '',
    hosted: { status: 'disconnected', endpoint: '', anchor: null, realizations: [] }
  };
}

export function scoreSessionReducer( state, action ) {
  switch ( action.type ) {
    case 'SET_MODE':
      return { ...state, mode: action.mode };
    case 'SET_VIEW':
      return { ...state, view: action.view };
    case 'SET_PLAYHEAD':
      return { ...state, playhead: Math.max( 0, action.time ) };
    case 'SET_SELECTED':
      return { ...state, selected: action.ids };
    case 'EDIT_ENTRIES': {
      if ( action.entries === state.document.entries ) return state;
      return {
        ...state,
        document: reviseScoreDocument( state.document, action.entries ),
        undo: [ ...state.undo, state.document ].slice( -50 )
      };
    }
    case 'EDIT_META':
      return {
        ...state,
        document: reviseScoreDocument( state.document, state.document.entries, {
          ...state.document.meta,
          [ action.key ]: action.value
        } ),
        undo: [ ...state.undo, state.document ].slice( -50 )
      };
    case 'UNDO': {
      const previous = state.undo.at( -1 );
      if ( !previous ) return state;
      return {
        ...state,
        document: createScoreDocument( { ...previous, revision: state.document.revision + 1 } ),
        undo: state.undo.slice( 0, -1 )
      };
    }
    case 'LOAD_DOCUMENT':
      adoptIds( action.document.entries );
      return { ...createSessionState( action.document ), mode: state.mode, view: state.view };
    case 'SET_WORKING_DOCUMENT':
      return { ...state, workingDocument: action.text };
    case 'HOSTED_STATE':
      return { ...state, hosted: { ...state.hosted, ...action.patch } };
    default:
      return state;
  }
}
