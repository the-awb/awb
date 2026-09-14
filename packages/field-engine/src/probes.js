import { BODY_SITES } from './surfaceSetups.js';

export function createDefaultRoomMicrophones(room = {}) {
  const bedY = room.bedY ?? 2;
  const height = (room.bedH ?? 0.6) + 0.55;
  return [
    { id: 'mic_1', label: 'Room mic 1', kind: 'microphone', subtype: 'room', position: [-0.45, height, bedY - 0.45] },
    { id: 'mic_2', label: 'Room mic 2', kind: 'microphone', subtype: 'room', position: [0.45, height, bedY - 0.45] },
    { id: 'mic_3', label: 'Room mic 3', kind: 'microphone', subtype: 'room', position: [0, height, bedY + 0.45] },
  ];
}

export function bodySiteWorldPosition(local, setupId, room) {
  const [x, y, z] = local;
  if (setupId === 'lying') {
    return [x, room.bedH + 0.14 - z, room.bedY - 0.91 + y];
  }
  return [x, y, room.bedY + z];
}

// A body site is a virtual microphone: a point where the incident field is
// observed. Attachment metadata distinguishes it from a freely placed room
// microphone without inventing a second kind of point sampler.
export function bodySiteMicrophones(bodySurface, room) {
  const setupId = bodySurface.setupId;
  return (BODY_SITES[setupId] ?? []).map(([siteId, label, localPosition]) => ({
    id: `body:${siteId}`,
    kind: 'microphone',
    subtype: 'body-site',
    label,
    position: bodySiteWorldPosition(localPosition, setupId, room),
    attachment: { surfaceId: 'body', setupId, siteId, localPosition },
  }));
}
