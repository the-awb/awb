// SC's built-in ScopeOut2 transport; one Node reader per language-allocated scope.
// JS receives copies only. Qt/browser viewers must not attach to these same indices.
#include <node_api.h>
#include <memory>
#include <string>
#include <vector>
#include <set>
#include <cmath>
#include <cstring>
#include "server_shm.hpp"

static std::set<std::string> claims;
struct SnapshotCache { const float* data=nullptr;unsigned frames=0,step=0;double sourceEnd=0;napi_ref value=nullptr; };
struct Reader {
 napi_env env;
 SnapshotCache micCache,outputCache,controlCache;
 std::unique_ptr<server_shared_memory_client> client;
 scope_buffer_reader mic, output, control;
 bool hasControl=false;
 unsigned micStep=1,outStep=1,controlStep=1;
 std::string claim;
 uint32_t sequence=0;
};
static void closeReader(Reader* r) {
 for(auto* cache:{&r->micCache,&r->outputCache,&r->controlCache})if(cache->value){napi_delete_reference(r->env,cache->value);cache->value=nullptr;}
 if(r->client) {claims.erase(r->claim);r->client.reset();}
}
static void finalize(napi_env,void* raw,void*) {auto* r=static_cast<Reader*>(raw);closeReader(r);delete r;}
static napi_value fail(napi_env env,const char* message) {napi_throw_error(env,nullptr,message);return nullptr;}
static Reader* getReader(napi_env env,napi_callback_info info) {
 size_t argc=1;napi_value args[1];void* raw=nullptr;
 napi_get_cb_info(env,info,&argc,args,nullptr,nullptr);
 if(argc!=1||napi_get_value_external(env,args[0],&raw)!=napi_ok) {fail(env,"Expected scope reader");return nullptr;}
 return static_cast<Reader*>(raw);
}
static napi_value attach(napi_env env,napi_callback_info info) {
 size_t argc=4;napi_value args[4];uint32_t port=0,mic=0,output=0,control=0;
 napi_get_cb_info(env,info,&argc,args,nullptr,nullptr);
 if((argc!=3&&argc!=4)||napi_get_value_uint32(env,args[0],&port)!=napi_ok||port<1||port>65535
    ||napi_get_value_uint32(env,args[1],&mic)!=napi_ok||mic>=128
    ||napi_get_value_uint32(env,args[2],&output)!=napi_ok||output>=128||mic==output
    ||(argc==4&&(napi_get_value_uint32(env,args[3],&control)!=napi_ok||control>=128||control==mic||control==output)))
  return fail(env,"Expected local SC port and two distinct scope indices");
 const auto claim=std::to_string(port)+":"+std::to_string(mic)+":"+std::to_string(output)+(argc==4?":"+std::to_string(control):"");
 if(claims.count(claim))return fail(env,"Scopes already have a Node reader");
 try {
  auto r=std::make_unique<Reader>();r->env=env;
  r->client=std::make_unique<server_shared_memory_client>(port);
  r->mic=r->client->get_scope_buffer_reader(mic);r->output=r->client->get_scope_buffer_reader(output);
  if(argc==4){r->control=r->client->get_scope_buffer_reader(control);r->hasControl=true;}
  if(!r->mic.valid()||!r->output.valid()||(r->hasControl&&!r->control.valid()))return fail(env,"Scope buffer unavailable");
  if(r->mic.channels()!=2||r->output.channels()!=3||r->mic.max_frames()>2048||r->output.max_frames()>2048
     ||(r->hasControl&&(r->control.channels()!=7||r->control.max_frames()>256)))
   return fail(env,"Scope format mismatch");
  r->claim=claim;claims.insert(claim);napi_value value;
  napi_create_external(env,r.release(),finalize,nullptr,&value);return value;
 } catch(const std::exception& e) {return fail(env,e.what());}
}
static void number(napi_env env,napi_value obj,const char* key,double n) {
 napi_value value;napi_create_double(env,n,&value);napi_set_named_property(env,obj,key,value);
}
static napi_value snapshot(napi_env env,scope_buffer_reader& reader,SnapshotCache& cache,uint32_t sequence,unsigned step) {
 napi_value value;napi_get_null(env,&value);
 if(!reader.valid())return value;
 unsigned sourceFrames=0;if(!reader.pull(sourceFrames)||!sourceFrames)return value;
 const unsigned channels=reader.channels()-1,stride=reader.max_frames();
 if(sourceFrames>stride||stride>2048||channels<1||channels>6)return fail(env,"Scope dimensions exceeded bounds");
 const float* source=reader.data();
 // pull() keeps the same read slot until a completed publication arrives.
 // That slot is exclusively held by this reader; cached JS storage is independently owned.
 if(cache.value&&cache.data==source&&cache.frames==sourceFrames&&cache.step==step){napi_get_reference_value(env,cache.value,&value);return value;}
 const float tick=source[channels*stride+sourceFrames-1];
 if(!std::isfinite(tick)||tick<0||tick>=4194304||tick!=std::floor(tick))return fail(env,"Invalid scope source clock");
 if(sourceFrames%step)return fail(env,"Scope chunk is not aligned to reduction step");
 const double end=double(tick)+1;
 if(!cache.value)cache.sourceEnd=end;
 else if(cache.data!=source||cache.frames!=sourceFrames){
  const double delta=std::fmod(end-std::fmod(cache.sourceEnd,4194304.0)+4194304.0,4194304.0);
  cache.sourceEnd+=delta;
 }
 const bool bucketed=step>1;
 const unsigned frames=sourceFrames/step,values=bucketed?2:1;
 napi_create_object(env,&value);number(env,value,"frames",frames);number(env,value,"sourceFrames",sourceFrames);
 number(env,value,"sourceEnd",cache.sourceEnd);
 number(env,value,"channels",channels);number(env,value,"sequence",sequence);
 napi_value format;napi_create_string_utf8(env,bucketed?"minmax":"samples",NAPI_AUTO_LENGTH,&format);
 napi_set_named_property(env,value,"format",format);
 napi_value buffer,samples,peaks,rms;float* copy=nullptr;
 napi_create_arraybuffer(env,frames*channels*values*sizeof(float),reinterpret_cast<void**>(&copy),&buffer);
 napi_create_typedarray(env,napi_float32_array,frames*channels*values,buffer,0,&samples);
 napi_create_array_with_length(env,channels,&peaks);napi_create_array_with_length(env,channels,&rms);
 for(unsigned ch=0;ch<channels;++ch) {
  double squares=0,peak=0;
  for(unsigned bin=0;bin<frames;++bin){
   const unsigned start=bin*sourceFrames/frames,end=(bin+1)*sourceFrames/frames;
   float low=INFINITY,high=-INFINITY;
   for(unsigned f=start;f<end;++f){
    float sample=source[ch*stride+f];if(!std::isfinite(sample))sample=0;
    low=std::min(low,sample);high=std::max(high,sample);
    peak=std::max(peak,double(std::abs(sample)));squares+=double(sample)*sample;
   }
   const unsigned at=(ch*frames+bin)*values;
   copy[at]=low;if(bucketed)copy[at+1]=high;
  }
  napi_value p,r;napi_create_double(env,peak,&p);napi_create_double(env,std::sqrt(squares/sourceFrames),&r);
  napi_set_element(env,peaks,ch,p);napi_set_element(env,rms,ch,r);
 }
 napi_set_named_property(env,value,"samples",samples);napi_set_named_property(env,value,"peaks",peaks);
 napi_set_named_property(env,value,"rms",rms);
 if(cache.value)napi_delete_reference(env,cache.value);
 napi_create_reference(env,value,1,&cache.value);cache.data=source;cache.frames=sourceFrames;cache.step=step;return value;
}
static napi_value read(napi_env env,napi_callback_info info) {
 auto* r=getReader(env,info);if(!r)return nullptr;if(!r->client)return fail(env,"Scope reader detached");
 napi_value result;napi_create_object(env,&result);++r->sequence;
 auto mic=snapshot(env,r->mic,r->micCache,r->sequence,r->micStep),output=snapshot(env,r->output,r->outputCache,r->sequence,r->outStep);
 if(!mic||!output)return nullptr;
 napi_set_named_property(env,result,"mic",mic);napi_set_named_property(env,result,"output",output);
 if(r->hasControl){auto control=snapshot(env,r->control,r->controlCache,r->sequence,r->controlStep);if(!control)return nullptr;napi_set_named_property(env,result,"control",control);}
 return result;
}
static napi_value setReduction(napi_env env,napi_callback_info info){
 size_t argc=3;napi_value args[3];void* raw=nullptr;uint32_t kind=0,step=0;
 napi_get_cb_info(env,info,&argc,args,nullptr,nullptr);
 if(argc!=3||napi_get_value_external(env,args[0],&raw)!=napi_ok||napi_get_value_uint32(env,args[1],&kind)!=napi_ok||kind>2||napi_get_value_uint32(env,args[2],&step)!=napi_ok||(step!=1&&step!=4&&step!=16))return fail(env,"Expected scope kind and reduction step 1/4/16");
 auto* r=static_cast<Reader*>(raw);if(!r->client)return fail(env,"Scope reader detached");
 if(kind==0)r->micStep=step;else if(kind==1)r->outStep=step;else r->controlStep=step;
 napi_value value;napi_get_undefined(env,&value);return value;
}
static napi_value detach(napi_env env,napi_callback_info info) {
 auto* r=getReader(env,info);if(!r)return nullptr;closeReader(r);napi_value value;napi_get_undefined(env,&value);return value;
}
static napi_value init(napi_env env,napi_value exports) {
 napi_property_descriptor props[]={{"setReduction",0,setReduction,0,0,0,napi_default,0},{"attach",0,attach,0,0,0,napi_default,0},{"read",0,read,0,0,0,napi_default,0},{"detach",0,detach,0,0,0,napi_default,0}};
 napi_define_properties(env,exports,4,props);return exports;
}
NAPI_MODULE(NODE_GYP_MODULE_NAME,init)
