import { createInstrument, setPath } from '../engine/instrumentState.js';
import {
  createDefaultRoomMicrophones,
  createDefaultSurfaces,
  instrumentHex,
  migrateSurfaces
} from '@awb/field-engine';

// The room only has two physical outputs today, but instruments (specifically
// `basic`) read this list to decide how many channels they have -- so a
// future third speaker is a change to this array, not to the instrument
// model. The shader itself still only knows L/R (see @awb/field-engine).
export const SPEAKERS = [
  { id: 'L', label: 'L' },
  { id: 'R', label: 'R' },
];

let nextId = 1;
const genId = () => `inst-${nextId++}`;

function seedInstruments() {
  const a = createInstrument('substrate', SPEAKERS, genId);
  a.params = { ...a.params, freqA: 36, beat: 0.1 };
  a.color = instrumentHex(0);
  a.highlight = true;
  const b = createInstrument('substrate', SPEAKERS, genId);
  b.params = { ...b.params, freqA: 40, beat: 0.1 };
  b.mute = true;
  b.color = instrumentHex(1);
  return [a, b];
}

export function initialFieldState() {
  const instruments = seedInstruments();
  const room = {
    speakers: SPEAKERS,
    sep: 2.0, spkH: 1.10, bedH: 0.60, bedY: 2.0,
    pistonA: 0.07, roomDiam: 7.0, roomBack: 2.0, conv: 0,
  };
  return {
    instruments,
    selectedInstrumentId: instruments[0].id,
    selectedSurfaceId: null,
    // A node on the server that is not one of ours - made in the console. Not part of a saved
    // session: it belongs to whatever made it, and will not exist next time.
    selectedNodeId: null,
    activeTab: 'instruments',
    timeFactor: 1,
    meta: {
      title: 'Untitled session',
      description: 'Free field — no walls, no floor bounce. Speakers are circular pistons '
        + 'with frequency-dependent directivity, which holds for the HS8 below roughly '
        + '800 Hz on axis. Envelope is the magnitude of the analytic signal, exact for any '
        + 'number of channels at any frequencies.',
    },
    room,
    surfaces: createDefaultSurfaces(room),
    microphones: createDefaultRoomMicrophones(room),
    display: {
      gain: 1.0, timeScaleExp: -2.7,
      playing: true,
      // Visual sync: re-measure phase off the engine's output every 30s, not only when an
      // instrument mounts or a frequency changes. On by default - a lock decays as the engine
      // glitches, and re-measuring costs ~8ms every 30s. Turn it off if things get slow.
      phaseSync: true,
    },
    // UI-only, not part of a saved file.
    dockOpen: true,
    filesOpen: true,
    paramsOpen: true,
  };
}

