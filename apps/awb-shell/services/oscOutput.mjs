import { Buffer } from 'node:buffer';

// Immediate OSC bundles, bounded by bytes rather than control count. A single
// existing large message stays a plain packet; we never split an OSC message.
export function oscPackets(entries, maxPacketBytes = 1200) {
  const packets = []; let group = [], size = 16;
  const flush = () => {
    if (!group.length) return;
    let bytes = group[0].bytes;
    if (group.length > 1) {
      const header = Buffer.alloc(16); header.write('#bundle\0'); header.writeUInt32BE(1, 12);
      bytes = Buffer.concat([header, ...group.flatMap(item => {
        const length = Buffer.alloc(4); length.writeUInt32BE(item.bytes.length);
        return [length, item.bytes];
      })]);
    }
    packets.push({bytes, entries: group}); group = []; size = 16;
  };
  for (const item of entries) {
    if (group.length && size + 4 + item.bytes.length > maxPacketBytes) flush();
    group.push(item); size += 4 + item.bytes.length;
    if (item.bytes.length + 20 > maxPacketBytes) flush();
  }
  flush(); return packets;
}

// One queue per UDP socket/endpoint: preserve order and never deduplicate unknown
// protocols. The rack already coalesces continuous values before this boundary.
export function createOscOutput({encodeMessage, sendPacket, flushMs = 2,
  maxPacketBytes = 1200, maxPendingMessages = 4096, maxPendingBytes = 4 * 1024 * 1024}) {
  if (typeof encodeMessage !== 'function' || typeof sendPacket !== 'function'
    || !Number.isFinite(flushMs) || flushMs < 0 || !Number.isInteger(maxPacketBytes)
    || maxPacketBytes < 24 || maxPacketBytes > 65507
    || !Number.isInteger(maxPendingMessages) || maxPendingMessages < 1
    || !Number.isInteger(maxPendingBytes) || maxPendingBytes < 1) throw Error('Invalid OSC output options.');
  let pending = [], timer = null, tail = Promise.resolve(), closed = false, outstanding = 0, outstandingBytes = 0;
  const counters = {messages: 0, packets: 0, bundles: 0, bytes: 0, failures: 0};
  const flush = () => {
    clearTimeout(timer); timer = null;
    const entries = pending; pending = [];
    const packets = oscPackets(entries, maxPacketBytes);
    tail = tail.then(async () => {
      for (const packet of packets) {
        try {
          await sendPacket(packet.bytes, packet.entries.map(e => e.context));
          counters.messages += packet.entries.length; counters.packets++; counters.bytes += packet.bytes.length;
          if (packet.entries.length > 1) counters.bundles++;
          packet.entries.forEach(e => e.resolve());
        } catch (error) {
          counters.failures++; packet.entries.forEach(e => e.reject(error));
        } finally {
          outstanding -= packet.entries.length;
          outstandingBytes -= packet.entries.reduce((n, e) => n + e.bytes.length, 0);
        }
      }
    });
    return tail;
  };
  const sendMany = items => {
    if (closed) return Promise.reject(Error('OSC output is closed.'));
    let entries;
    try {
      entries = items.map(({message, context}) => ({bytes: encodeMessage(message), context}));
      if (entries.some(e => !Buffer.isBuffer(e.bytes) || e.bytes.length > 65507)) throw Error('OSC message exceeds UDP packet limit.');
      const bytes = entries.reduce((n, e) => n + e.bytes.length, 0);
      if (outstanding + entries.length > maxPendingMessages || outstandingBytes + bytes > maxPendingBytes) throw Error('OSC output queue capacity exceeded.');
      outstanding += entries.length; outstandingBytes += bytes;
    } catch (error) { return Promise.reject(error); }
    const done = Promise.all(entries.map(entry => new Promise((resolve, reject) => pending.push({...entry, resolve, reject}))));
    if (pending.length && timer === null) timer = setTimeout(flush, flushMs);
    return done;
  };
  return {
    send: (message, context) => sendMany([{message, context}]),
    sendMany, flush,
    snapshot: () => ({...counters, pendingMessages: outstanding, pendingBytes: outstandingBytes, maxPacketBytes, flushMs}),
    async close({drain = true} = {}) {
      closed = true; clearTimeout(timer); timer = null;
      if (drain) await flush();
      else {
        const error = Error('OSC output closed before transmission.');
        for (const e of pending) { outstanding--; outstandingBytes -= e.bytes.length; e.reject(error); }
        pending = []; await tail;
      }
    }
  };
}
