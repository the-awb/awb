// A launcher may disappear while Electron is still cleaning up. Losing its log
// pipe must not turn a shutdown diagnostic into an uncaught-exception dialog.
export function guardStdioPipes(streams = [process.stdout, process.stderr]) {
  const remove = [];
  for (const stream of streams) {
    let broken = false;
    const onError = error => {
      if (error.code === 'EPIPE') { broken = true; return; }
      if (broken && error.code === 'ERR_STREAM_DESTROYED') return;
      throw error;
    };
    stream.on('error', onError);
    remove.push(() => stream.off('error', onError));
  }
  return () => remove.forEach(fn => fn());
}
