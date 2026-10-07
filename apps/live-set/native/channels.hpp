#pragma once
#include "tape.hpp"
namespace tape {
// Reads and return sums happen before writes, including full-capacity taps.
// Storage capacity never creates a return. Only enabled heads feed the input.
struct ChannelEngine {
    uint32_t position=0,clearPosition=0;
    bool clearing=false;
    void clear(){clearing=true;clearPosition=position=0;}
    template<class Input,class Source,class Delay,class Return,class Output>
    void step(float* data,uint32_t capacity,uint32_t channels,uint32_t slots,
              float feedback,float inputGain,bool running,
              Input input,Source source,Delay delay,Return weight,Output output){
        for(uint32_t h=0;h<slots;h++)output(h,0.f);
        if(!running||clearing||channels>32||!capacity)return;
        float returns[32]={}; // bounded by the publisher/backend admission limit
        for(uint32_t h=0;h<slots;h++){
            const int ch=source(h);
            if(ch<0||uint32_t(ch)>=channels)continue;
            const auto d=std::clamp(delay(h),1u,capacity);
            const float sample=Engine::finite(data[((position+capacity-d)%capacity)*channels+ch]);
            output(h,sample);
            for(uint32_t to=0;to<channels;to++)
                returns[to]+=sample*std::clamp(Engine::finite(weight(h,to)),-2.f,2.f);
        }
        const float fb=std::clamp(Engine::finite(feedback),0.f,1.1f),in=std::clamp(Engine::finite(inputGain),0.f,2.f);
        for(uint32_t ch=0;ch<channels;ch++)
            data[position*channels+ch]=std::clamp(Engine::finite(returns[ch]*fb+Engine::finite(input(ch))*in),-8.f,8.f);
        position=(position+1)%capacity;
    }
    bool clearChunk(float* data,uint32_t capacity,uint32_t channels,uint32_t frames=4096){
        if(!clearing)return false;
        const auto end=std::min(capacity,clearPosition+frames);
        std::fill(data+clearPosition*channels,data+end*channels,0.f);clearPosition=end;
        if(end==capacity)clearing=false;
        return true;
    }
};
}
