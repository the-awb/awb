// Practice-specific instrument meaning. Execution capability belongs to each renderer; analytic
// field projection belongs to @awb/field-engine; live node and session state belong to the host.
export {
  INSTRUMENT_CATALOG,
  INSTRUMENT_TYPE_KEYS,
  instrumentType,
  instrumentControls,
  instrumentDefaultParams,
  instrumentFields,
  instrumentBooleanFields,
  instrumentFrequencyControls,
  instrumentEnvelopeLengths,
  instrumentEnvelopes,
  instrumentNoteLifecycle,
  instrumentMainFrequency,
  typeForSynthDef
} from './catalog.js';
