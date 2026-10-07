#pragma once
#include <atomic>
#include <cstdint>
#include <cstdio>
namespace ubview {
constexpr uint32_t MAGIC=0x55425631, VERSION=2, BINS=2048, DIRTY=4;
static_assert(std::atomic<uint32_t>::is_always_lock_free,"Requires lock-free 32-bit atomics");
struct Snapshot {
 uint32_t sequence=0, frames=0, position=0, recorded=0, flags=0, bins=BINS;
 float sampleRate=0, peak=0;
 uint32_t prefixFrames=0;
 float prefix[2]{};
 float envelope[BINS*2]{};
};
struct Shared {
 uint32_t magic=MAGIC, version=VERSION, bytes=sizeof(Shared), generation=0;
 std::atomic<uint32_t> alive{0}, readerClaim{0}, middle{1}, readerFront{0};
 Snapshot slots[3];
};
inline void name(char* out,size_t capacity,uint32_t id) { std::snprintf(out,capacity,"/awbub_%u",id); }
}