export function fieldReducer(state, action) {
  switch (action.type) {
    case 'ADD_INSTRUMENT': {
      const inst = createInstrument(action.instType, state.room.speakers, genId);
      inst.color = instrumentHex(state.instruments.length);
      return { ...state, instruments: [...state.instruments, inst], selectedInstrumentId: inst.id, selectedSurfaceId: null, selectedNodeId: null };
    }
    case 'REMOVE_INSTRUMENT': {
      const instruments = state.instruments.filter((i) => i.id !== action.id);
      const selectedInstrumentId = state.selectedInstrumentId === action.id
        ? (instruments[0]?.id ?? null)
        : state.selectedInstrumentId;
      return { ...state, instruments, selectedInstrumentId };
    }
    case 'UPDATE_INSTRUMENT_PARAM': {
      return {
        ...state,
        instruments: state.instruments.map((i) => i.id === action.id
          ? { ...i, params: setPath(i.params, action.path, action.value) }
          : i),
      };
    }
    // Back to the SynthDef's own default: the param is REMOVED rather than set to the default
    // value, so it stops being sent at all and "unchanged" stays honest in a saved session.
    case 'CLEAR_INSTRUMENT_PARAM': {
      const instruments = state.instruments.map((i) => {
        if (i.id !== action.id || !Object.hasOwn(i.params, action.name)) return i;
        const params = { ...i.params };
        delete params[action.name];
        return { ...i, params };
      });
      return { ...state, instruments };
    }
    case 'SET_INSTRUMENT_PLAYING': {
      const instruments = state.instruments.map((i) => (
        i.id === action.id ? { ...i, playing: action.playing } : i));
      return { ...state, instruments };
    }
    case 'SET_INSTRUMENT_MUTE': {
      return {
        ...state,
        instruments: state.instruments.map((i) => i.id === action.id ? { ...i, mute: action.mute } : i),
      };
    }
    case 'SET_INSTRUMENT_SOLO': {
      return {
        ...state,
        instruments: state.instruments.map((i) => i.id === action.id ? { ...i, solo: action.solo } : i),
      };
    }
    case 'SET_INSTRUMENT_AMP': {
      return {
        ...state,
        instruments: state.instruments.map((i) => i.id === action.id ? { ...i, amp: action.amp } : i),
      };
    }
    case 'SET_INSTRUMENT_L_ACTIVE': {
      return {
        ...state,
        instruments: state.instruments.map((i) => i.id === action.id ? { ...i, lActive: action.active } : i),
      };
    }
    case 'SET_INSTRUMENT_R_ACTIVE': {
      return {
        ...state,
        instruments: state.instruments.map((i) => i.id === action.id ? { ...i, rActive: action.active } : i),
      };
    }
    case 'SET_INSTRUMENT_COLOR': {
      return {
        ...state,
        instruments: state.instruments.map((i) => i.id === action.id ? { ...i, color: action.color } : i),
      };
    }
    case 'SET_INSTRUMENT_HIGHLIGHT': {
      return {
        ...state,
        instruments: state.instruments.map((i) => i.id === action.id ? { ...i, highlight: action.highlight } : i),
      };
    }
    case 'SET_CHANNEL_ACTIVE': {
      return {
        ...state,
        instruments: state.instruments.map((i) => i.id === action.id
          ? { ...i, channels: { ...i.channels, [action.slot]: { ...i.channels[action.slot], active: action.active } } }
          : i),
      };
    }
    case 'UPDATE_ROOM':
      return { ...state, room: { ...state.room, [action.key]: action.value } };
    case 'UPDATE_DISPLAY':
      return { ...state, display: { ...state.display, [action.key]: action.value } };
    case 'UPDATE_SURFACE':
      return {
        ...state,
        surfaces: {
          ...state.surfaces,
          [action.id]: { ...state.surfaces[action.id], [action.key]: action.value },
        },
      };
    case 'UPDATE_MICROPHONE_POSITION':
      return {
        ...state,
        microphones: state.microphones.map((microphone) => microphone.id === action.id
          ? { ...microphone, position: [...action.position] }
          : microphone),
      };
    // Intended integration point for room_analysis localization output.
    case 'SET_MICROPHONES_FROM_ANALYSIS':
      return { ...state, microphones: action.microphones.map((microphone) => ({ ...microphone, position: [...microphone.position] })) };
    // One action for all seven verbs: the panel calls the verb, the reducer stores what came
    // back. Keeping the verbs OUT of the reducer is what lets score-verbs.mjs test them with
    // no React at all, which is the point of building E2 before E7.
    case 'SET_TIME_FACTOR':
      return { ...state, timeFactor: action.value };
    case 'SELECT_INSTRUMENT':
      return { ...state, selectedInstrumentId: action.id, selectedSurfaceId: null, selectedNodeId: null };
    case 'SELECT_SURFACE':
      return { ...state, selectedInstrumentId: null, selectedSurfaceId: action.id, selectedNodeId: null };
    case 'SELECT_NODE':
      return { ...state, selectedInstrumentId: null, selectedSurfaceId: null, selectedNodeId: action.id };
    case 'SET_TAB':
      return { ...state, activeTab: action.tab };
    case 'SET_META':
      return { ...state, meta: { ...state.meta, [action.key]: action.value } };
    case 'SET_DOCK_OPEN':
      return { ...state, dockOpen: action.open };
    case 'SET_FILES_OPEN':
      return { ...state, filesOpen: action.open };
    case 'SET_PARAMS_OPEN':
      return { ...state, paramsOpen: action.open };
    // Replaces the document (instruments/room/display/timeFactor/meta) with a
    // loaded file's data, or a fresh default for "New" -- keeps whatever UI
    // navigation state (active tab, panel collapse) the user already had.
    case 'LOAD_STATE': {
      const loaded = action.state;
      return {
        ...state,
        instruments: loaded.instruments,
        room: loaded.room,
        display: { ...state.display, ...loaded.display },
        surfaces: migrateSurfaces(loaded),
        microphones: loaded.microphones ?? createDefaultRoomMicrophones(loaded.room),
        timeFactor: loaded.timeFactor,
        meta: loaded.meta,
        selectedInstrumentId: loaded.instruments[0]?.id ?? null,
        selectedSurfaceId: null,
      };
    }
    default:
      return state;
  }
}
