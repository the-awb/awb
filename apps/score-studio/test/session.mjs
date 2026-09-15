import assert from 'node:assert/strict';
import { createSessionState, MODES, scoreSessionReducer, seedDocument } from '../src/state/scoreSession.js';

let state = createSessionState( seedDocument( 'session-test' ) );
assert.equal( state.document.revision, 0 );
assert.notEqual( state.document, state.hosted, 'authored and runtime state are separate' );

state = scoreSessionReducer( state, { type: 'SET_MODE', mode: MODES.STANDALONE } );
assert.equal( state.mode, MODES.STANDALONE );

const moved = state.document.entries.map( ( entry ) => entry.id === 'n2' ? { ...entry, time: 10 } : entry );
state = scoreSessionReducer( state, { type: 'EDIT_ENTRIES', entries: moved } );
assert.equal( state.document.revision, 1 );
assert.equal( state.document.entries[1].time, 10 );

state = scoreSessionReducer( state, { type: 'HOSTED_STATE', patch: { status: 'playing', realizations: [ { entryID: 'n1' } ] } } );
assert.equal( state.document.revision, 1, 'runtime reports do not mutate authored revision' );

state = scoreSessionReducer( state, { type: 'UNDO' } );
assert.equal( state.document.revision, 2, 'undo creates a new revision rather than reviving an old one' );
assert.equal( state.document.entries[1].time, 8 );

console.log( 'score-session: 8/8 pass' );
