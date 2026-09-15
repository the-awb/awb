const base = () => import.meta.env.BASE_URL || '/';

export const importScsynth = () => import( /* @vite-ignore */ `${ base() }scsynth/scsynth.js` );
export const importSclang = () => import( /* @vite-ignore */ `${ base() }sclang/sclang.js` );
export const locateSclangFile = ( file ) => `${ base() }sclang/${ file }`;
