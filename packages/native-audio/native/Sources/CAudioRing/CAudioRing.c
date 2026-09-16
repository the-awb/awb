#include "CAudioRing.h"
#include <stdatomic.h>
#include <stdlib.h>
#include <string.h>

#define AWB_AUDIO_MAGIC 0x41425741u
#define AWB_AUDIO_VERSION 1u

#pragma pack(push, 1)
typedef struct {
    uint32_t magic;
    uint16_t version;
    uint16_t headerBytes;
    uint32_t flags;
    uint64_t sequence;
    uint64_t hostTime;
    double sampleRate;
    uint32_t channelCount;
    uint32_t frameCount;
} AWBAudioFrameHeader;
#pragma pack(pop)

struct AWBAudioRing {
    uint32_t capacity;
    uint32_t maxChannels;
    uint32_t maxFrames;
    uint32_t slotBytes;
    double sampleRate;
    uint8_t *storage;
    _Atomic uint32_t writeIndex;
    _Atomic uint32_t readIndex;
    _Atomic uint64_t sequence;
    _Atomic uint64_t dropped;
};

AWBAudioRing *awb_audio_ring_create(uint32_t capacity, uint32_t maxChannels, uint32_t maxFrames, double sampleRate) {
    if (capacity < 2 || !maxChannels || !maxFrames) return NULL;
    AWBAudioRing *ring = calloc(1, sizeof(AWBAudioRing));
    if (!ring) return NULL;
    ring->capacity = capacity;
    ring->maxChannels = maxChannels;
    ring->maxFrames = maxFrames;
    ring->sampleRate = sampleRate;
    ring->slotBytes = (uint32_t)sizeof(AWBAudioFrameHeader) + maxChannels * maxFrames * sizeof(float);
    ring->storage = calloc(capacity, ring->slotBytes);
    if (!ring->storage) { free(ring); return NULL; }
    return ring;
}

void awb_audio_ring_destroy(AWBAudioRing *ring) {
    if (!ring) return;
    free(ring->storage);
    free(ring);
}

bool awb_audio_ring_write(AWBAudioRing *ring, const AudioBufferList *buffers, uint32_t frameCount, uint64_t hostTime) {
    if (!ring || !buffers || !frameCount || frameCount > ring->maxFrames) return false;
    uint32_t writeIndex = atomic_load_explicit(&ring->writeIndex, memory_order_relaxed);
    uint32_t next = (writeIndex + 1) % ring->capacity;
    if (next == atomic_load_explicit(&ring->readIndex, memory_order_acquire)) {
        atomic_fetch_add_explicit(&ring->dropped, 1, memory_order_relaxed);
        return false;
    }
    uint32_t channelCount = 0;
    for (uint32_t index = 0; index < buffers->mNumberBuffers; index++) channelCount += buffers->mBuffers[index].mNumberChannels;
    if (!channelCount || channelCount > ring->maxChannels) return false;
    uint8_t *slot = ring->storage + writeIndex * ring->slotBytes;
    AWBAudioFrameHeader *header = (AWBAudioFrameHeader *)slot;
    *header = (AWBAudioFrameHeader) {
        .magic = AWB_AUDIO_MAGIC, .version = AWB_AUDIO_VERSION, .headerBytes = sizeof(AWBAudioFrameHeader),
        .flags = 1u, .sequence = atomic_fetch_add_explicit(&ring->sequence, 1, memory_order_relaxed),
        .hostTime = hostTime, .sampleRate = ring->sampleRate, .channelCount = channelCount, .frameCount = frameCount
    };
    float *target = (float *)(slot + sizeof(AWBAudioFrameHeader));
    uint32_t targetChannel = 0;
    for (uint32_t index = 0; index < buffers->mNumberBuffers; index++) {
        const AudioBuffer *buffer = &buffers->mBuffers[index];
        const float *source = (const float *)buffer->mData;
        if (!source) { targetChannel += buffer->mNumberChannels; continue; }
        for (uint32_t channel = 0; channel < buffer->mNumberChannels; channel++, targetChannel++) {
            float *plane = target + targetChannel * frameCount;
            if (buffer->mNumberChannels == 1) memcpy(plane, source, frameCount * sizeof(float));
            else for (uint32_t frame = 0; frame < frameCount; frame++) plane[frame] = source[frame * buffer->mNumberChannels + channel];
        }
    }
    atomic_store_explicit(&ring->writeIndex, next, memory_order_release);
    return true;
}

const uint8_t *awb_audio_ring_read_pointer(AWBAudioRing *ring, uint32_t *byteCount) {
    if (!ring || !byteCount) return NULL;
    uint32_t readIndex = atomic_load_explicit(&ring->readIndex, memory_order_relaxed);
    if (readIndex == atomic_load_explicit(&ring->writeIndex, memory_order_acquire)) return NULL;
    uint8_t *slot = ring->storage + readIndex * ring->slotBytes;
    AWBAudioFrameHeader *header = (AWBAudioFrameHeader *)slot;
    *byteCount = (uint32_t)sizeof(AWBAudioFrameHeader) + header->channelCount * header->frameCount * sizeof(float);
    return slot;
}

void awb_audio_ring_advance(AWBAudioRing *ring) {
    uint32_t readIndex = atomic_load_explicit(&ring->readIndex, memory_order_relaxed);
    atomic_store_explicit(&ring->readIndex, (readIndex + 1) % ring->capacity, memory_order_release);
}

uint64_t awb_audio_ring_dropped(const AWBAudioRing *ring) {
    return ring ? atomic_load_explicit(&ring->dropped, memory_order_relaxed) : 0;
}
