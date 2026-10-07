#pragma once
#include "tape.hpp"

namespace tape {
// A bounded, replace-on-next-onset working loop. No per-gesture allocation.
// Detection uses the available stereo signal before input gain, never loop output.
struct Gesture {
    enum State { Idle=0, Capture=1, Loop=2 };
    struct Settings {
        float high=.02f, low=.01f, release=.99f;
        uint32_t gap=1, minimum=1, maximum=1;
    } settings;
    State state=Idle;
    uint32_t frames=0, position=0, quiet=0, generation=0;
    float level=0;
    bool armed=true;
    int event=0; // 1 onset, 2 quiet close, 3 maximum close, 4 too short
    int reason=0;
    void reset() { *this=Gesture{}; }
    void invalidate() { const auto previous=generation;reset();generation=(previous%16000000)+1; }
    void step(float* data,uint32_t capacity,float left,float right,float feedback,
              float inputGain,const Settings& next,bool frozen,float& outL,float& outR) {
        outL=outR=0;event=0;
        if(frozen) {
            if(state==Loop && frames){outL=data[position*2];outR=data[position*2+1];position=(position+1)%frames;}
            return;
        }
        const auto signal=std::max(std::abs(Engine::finite(left)),std::abs(Engine::finite(right)));
        const auto& detector=state==Capture?settings:next;
        level=std::max(signal,level*std::clamp(detector.release,0.f,1.f));
        const auto in=std::clamp(Engine::finite(inputGain),0.f,2.f);
        if(level<=detector.low)armed=true;
        if(state!=Capture && armed && level>=next.high && in>0) {
            settings=next;settings.maximum=std::clamp(settings.maximum,1u,capacity);
            frames=position=quiet=0;reason=0;state=Capture;armed=false;generation=(generation%16000000)+1;event=1;
        }
        if(state==Capture) {
            quiet=level<=settings.low?quiet+1:0;
            // The closing sample belongs to playback. Previously recorded quiet
            // samples are intentional trailing padding, not host/GUI latency.
            const bool ended=quiet>=settings.gap;
            const bool full=frames>=settings.maximum;
            if(ended || full) {
                state=frames>=settings.minimum?Loop:Idle;position=0;
                event=state==Idle?4:(full?3:2);reason=event;
                if(state==Idle){frames=0;return;}
            } else {
                data[frames*2]=std::clamp(Engine::finite(left)*in,-8.f,8.f);
                data[frames*2+1]=std::clamp(Engine::finite(right)*in,-8.f,8.f);
                ++frames;position=frames;return;
            }
        }
        if(state==Loop && frames) {
            outL=data[position*2];outR=data[position*2+1];
            const auto fb=std::clamp(Engine::finite(feedback),0.f,1.1f);
            data[position*2]=std::clamp(Engine::finite(outL*fb),-8.f,8.f);
            data[position*2+1]=std::clamp(Engine::finite(outR*fb),-8.f,8.f);
            position=(position+1)%frames;
        }
    }
};
}
