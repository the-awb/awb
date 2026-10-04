// Native SC ScopeOut2 consumer. Private single-reader index; JS owns all returned samples.
// Requires matching SuperCollider/Boost shared-memory ABI. SC headers retain their GPL licence.
#include <node_api.h>
#include "server_shm.hpp"
#include <memory>
#include <set>
#include <string>
#include <cmath>
#include <cstring>
static std::set<std::string> claims;
struct Reader { std::unique_ptr<server_shared_memory_client> client; scope_buffer_reader scope;
 std::string claim; unsigned channels=0, frames=512, stride=1024; double end=0; bool seen=false, warmSeen=false; double warmEnd=0; };
static void close(Reader* r){if(r->client){claims.erase(r->claim);r->client.reset();}}
static void finalise(napi_env,void* raw,void*){auto*r=static_cast<Reader*>(raw);close(r);delete r;}
static napi_value fail(napi_env e,const char*m){napi_throw_error(e,nullptr,m);return nullptr;}
static Reader* get(napi_env e,napi_callback_info info){size_t n=1;napi_value a[1];void*raw=nullptr;napi_get_cb_info(e,info,&n,a,nullptr,nullptr);if(n!=1||napi_get_value_external(e,a[0],&raw)!=napi_ok){fail(e,"Expected SC bus reader");return nullptr;}return static_cast<Reader*>(raw);}
static void number(napi_env e,napi_value o,const char*k,double x){napi_value v;napi_create_double(e,x,&v);napi_set_named_property(e,o,k,v);}
static napi_value attach(napi_env e,napi_callback_info info){
 size_t n=4;napi_value a[4];uint32_t port=0,index=0,channels=0,frames=512;napi_get_cb_info(e,info,&n,a,nullptr,nullptr);
 if((n!=3&&n!=4)||napi_get_value_uint32(e,a[0],&port)!=napi_ok||port<1||port>65535||napi_get_value_uint32(e,a[1],&index)!=napi_ok||index>=128||napi_get_value_uint32(e,a[2],&channels)!=napi_ok||channels<1||channels>16||n==4&&(napi_get_value_uint32(e,a[3],&frames)!=napi_ok||(frames!=512&&frames!=32)))return fail(e,"Invalid SC bus reader dimensions");
 auto claim=std::to_string(port)+":"+std::to_string(index);if(claims.count(claim))return fail(e,"Scope already has a reader");
 try{auto r=std::make_unique<Reader>();r->client=std::make_unique<server_shared_memory_client>(port);r->scope=r->client->get_scope_buffer_reader(index);
 if(!r->scope.valid()||r->scope.channels()!=channels+1||r->scope.max_frames()!=(frames==32?256:1024))return fail(e,"SC bus scope format mismatch");
 r->channels=channels;r->frames=frames;r->stride=frames==32?256:1024;r->claim=claim;claims.insert(claim);napi_value v;napi_create_external(e,r.release(),finalise,nullptr,&v);return v;
 }catch(const std::exception&x){return fail(e,x.what());}
}
static napi_value read(napi_env e,napi_callback_info info){auto*r=get(e,info);if(!r)return nullptr;if(!r->client)return fail(e,"SC bus reader detached");
 napi_value v;napi_get_null(e,&v);unsigned frames=0;if(!r->scope.pull(frames)||!frames)return v;
 // A reused scope can expose its preceding writer's cached block before first publication.
 if(frames!=r->frames){if(!r->seen)return v;return fail(e,"Unexpected SC bus capture length");}
 const float*src=r->scope.data();float tick=src[r->channels*r->stride+frames-1];
 if(!std::isfinite(tick)||tick<0||tick>=4194304||tick!=std::floor(tick)){
  // Reallocated storage may still carry an old writer's cached publication.
  // Wait for two valid advancing clocks before exposing any samples.
  if(!r->seen){r->warmSeen=false;return v;}
  return fail(e,"Invalid SC bus clock");
 }
 double end=double(tick)+1;
 if(!r->seen){
  const double advance=r->warmSeen?std::fmod(end-r->warmEnd+4194304.0,4194304.0):0;
  r->warmEnd=end;
  if(!r->warmSeen||advance==0||advance>2097152){r->warmSeen=true;return v;}
 }
 double delta=r->seen?std::fmod(end-std::fmod(r->end,4194304.0)+4194304.0,4194304.0):end;
 if(r->seen&&delta==0)return v;r->end=r->seen?r->end+delta:end;r->seen=true;
 napi_create_object(e,&v);number(e,v,"frames",frames);number(e,v,"channels",r->channels);number(e,v,"sourceEnd",r->end);
 napi_value buffer,samples;float*copy=nullptr;napi_create_arraybuffer(e,frames*r->channels*sizeof(float),reinterpret_cast<void**>(&copy),&buffer);
 for(unsigned ch=0;ch<r->channels;ch++)std::memcpy(copy+ch*frames,src+ch*r->stride,frames*sizeof(float));
 napi_create_typedarray(e,napi_float32_array,frames*r->channels,buffer,0,&samples);napi_set_named_property(e,v,"samples",samples);return v;
}
static napi_value detach(napi_env e,napi_callback_info i){auto*r=get(e,i);if(!r)return nullptr;close(r);napi_value v;napi_get_undefined(e,&v);return v;}
static napi_value init(napi_env e,napi_value exports){napi_property_descriptor p[]={{"attach",0,attach,0,0,0,napi_default,0},{"read",0,read,0,0,0,napi_default,0},{"detach",0,detach,0,0,0,napi_default,0}};napi_define_properties(e,exports,3,p);return exports;}
NAPI_MODULE(NODE_GYP_MODULE_NAME,init)
