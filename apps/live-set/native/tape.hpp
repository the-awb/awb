#pragma once
#include <algorithm>
#include <cmath>
#include <cstdint>

namespace tape {
struct Engine {
    uint32_t position=0, clearPosition=0;
    bool clearing=false;
    void clear() { clearing=true; clearPosition=position=0; }
    static float finite(float v) { return std::isfinite(v)?v:0.f; }
    // delayFrames is bounded by caller; each head reads before this sample's write.
    void step(float* data,uint32_t capacity,float left,float right,uint32_t delayFrames,
              const float* fractions,const float* weights,float feedback,float inputGain,
              bool running,float& outL,float& outR) {
        outL=outR=0;
        if(!running || clearing)return;
        auto at=[&](uint32_t delay,uint32_t channel) {
            return data[((position+capacity-delay)%capacity)*2+channel];
        };
        float sums[2]={0,0},norms[2]={0,0};
        for(int head=0;head<4;head++) {
            const auto channel=head%2;
            const auto delay=std::clamp(uint32_t(std::lround(delayFrames*fractions[head])),1u,capacity);
            const auto gain=std::clamp(finite(weights[head]),0.f,1.f);
            sums[channel]+=at(delay,channel)*gain;norms[channel]+=gain;
        }
        outL=sums[0]/std::max(1.f,norms[0]);outR=sums[1]/std::max(1.f,norms[1]);
        const auto fb=std::clamp(finite(feedback),0.f,1.1f);
        const auto in=std::clamp(finite(inputGain),0.f,2.f);
        // Explicit emergency storage bound, separate from ordinary feedback gain.
        data[position*2]=std::clamp(finite(at(delayFrames,0)*fb+finite(left)*in),-8.f,8.f);
        data[position*2+1]=std::clamp(finite(at(delayFrames,1)*fb+finite(right)*in),-8.f,8.f);
        position=(position+1)%capacity;
    }
    bool clearChunk(float* data,uint32_t capacity,uint32_t frames=4096) {
        if(!clearing)return false;
        const auto end=std::min(capacity,clearPosition+frames);
        std::fill(data+clearPosition*2,data+end*2,0.f);clearPosition=end;
        if(end==capacity)clearing=false;
        return true;
    }
};
}
