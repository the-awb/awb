// Native host health takes precedence over cached renderer reports.
export function shellEngineStatus(host, rendererStates=[]) {
  if(host.control) return host.control.status==='ready'
    ? (host.control.audio?.state ?? host.scsynth?.status ?? 'unavailable') : 'unavailable';
  return rendererStates.includes('ready')?'ready':rendererStates.includes('booting')?'booting':host.scsynth?.status??'unavailable';
}
