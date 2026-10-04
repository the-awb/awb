#include <node_api.h>
#include "shared.hpp"
#include <sys/mman.h>
#include <sys/stat.h>
#include <fcntl.h>
#include <unistd.h>
#include <stdexcept>
#include <cstring>
using namespace loopview;
struct Reader { Shared* memory=nullptr;uint32_t front=0; };
static void closeReader(Reader* r){if(r->memory){r->memory->readerClaim.store(0,std::memory_order_release);munmap(r->memory,sizeof(Shared));r->memory=nullptr;}}
static void finalize(napi_env,void* raw,void*){auto* r=static_cast<Reader*>(raw);closeReader(r);delete r;}
static napi_value fail(napi_env env,const char* message){napi_throw_error(env,nullptr,message);return nullptr;}
static napi_value attach(napi_env env,napi_callback_info info){
 size_t argc=1;napi_value argv[1];napi_get_cb_info(env,info,&argc,argv,nullptr,nullptr);uint32_t id=0;
 if(argc!=1 || napi_get_value_uint32(env,argv[0],&id)!=napi_ok || !id)return fail(env,"Expected shared ID");
 char n[32];name(n,sizeof(n),id);int fd=shm_open(n,O_RDWR,0);if(fd<0)return fail(env,"Shared region unavailable");
 struct stat st{};if(fstat(fd,&st) || st.st_size<sizeof(Shared)){close(fd);return fail(env,"Shared region size mismatch");}
 void* p=mmap(nullptr,sizeof(Shared),PROT_READ|PROT_WRITE,MAP_SHARED,fd,0);close(fd);
 if(p==MAP_FAILED)return fail(env,"Cannot map shared region");auto* m=static_cast<Shared*>(p);
 if(m->magic!=MAGIC || m->version!=VERSION || m->bytes!=sizeof(Shared) || m->generation!=id || !m->alive.load(std::memory_order_acquire)){munmap(p,sizeof(Shared));return fail(env,"Shared region not ready or incompatible");}
 uint32_t expected=0;if(!m->readerClaim.compare_exchange_strong(expected,1)){munmap(p,sizeof(Shared));return fail(env,"Shared region already has a reader");}
 auto* r=new Reader{m,m->readerFront.load(std::memory_order_relaxed)};napi_value result;napi_create_external(env,r,finalize,nullptr,&result);return result;
}
static Reader* getReader(napi_env env,napi_callback_info info){size_t argc=1;napi_value argv[1];napi_get_cb_info(env,info,&argc,argv,nullptr,nullptr);void* r=nullptr;if(argc!=1 || napi_get_value_external(env,argv[0],&r)!=napi_ok){fail(env,"Expected reader handle");return nullptr;}return static_cast<Reader*>(r);}
static napi_value detach(napi_env env,napi_callback_info info){auto* r=getReader(env,info);if(!r)return nullptr;closeReader(r);napi_value v;napi_get_undefined(env,&v);return v;}
static void number(napi_env env,napi_value obj,const char* key,double n){napi_value v;napi_create_double(env,n,&v);napi_set_named_property(env,obj,key,v);}
static napi_value read(napi_env env,napi_callback_info info){
 auto* r=getReader(env,info);if(!r)return nullptr;napi_value result;napi_get_null(env,&result);
 if(!r->memory)return fail(env,"Reader detached");auto* m=r->memory;
 if(!m->alive.load(std::memory_order_acquire))return fail(env,"Server detached shared region");
 if(!(m->middle.load(std::memory_order_acquire)&DIRTY))return result;
 r->front=m->middle.exchange(r->front,std::memory_order_acq_rel)&3u;
 m->readerFront.store(r->front,std::memory_order_relaxed);
 const auto& s=m->slots[r->front];napi_create_object(env,&result);
 number(env,result,"sequence",s.sequence);number(env,result,"frames",s.frames);number(env,result,"position",s.position);number(env,result,"recorded",s.recorded);number(env,result,"flags",s.flags);number(env,result,"sampleRate",s.sampleRate);number(env,result,"peak",s.peak);number(env,result,"generation",m->generation);
 void* data;napi_value buffer,array;napi_create_arraybuffer(env,sizeof(s.envelope),&data,&buffer);memcpy(data,s.envelope,sizeof(s.envelope));napi_create_typedarray(env,napi_float32_array,BINS*2,buffer,0,&array);napi_set_named_property(env,result,"envelope",array);return result;
}
static napi_value init(napi_env env,napi_value exports){napi_property_descriptor props[]={{"attach",0,attach,0,0,0,napi_default,0},{"read",0,read,0,0,0,napi_default,0},{"detach",0,detach,0,0,0,napi_default,0}};napi_define_properties(env,exports,3,props);return exports;}
NAPI_MODULE(NODE_GYP_MODULE_NAME,init)
