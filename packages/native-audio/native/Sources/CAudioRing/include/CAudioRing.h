#ifndef AWB_AUDIO_RING_H
#define AWB_AUDIO_RING_H

#include <CoreAudio/CoreAudio.h>
#include <stdbool.h>
#include <stdint.h>

typedef struct AWBAudioRing AWBAudioRing;

AWBAudioRing *awb_audio_ring_create(uint32_t capacity, uint32_t maxChannels, uint32_t maxFrames, double sampleRate);
void awb_audio_ring_destroy(AWBAudioRing *ring);
bool awb_audio_ring_write(AWBAudioRing *ring, const AudioBufferList *buffers, uint32_t frameCount, uint64_t hostTime);
const uint8_t *awb_audio_ring_read_pointer(AWBAudioRing *ring, uint32_t *byteCount);
void awb_audio_ring_advance(AWBAudioRing *ring);
uint64_t awb_audio_ring_dropped(const AWBAudioRing *ring);

#endif
