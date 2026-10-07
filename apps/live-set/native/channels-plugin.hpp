// Included in UnifiedTape.cpp: shares the existing waveform allocation commands.
#include "channels.hpp"
#include "wave-prefix.hpp"
struct UnifiedTapeChannels:Unit {
    tape::ChannelEngine engine;
    uint32_t channels,slots,sequence,clock;
    float lastClear;
    Entry** entry;uint32_t* back;float* envelope;
    bool ready;
};
static void channelsBins(UnifiedTapeChannels* unit,SndBuf* b,uint32_t first,uint32_t last){
    const uint32_t width=(b->frames+BINS-1)/BINS;
    for(uint32_t bin=first/width;bin<=std::min(last/width,BINS-1);bin++){
        const auto begin=bin*width,end=std::min(begin+width,uint32_t(b->frames));
        for(uint32_t ch=0;ch<unit->channels;ch++){
            float lo=0,hi=0;
            if(begin<end){lo=hi=b->data[begin*unit->channels+ch];for(uint32_t f=begin+1;f<end;f++){const float v=b->data[f*unit->channels+ch];lo=std::min(lo,v);hi=std::max(hi,v);}}
            const auto offset=(ch*BINS+bin)*2;unit->envelope[offset]=lo;unit->envelope[offset+1]=hi;
        }
    }
}
static void channelsPublish(UnifiedTapeChannels* unit,SndBuf* b,uint32_t period,bool running){
    ++unit->sequence;
    for(uint32_t ch=0;ch<unit->channels;ch++){
        Shared* m=unit->entry[ch]->memory;auto& s=m->slots[unit->back[ch]];
        s.sequence=unit->sequence;s.frames=b->frames;s.position=unit->engine.position;s.recorded=period;
        s.flags=(running?2u:0u)|(unit->engine.clearing?8u:0u);s.sampleRate=float(FULLRATE);s.peak=0;
        s.prefixFrames=s.position%((b->frames+BINS-1)/BINS);
        writtenPrefix(b->data,unit->channels,ch,s.position,(b->frames+BINS-1)/BINS,s.prefix);
        memcpy(s.envelope,unit->envelope+ch*BINS*2,sizeof(s.envelope));
        for(uint32_t bin=0;bin<BINS*2;bin++)s.peak=std::max(s.peak,std::abs(s.envelope[bin]));
        unit->back[ch]=m->middle.exchange(unit->back[ch]|DIRTY,std::memory_order_acq_rel)&3u;
    }
}
static void UnifiedTapeChannels_next(UnifiedTapeChannels* unit,int n){
    for(int h=0;h<unit->mNumOutputs;h++)std::fill(OUT(h),OUT(h)+n,0.f);
    const int index=int(IN0(0));
    if(!unit->ready||index<0||uint32_t(index)>=unit->mWorld->mNumSndBufs)return;
    SndBuf* b=unit->mWorld->mSndBufs+index;
    if(!b->data||uint32_t(b->channels)!=unit->channels||b->frames<1)return;
    LOCK_SNDBUF(b);
    const auto capacity=uint32_t(b->frames);
    auto frames=[&](float value){return uint32_t(std::clamp(std::round(double(tape::Engine::finite(value))*FULLRATE),1.,double(capacity)));};
    const auto period=frames(IN0(3));const bool running=IN0(6)>0;
    if(IN0(7)!=unit->lastClear){unit->engine.clear();unit->lastClear=IN0(7);}
    if(unit->engine.clearing){
        const auto begin=unit->engine.clearPosition;unit->engine.clearChunk(b->data,capacity,unit->channels);
        channelsBins(unit,b,begin,std::min(begin+4096,capacity)-1);
    }else if(running){
        const auto first=unit->engine.position;
        for(int i=0;i<n;i++)unit->engine.step(b->data,capacity,unit->channels,unit->slots,IN0(4),IN0(5),true,
            [&](uint32_t ch){const auto input=8+ch;return INRATE(input)==calc_FullRate?IN(input)[i]:IN0(input);},
            [&](uint32_t h){return int(IN0(8+unit->channels*2+h));},
            [&](uint32_t h){return frames(IN0(8+unit->channels*2+unit->slots+h));},
            [&](uint32_t h,uint32_t ch){return IN0(8+unit->channels*2+unit->slots*2+h*unit->channels+ch);},
            [&](uint32_t h,float value){OUT(h)[i]=value;});
        // A block can wrap multiple times when using very small rings.
        if(uint32_t(n)>=capacity)channelsBins(unit,b,0,capacity-1);
        else if(first+uint32_t(n)>=capacity){channelsBins(unit,b,first,capacity-1);if(unit->engine.position)channelsBins(unit,b,0,unit->engine.position-1);}
        else channelsBins(unit,b,first,unit->engine.position-1);
    }
    unit->clock+=n;if(unit->clock>=uint32_t(FULLRATE/20)){unit->clock=0;channelsPublish(unit,b,period,running);}
}
static void UnifiedTapeChannels_Ctor(UnifiedTapeChannels* unit){
    unit->engine=tape::ChannelEngine{};unit->channels=unit->slots=unit->sequence=unit->clock=0;unit->lastClear=0;
    unit->entry=nullptr;unit->back=nullptr;unit->envelope=nullptr;unit->ready=false;
    SETCALC(UnifiedTapeChannels_next);
    for(int h=0;h<unit->mNumOutputs;h++)OUT0(h)=0;
    const int channels=int(IN0(1)),slots=int(IN0(2));
    if(channels<1||channels>32||slots<0||unit->mNumInputs!=8+channels*2+slots*2+slots*channels||unit->mNumOutputs!=std::max(1,slots)){Print("UnifiedTapeChannels: invalid compiled layout\n");return;}
    unit->channels=channels;unit->slots=slots;
    unit->entry=static_cast<Entry**>(RTAlloc(unit->mWorld,sizeof(Entry*)*channels));
    unit->back=static_cast<uint32_t*>(RTAlloc(unit->mWorld,sizeof(uint32_t)*channels));
    unit->envelope=static_cast<float*>(RTAlloc(unit->mWorld,sizeof(float)*channels*BINS*2));
    if(unit->entry)std::fill(unit->entry,unit->entry+channels,nullptr);
    if(!unit->entry||!unit->back||!unit->envelope){Print("UnifiedTapeChannels: RT allocation failed\n");return;}
    std::fill(unit->back,unit->back+channels,2u);std::fill(unit->envelope,unit->envelope+channels*BINS*2,0.f);
    for(int ch=0;ch<channels;ch++){
        const auto id=uint32_t(IN0(8+channels+ch));Entry* found=nullptr;
        for(auto& e:entries)if(e.memory&&e.world==unit->mWorld&&e.id==id&&e.users==0)found=&e;
        for(int earlier=0;earlier<ch;earlier++)if(unit->entry[earlier]==found)found=nullptr;
        if(!found){std::fill(unit->entry,unit->entry+channels,nullptr);Print("UnifiedTapeChannels: distinct available waveform regions required\n");return;}
        unit->entry[ch]=found;
    }
    for(int ch=0;ch<channels;ch++)++unit->entry[ch]->users;
    unit->ready=true;
}
static void UnifiedTapeChannels_Dtor(UnifiedTapeChannels* unit){
    if(unit->ready)for(uint32_t ch=0;ch<unit->channels;ch++)--unit->entry[ch]->users;
    if(unit->entry)RTFree(unit->mWorld,unit->entry);if(unit->back)RTFree(unit->mWorld,unit->back);if(unit->envelope)RTFree(unit->mWorld,unit->envelope);
}
