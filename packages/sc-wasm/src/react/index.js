// @awb/sc-wasm/react — the React adapter.
//
// React is an OPTIONAL peer dependency: a host that only wants ./core must not be made to install
// it. Importing this entry point in a host without React is the one way to get a resolution error,
// and that is the intended behaviour.

export { useSuperCollider } from './useSuperCollider.js';
