#include "SC_PlugIn.h"
#include "shared.hpp"
#include <sys/mman.h>
#include <sys/stat.h>
#include <fcntl.h>
#include <unistd.h>
#include <algorithm>
#include <cmath>
#include <new>
#include <cstring>
using namespace loopview;
static InterfaceTable* ft;
struct Entry { World* world=nullptr; uint32_t id=0, users=0; Shared* memory=nullptr; };
static Entry entries[16];
struct Command { Entry* entry; Shared* memory; uint32_t id; bool release; };
static void destroyMapping(Shared* m,uint32_t id) {
 if(!m) return;
 m->alive.store(0,std::memory_order_release);
 munmap(m,sizeof(Shared)); char n[32]; name(n,sizeof(n),id); shm_unlink(n);
}
static bool allocateNRT(World*,void* raw) {
 auto* c=static_cast<Command*>(raw); char n[32]; name(n,sizeof(n),c->id);
 int fd=shm_open(n,O_CREAT|O_EXCL|O_RDWR,0600);
 if(fd<0) { Print("SharedLooper: shm_open failed for %s\n",n); return false; }
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
 if(c->entry->users) { Print("SharedLooper: cannot free while UGen is active\n"); return false; }
 c->memory=c->entry->memory; c->entry->memory=nullptr; c->entry->world=nullptr; return true;
}
static bool freeNRT(World*,void* raw) {
 auto* c=static_cast<Command*>(raw); destroyMapping(c->memory,c->id); return true;
}
static void cleanupRT(World* world,void* raw) { auto* c=static_cast<Command*>(raw); if(!c->release && !c->memory)c->entry->world=nullptr; RTFree(world,raw); }
static void command(World* world,void* user,sc_msg_iter* args,void* reply) {
 bool release=user!=nullptr; int value=args->geti();
 if(value<=0) { Print("SharedLooper: invalid shared ID\n"); return; }
 Entry* entry=nullptr;
 for(auto& e:entries) if(e.memory && e.id==uint32_t(value)) { if(release && e.world==world) entry=&e; else { Print("SharedLooper: ID in use\n"); return; } }
 if(!release) for(auto& e:entries) if(!e.world) { entry=&e; break; }
 if(!entry) { Print("SharedLooper: no matching/free entry\n"); return; }
 // Reserve before the asynchronous allocation so overlapping commands cannot choose this slot.
 if(!release) entry->world=world;
 auto* c=static_cast<Command*>(RTAlloc(world,sizeof(Command))); if(!c) { if(!release)entry->world=nullptr;return; }
 *c={entry,nullptr,uint32_t(value),release};
 DoAsynchronousCommand(world,reply,release?"loop_view_free":"loop_view_alloc",c,
  release?nullptr:allocateNRT,release?removeRT:installRT,release?freeNRT:readyNRT,cleanupRT,0,nullptr);
}
struct SharedLooper:Unit {
 Entry* entry; uint32_t back,sequence,position,recorded,clearPosition,clock;
 bool recording,clearing,hasLoop; float lastRecord,lastClear;
 float envelope[BINS*2];
};
static void publish(SharedLooper* unit,SndBuf* b,bool play,bool dub,float peak) {
 Shared* m=unit->entry->memory; auto& s=m->slots[unit->back];
 s.sequence=++unit->sequence;s.frames=b->frames;s.position=unit->position;s.recorded=unit->recorded;
 s.flags=(unit->recording?1u:0u)|(play?2u:0u)|(dub?4u:0u)|(unit->clearing?8u:0u)|(unit->hasLoop?16u:0u);
 s.sampleRate=float(FULLRATE);s.peak=peak;
 memcpy(s.envelope,unit->envelope,sizeof(unit->envelope));
 unit->back=m->middle.exchange(unit->back|DIRTY,std::memory_order_acq_rel)&3u;
}
static void updateBins(SharedLooper* unit,SndBuf* b,uint32_t first,uint32_t last) {
 uint32_t width=(b->frames+BINS-1)/BINS;
 for(uint32_t bin=first/width;bin<=std::min(last/width,BINS-1);++bin) {
  uint32_t start=bin*width,end=std::min(start+width,uint32_t(b->frames));
  if(unit->recording)end=std::min(end,unit->recorded);
  float lo=0,hi=0;
  if(start<end) { lo=hi=b->data[start]; for(uint32_t f=start+1;f<end;++f){lo=std::min(lo,b->data[f]);hi=std::max(hi,b->data[f]);} }
  unit->envelope[bin*2]=lo;unit->envelope[bin*2+1]=hi;
 }
}
static void SharedLooper_next(SharedLooper* unit,int n) {
 float* out=OUT(0);std::fill(out,out+n,0.f);
 int index=int(IN0(1));
 if(!unit->entry || !unit->entry->memory || index<0 || uint32_t(index)>=unit->mWorld->mNumSndBufs)return;
 SndBuf* b=unit->mWorld->mSndBufs+index;
 if(!b->data || b->channels!=1 || b->frames<512 || b->frames>uint32_t(FULLRATE*8))return;
 bool recordEdge=IN0(3)>0 && unit->lastRecord<=0,clearEdge=IN0(6)>0 && unit->lastClear<=0;
 unit->lastRecord=IN0(3);unit->lastClear=IN0(6);
 if(clearEdge) {unit->clearing=true;unit->recording=false;unit->hasLoop=false;unit->clearPosition=0;unit->position=0;unit->recorded=0;memset(unit->envelope,0,sizeof(unit->envelope));}
 if(recordEdge && !unit->clearing){unit->recording=true;unit->hasLoop=false;unit->position=0;unit->recorded=0;memset(unit->envelope,0,sizeof(unit->envelope));}
 bool play=IN0(4)>0 && unit->hasLoop && !unit->clearing && !unit->recording;
 bool dub=play && IN0(5)>0;
 float feedback=std::clamp(IN0(7),0.f,1.f),gain=std::clamp(IN0(8),0.f,2.f),level=std::clamp(IN0(9),0.f,1.f),peak=0;
 if(unit->clearing) {
  uint32_t end=std::min(unit->clearPosition+4096,uint32_t(b->frames));std::fill(b->data+unit->clearPosition,b->data+end,0.f);
  unit->clearPosition=end;if(end==b->frames)unit->clearing=false;
 } else if(unit->recording || play) {
  uint32_t first=unit->position;bool wrapped=false;
  for(int i=0;i<n;++i) {
   uint32_t pos=unit->position;float input=IN(0)[i]*gain;
   if(!std::isfinite(input))input=0;
   if(unit->recording) {b->data[pos]=std::clamp(input,-1.f,1.f);++unit->recorded;}
   else if(dub)b->data[pos]=std::clamp(b->data[pos]*feedback+input,-1.f,1.f);
   if(play)out[i]=b->data[pos]*level;
   peak=std::max(peak,std::abs(input));
   if(++unit->position==b->frames) {
    unit->position=0;wrapped=true;
    if(unit->recording){updateBins(unit,b,first,b->frames-1);unit->recording=false;unit->hasLoop=true;break;}
   }
  }
  if(unit->recording || dub) {
   if(wrapped){updateBins(unit,b,first,b->frames-1);if(unit->position)updateBins(unit,b,0,unit->position-1);}
   else if(unit->position>first)updateBins(unit,b,first,unit->position-1);
  }
 }
 unit->clock+=n;
 if(unit->clock>=uint32_t(FULLRATE/30)){unit->clock=0;publish(unit,b,play,dub,peak);}
}
static void SharedLooper_Ctor(SharedLooper* unit) {
 unit->entry=nullptr;unit->back=2;unit->sequence=unit->position=unit->recorded=unit->clearPosition=unit->clock=0;
 unit->recording=unit->clearing=unit->hasLoop=false;unit->lastRecord=unit->lastClear=0;memset(unit->envelope,0,sizeof(unit->envelope));
 uint32_t id=uint32_t(IN0(2));
 for(auto& e:entries)if(e.memory && e.world==unit->mWorld && e.id==id && e.users==0){unit->entry=&e;++e.users;break;}
 if(!unit->entry)Print("SharedLooper: shared ID absent or already has a writer\n");
 SETCALC(SharedLooper_next);OUT0(0)=0;
}
static void SharedLooper_Dtor(SharedLooper* unit){if(unit->entry)--unit->entry->users;}
PluginLoad(SharedLooper){ft=inTable;DefineDtorCantAliasUnit(SharedLooper);DefinePlugInCmd("loop_view_alloc",command,nullptr);DefinePlugInCmd("loop_view_free",command,reinterpret_cast<void*>(1));}
