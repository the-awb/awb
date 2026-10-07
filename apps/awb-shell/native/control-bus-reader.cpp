#include <node_api.h>
#include <memory>
#include <cmath>
#include <stdexcept>
#include "server_shm.hpp"
struct Reader { std::unique_ptr<server_shared_memory_client> client; uint32_t capacity; };
static napi_value fail(napi_env e,const char* m){napi_throw_error(e,nullptr,m);return nullptr;}
static const napi_type_tag reader_tag={0x56a31abce763412dULL,0xa3c5e78d90b1274fULL};
static bool is_reader(napi_env e,napi_value v){bool valid=false;return napi_check_object_type_tag(e,v,&reader_tag,&valid)==napi_ok&&valid;}
static void finalize(napi_env,void* p,void*){delete static_cast<Reader*>(p);}
static bool integer(napi_env e,napi_value v,uint32_t* out,uint32_t max){double d; if(napi_get_value_double(e,v,&d)!=napi_ok||!std::isfinite(d)||d<1||d>max||std::floor(d)!=d)return false;*out=static_cast<uint32_t>(d);return true;}
static napi_value attach(napi_env e,napi_callback_info info){
 size_t n=2;napi_value a[2];uint32_t port,count;napi_get_cb_info(e,info,&n,a,nullptr,nullptr);
 if(n!=2||!integer(e,a[0],&port,65535)||!integer(e,a[1],&count,65536))return fail(e,"Invalid port/capacity");
 try{
   const auto name=detail_server_shm::make_shmem_name(port);
   boost::interprocess::managed_shared_memory check(boost::interprocess::open_only,name.c_str());
   auto object=check.find<detail_server_shm::server_shared_memory>(name.c_str()).first;
   if(!object||check.get_segment_manager()->size(object->get_control_busses())<size_t(count)*sizeof(float))throw std::runtime_error("Reported capacity exceeds native control allocation");
   auto r=std::make_unique<Reader>();r->capacity=count;r->client=std::make_unique<server_shared_memory_client>(port);napi_value v;napi_create_external(e,r.release(),finalize,nullptr,&v);napi_type_tag_object(e,v,&reader_tag);return v;}catch(const std::exception& x){return fail(e,x.what());}
}
static napi_value read(napi_env e,napi_callback_info info){
 size_t n=2;napi_value a[2],buffer,result;void* raw=nullptr,*data=nullptr;size_t len,offset;napi_typedarray_type type;
 napi_get_cb_info(e,info,&n,a,nullptr,nullptr);
 if(n!=2||!is_reader(e,a[0])||napi_get_value_external(e,a[0],&raw)!=napi_ok||napi_get_typedarray_info(e,a[1],&type,&len,&data,&buffer,&offset)!=napi_ok||type!=napi_uint32_array||len>4096)return fail(e,"Expected reader and bounded Uint32 indices");
 auto r=static_cast<Reader*>(raw);if(!r->client)return fail(e,"Reader detached");auto indices=static_cast<uint32_t*>(data);
 for(size_t i=0;i<len;i++)if(indices[i]>=r->capacity)return fail(e,"Bus index out of bounds");
 float* copy=nullptr;napi_create_arraybuffer(e,len*sizeof(float),reinterpret_cast<void**>(&copy),&buffer);
 volatile const float* source=r->client->get_control_busses();
 for(size_t i=0;i<len;i++)copy[i]=source[indices[i]];
 napi_create_typedarray(e,napi_float32_array,len,buffer,0,&result);return result;
}
static napi_value detach(napi_env e,napi_callback_info info){size_t n=1;napi_value a[1],v;void* raw=nullptr;napi_get_cb_info(e,info,&n,a,nullptr,nullptr);if(n!=1||!is_reader(e,a[0])||napi_get_value_external(e,a[0],&raw)!=napi_ok)return fail(e,"Expected reader");static_cast<Reader*>(raw)->client.reset();napi_get_undefined(e,&v);return v;}
static napi_value init(napi_env e,napi_value exports){napi_property_descriptor p[]={{"attach",0,attach,0,0,0,napi_default,0},{"read",0,read,0,0,0,napi_default,0},{"detach",0,detach,0,0,0,napi_default,0}};napi_define_properties(e,exports,3,p);return exports;}
NAPI_MODULE(NODE_GYP_MODULE_NAME,init)
