# `@awb/native-audio`

Shell-owned native multichannel audio capture for AWB tools.

The package launches the bundled `awb-audio-helper`, which opens a Core Audio
device directly. It does not create or select a macOS aggregate device. PCM is
published as versioned binary frames over a tokenised loopback WebSocket so
renderers never receive process or filesystem authority.

The first supported source is a Core Audio input device, including channels
routed back to the computer by an interface such as the MOTU 1248. Process taps
and other platform sources can be added behind the same service contract later.

```js
import { createNativeAudioBroker } from '@awb/native-audio';

const broker = createNativeAudioBroker();
const devices = await broker.listDevices();
const stream = await broker.acquire({ deviceUID: devices[0].uid });
// Give stream.endpoint to an authorised tool renderer.
await stream.release();
await broker.close();
```

Binary frames are little-endian and contain a fixed 44-byte header followed by
channel-major Float32 samples. Consumers should use `decodeAudioFrameHeader` and
drop old visualization frames if they fall behind.
