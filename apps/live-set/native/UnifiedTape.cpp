#include "SC_PlugIn.h"
#include "shared.hpp"
#include "tape.hpp"
#include "snapshot.hpp"
#include "gesture.hpp"
#include <sys/mman.h>
#include <sys/stat.h>
#include <fcntl.h>
#include <unistd.h>
#include <algorithm>
#include <cmath>
#include <new>
#include <cstring>
using namespace ubview;
static InterfaceTable* ft;
struct Entry { World* world=nullptr; uint32_t id=0, users=0; Shared* memory=nullptr; };
static Entry entries[32];
struct Command { Entry* entry; Shared* memory; uint32_t id; bool release; };
static void destroyMapping(Shared* m,uint32_t id) {
 if(!m) return;
 m->alive.store(0,std::memory_order_release);
 munmap(m,sizeof(Shared)); char n[32]; name(n,sizeof(n),id); shm_unlink(n);
}
static bool allocateNRT(World*,void* raw) {
 auto* c=static_cast<Command*>(raw); char n[32]; name(n,sizeof(n),c->id);
 int fd=shm_open(n,O_CREAT|O_EXCL|O_RDWR,0600);
 if(fd<0) { Print("UnifiedTape: shm_open failed for %s\n",n); return false; }
 if(ftruncate(fd,sizeof(Shared))!=0) { close(fd); shm_unlink(n); return false; }
 void* p=mmap(nullptr,sizeof(Shared),PROT_READ|PROT_WRITE,MAP_SHARED,fd,0); close(fd);
 if(p==MAP_FAILED) { shm_unlink(n); return false; }
 c->memory=new(p) Shared(); c->memory->generation=c->id; return true;
}
static bool installRT(World* world,void* raw) {
 auto* c=static_cast<Command*>(raw);
 c->entry->world=world; c->entry->id=c->id; c->entry->users=0; c->entry->memory=c->memory;
 return true;
}
static bool readyNRT(World*,void* raw) {
 auto* c=static_cast<Command*>(raw); c->memory->alive.store(1,std::memory_order_release); return true;
}
static bool removeRT(World*,void* raw) {
 auto* c=static_cast<Command*>(raw);
 if(c->entry->users) { Print("UnifiedTape: cannot free while UGen is active\n"); return false; }
 c->memory=c->entry->memory; c->entry->memory=nullptr; c->entry->world=nullptr; return true;
}
static bool freeNRT(World*,void* raw) {
 auto* c=static_cast<Command*>(raw); destroyMapping(c->memory,c->id); return true;
}
static void cleanupRT(World* world,void* raw) { auto* c=static_cast<Command*>(raw); if(!c->release && !c->memory)c->entry->world=nullptr; RTFree(world,raw); }
static void command(World* world,void* user,sc_msg_iter* args,void* reply) {
 bool release=user!=nullptr; int value=args->geti();
 if(value<=0) { Print("UnifiedTape: invalid shared ID\n"); return; }
 Entry* entry=nullptr;
 for(auto& e:entries) if(e.memory && e.id==uint32_t(value)) { if(release && e.world==world) entry=&e; else { Print("UnifiedTape: ID in use\n"); return; } }
 if(!release) for(auto& e:entries) if(!e.world) { entry=&e; break; }
 if(!entry) { Print("UnifiedTape: no matching/free entry\n"); return; }
 // Reserve before the asynchronous allocation so overlapping commands cannot choose this slot.
 if(!release) entry->world=world;
 auto* c=static_cast<Command*>(RTAlloc(world,sizeof(Command))); if(!c) { if(!release)entry->world=nullptr;return; }
 *c={entry,nullptr,uint32_t(value),release};
 DoAsynchronousCommand(world,reply,release?"unified_view_free":"unified_view_alloc",c,
  release?nullptr:allocateNRT,release?removeRT:installRT,release?freeNRT:readyNRT,cleanupRT,0,nullptr);
}
struct UnifiedTape:Unit {
 Entry* entry[2]; tape::Engine engine; uint32_t back[2],sequence,clock; float lastClear;
 tape::Snapshot snapshot; float lastTake, activeTake, lastAbort; int takeBuffer;
 tape::Gesture gesture; bool gestureMode;
 float envelope[2][BINS*2];
};
static void updateBins(UnifiedTape* unit,SndBuf* b,uint32_t first,uint32_t last) {
 const uint32_t width=(b->frames+BINS-1)/BINS;
 for(uint32_t bin=first/width;bin<=std::min(last/width,BINS-1);++bin) {
  const uint32_t begin=bin*width,end=std::min(begin+width,uint32_t(b->frames));
  for(int ch=0;ch<2;ch++) {
   float lo=0,hi=0;
   if(begin<end) {lo=hi=b->data[begin*2+ch];for(uint32_t f=begin+1;f<end;f++){const float v=b->data[f*2+ch];lo=std::min(lo,v);hi=std::max(hi,v);}}
   unit->envelope[ch][bin*2]=lo;unit->envelope[ch][bin*2+1]=hi;
  }
 }
}
static void publish(UnifiedTape* unit,SndBuf* b,uint32_t delay,bool running,float peak) {
 ++unit->sequence;
 for(int ch=0;ch<2;ch++) {
  Shared* m=unit->entry[ch]->memory;auto& s=m->slots[unit->back[ch]];
  s.sequence=unit->sequence;s.frames=b->frames;s.position=unit->gestureMode?unit->gesture.position:unit->engine.position;s.recorded=unit->gestureMode?unit->gesture.frames:delay;
  s.flags=(running?2u:0u)|(unit->engine.clearing?8u:0u)|(unit->gestureMode?64u:0u)|
   (unit->gestureMode&&unit->gesture.state==tape::Gesture::Capture?16u:0u)|(unit->gestureMode&&unit->gesture.state==tape::Gesture::Loop?32u:0u)|
   (unit->gestureMode&&unit->gesture.reason==3?128u:0u)|(unit->gestureMode&&unit->gesture.reason==4?256u:0u);
  s.sampleRate=float(FULLRATE);s.peak=peak;
  memcpy(s.envelope,unit->envelope[ch],sizeof(s.envelope));
  unit->back[ch]=m->middle.exchange(unit->back[ch]|DIRTY,std::memory_order_acq_rel)&3u;
 }
}
static void UnifiedTape_next(UnifiedTape* unit,int n) {
 auto* left=OUT(0);auto* right=OUT(1);std::fill(left,left+n,0.f);std::fill(right,right+n,0.f);
 const int index=int(IN0(2));
 if(!unit->entry[0]||!unit->entry[1]||index<0||uint32_t(index)>=unit->mWorld->mNumSndBufs)return;
 SndBuf* b=unit->mWorld->mSndBufs+index;
 if(!b->data||b->channels!=2||b->frames<512)return;
 LOCK_SNDBUF(b);
 const auto capacity=uint32_t(b->frames);
 const auto delay=std::clamp(uint32_t(std::max(1.f,tape::Engine::finite(IN0(5))*float(FULLRATE))),1u,capacity);
 const bool running=IN0(8)>0;
 const bool gestureMode=unit->mNumInputs>=29 && IN0(22)>0;
 if(gestureMode!=unit->gestureMode){
  // Mode changes discard working memory deliberately; retained takes are separate.
  unit->gestureMode=gestureMode;unit->gesture.invalidate();unit->engine.clear();
 }
 // These optional trailing controls preserve the old 18-input DSP contract.
 if(unit->mNumInputs>=21 && IN0(19)!=unit->lastTake) {
  unit->lastTake=IN0(19);
  const int requestedBuffer=int(IN0(18)),count=int(IN0(20));
  if(!unit->snapshot.active && !unit->engine.clearing && IN0(9)==unit->lastClear &&
     (!gestureMode || (unit->mNumInputs>=30 && unit->gesture.state==tape::Gesture::Loop && count==int(unit->gesture.frames) && IN0(29)==float(unit->gesture.generation))) &&
     requestedBuffer>=0 && uint32_t(requestedBuffer)<unit->mWorld->mNumSndBufs && requestedBuffer!=index && count>0 && uint32_t(count)<=capacity) {
   SndBuf* take=unit->mWorld->mSndBufs+requestedBuffer;
   if(take->data && take->channels==2 && take->frames>=count){unit->takeBuffer=requestedBuffer;unit->activeTake=unit->lastTake;unit->snapshot.begin(gestureMode?unit->gesture.frames:unit->engine.position,capacity,count);}
   else {float args[4]={unit->lastTake,0,0,float(requestedBuffer)};SendNodeReply(&unit->mParent->mNode,0,"/ubp/take",4,args);}
  }else {float args[4]={unit->lastTake,0,0,float(requestedBuffer)};SendNodeReply(&unit->mParent->mNode,0,"/ubp/take",4,args);}
 }
 if(unit->snapshot.active) {
  SndBuf* take=unit->mWorld->mSndBufs+unit->takeBuffer;
  const bool cancelled=unit->engine.clearing || IN0(9)!=unit->lastClear || (unit->mNumInputs>=22 && IN0(21)!=unit->lastAbort) || !take->data || take->channels!=2 || uint32_t(take->frames)<unit->snapshot.frames;
  bool complete=false;
  if(!cancelled){LOCK_SNDBUF(take);complete=unit->snapshot.step(b->data,take->data,capacity,uint32_t(n)*8);}
  if(cancelled||complete){unit->snapshot.active=false;float args[4]={unit->activeTake,cancelled?0.f:float(unit->snapshot.frames),float(unit->snapshot.start),float(unit->takeBuffer)};SendNodeReply(&unit->mParent->mNode,0,"/ubp/take",4,args);}
 }
 if(unit->mNumInputs>=22)unit->lastAbort=IN0(21);
 if(IN0(9)!=unit->lastClear){unit->engine.clear();unit->gesture.invalidate();unit->lastClear=IN0(9);}
 float peak=0;
 if(unit->engine.clearing) {
  const auto begin=unit->engine.clearPosition;unit->engine.clearChunk(b->data,capacity);
  updateBins(unit,b,begin,std::min(begin+4096,capacity)-1);
 } else if(running && gestureMode) {
  tape::Gesture::Settings settings;
  settings.high=std::max(.000001f,tape::Engine::finite(IN0(23)));settings.low=std::clamp(tape::Engine::finite(IN0(24)),0.f,settings.high);
  auto frames=[&](int input){return std::clamp(uint32_t(std::lround(std::max(1.f,tape::Engine::finite(IN0(input))*float(FULLRATE)))),1u,capacity);};
  settings.gap=frames(25);settings.minimum=frames(26);settings.maximum=frames(27);
  const auto release=std::max(0.f,tape::Engine::finite(IN0(28)));
  settings.release=release>0?std::exp(-1.f/(release*float(FULLRATE))):0.f;
  bool dirty[BINS]={};const uint32_t width=(capacity+BINS-1)/BINS;
  const bool audioLeft=INRATE(0)==calc_FullRate,audioRight=INRATE(1)==calc_FullRate;
  const bool frozen=unit->snapshot.active;
  for(int i=0;i<n;i++) {
   auto& g=unit->gesture;
   const auto before=g.position;
   g.step(b->data,capacity,audioLeft?IN(0)[i]:IN0(0),audioRight?IN(1)[i]:IN0(1),IN0(6),IN0(7),settings,frozen,left[i],right[i]);
   if(!frozen && g.state!=tape::Gesture::Idle){dirty[std::min(before/width,BINS-1)]=true;dirty[std::min((g.event==1?0u:g.position)/width,BINS-1)]=true;}
   if(g.event){float args[4]={float(g.generation),float(g.state),float(g.frames),float(g.event)};SendNodeReply(&unit->mParent->mNode,0,"/ubp/gesture",4,args);}
   peak=std::max(peak,std::max(std::abs(left[i]),std::abs(right[i])));
  }
  for(uint32_t bin=0;bin<BINS;bin++)if(dirty[bin])updateBins(unit,b,bin*width,std::min(capacity-1,bin*width));
 } else if(running) {
  float fractions[4],weights[4];
  for(int h=0;h<4;h++){fractions[h]=std::clamp(tape::Engine::finite(IN0(10+h)),0.f,1.f);weights[h]=IN0(14+h);}
  const bool audioLeft=INRATE(0)==calc_FullRate,audioRight=INRATE(1)==calc_FullRate;
  const auto first=unit->engine.position;
  for(int i=0;i<n;i++) {
   unit->engine.step(b->data,capacity,audioLeft?IN(0)[i]:IN0(0),audioRight?IN(1)[i]:IN0(1),delay,fractions,weights,IN0(6),IN0(7),true,left[i],right[i]);
   peak=std::max(peak,std::max(std::abs(left[i]),std::abs(right[i])));
  }
  if(first+uint32_t(n)>=capacity){updateBins(unit,b,first,capacity-1);if(unit->engine.position)updateBins(unit,b,0,unit->engine.position-1);}
  else updateBins(unit,b,first,unit->engine.position-1);
 }
 unit->clock+=n;if(unit->clock>=uint32_t(FULLRATE/20)){unit->clock=0;publish(unit,b,delay,running,peak);}
}
static void UnifiedTape_Ctor(UnifiedTape* unit) {
 unit->entry[0]=unit->entry[1]=nullptr;unit->engine=tape::Engine{};unit->back[0]=unit->back[1]=2;unit->sequence=unit->clock=0;unit->lastClear=0;
 unit->snapshot=tape::Snapshot{};unit->lastTake=unit->activeTake=unit->lastAbort=0;unit->takeBuffer=-1;
 unit->gesture=tape::Gesture{};unit->gestureMode=false;
 memset(unit->envelope,0,sizeof(unit->envelope));
 const uint32_t ids[2]={uint32_t(IN0(3)),uint32_t(IN0(4))};Entry* candidates[2]={nullptr,nullptr};
 for(int ch=0;ch<2;ch++)for(auto& e:entries)if(e.memory&&e.world==unit->mWorld&&e.id==ids[ch]&&e.users==0)candidates[ch]=&e;
 if(candidates[0]&&candidates[1]&&candidates[0]!=candidates[1])for(int ch=0;ch<2;ch++){unit->entry[ch]=candidates[ch];++unit->entry[ch]->users;}
 else Print("UnifiedTape: two distinct available waveform regions are required\n");
 SETCALC(UnifiedTape_next);OUT0(0)=OUT0(1)=0;
}
static void UnifiedTape_Dtor(UnifiedTape* unit){for(auto* entry:unit->entry)if(entry)--entry->users;}
#include "channels-plugin.hpp"
PluginLoad(UnifiedTape){ft=inTable;DefineDtorCantAliasUnit(UnifiedTape);DefineDtorCantAliasUnit(UnifiedTapeChannels);DefinePlugInCmd("unified_view_alloc",command,nullptr);DefinePlugInCmd("unified_view_free",command,reinterpret_cast<void*>(1));}
