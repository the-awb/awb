#pragma once
#include <algorithm>
#include <cstdint>

namespace tape {
// Copy oldest first, before the writer advances. At least one writer block is
// copied per callback, so even a full-capacity snapshot cannot be overtaken.
// No allocation, long whole-buffer lock, or interruption of delay playback.
struct Snapshot {
    uint32_t start=0, copied=0, frames=0;
    bool active=false;
    void begin(uint32_t position,uint32_t capacity,uint32_t count) {
        start=(position+capacity-count)%capacity;copied=0;frames=count;active=true;
    }
    bool step(const float* source,float* destination,uint32_t capacity,uint32_t budget) {
        if(!active)return false;
        const auto end=std::min(frames,copied+budget);
        for(;copied<end;++copied) {
            const auto index=(start+copied)%capacity;
            destination[copied*2]=source[index*2];destination[copied*2+1]=source[index*2+1];
        }
        if(copied==frames){active=false;return true;}return false;
    }
};
}
