// Test-only interposer: observes the owned scsynth Core Audio output callback.
// No allocation, file I/O or logging within the real-time callback. No device setters.
#include <CoreAudio/CoreAudio.h>
#include <mach/mach_time.h>
#include <mach/mach.h>
#include <atomic>
#include <algorithm>
#include <array>
#include <cmath>
#include <cstring>
#include <cstdlib>
#include <cstdio>
#include <fcntl.h>
#include <unistd.h>
#include <sys/mman.h>
#include <new>
static constexpr size_t capacity=100000, columns=20, headerBytes=4096;
static double* records=nullptr;
static uint64_t* header=nullptr;
static std::atomic<uint64_t>* published=nullptr;
static std::atomic<unsigned> overloads{0},rates{0},buffers{0};
static double timeFactor=1,rate=0,previous1=0,previous2=0;
static unsigned zeros=0,hwFrames=0,auditChannel=0;static uint64_t sequence=0;
struct Context {AudioDeviceIOProc original;void* user;AudioDeviceID device;AudioDeviceIOProcID id;};
static Context contexts[8];static unsigned contextCount=0;
static uint64_t ns(){return uint64_t(mach_absolute_time()*timeFactor);}
static OSStatus property(AudioObjectID object,UInt32 n,const AudioObjectPropertyAddress* addresses,void*){
 for(unsigned i=0;i<n;i++){if(addresses[i].mSelector==kAudioDeviceProcessorOverload)overloads++;if(addresses[i].mSelector==kAudioDevicePropertyNominalSampleRate)rates++;if(addresses[i].mSelector==kAudioDevicePropertyBufferFrameSize)buffers++;}return noErr;
}
static double* cpuRecords=nullptr;static std::atomic<uint64_t>* cpuPublished=nullptr;static thread_t callbackThread=MACH_PORT_NULL;
static uint64_t threadCPU(kern_return_t& status){thread_basic_info_data_t info{};mach_msg_type_number_t size=THREAD_BASIC_INFO_COUNT;status=thread_info(callbackThread,THREAD_BASIC_INFO,reinterpret_cast<thread_info_t>(&info),&size);return uint64_t(info.user_time.seconds+info.system_time.seconds)*1000000000ull+uint64_t(info.user_time.microseconds+info.system_time.microseconds)*1000ull;}
static OSStatus callback(AudioDeviceID d,const AudioTimeStamp* now,const AudioBufferList* input,const AudioTimeStamp* inputTime,AudioBufferList* output,const AudioTimeStamp* outputTime,void* context){
 auto c=static_cast<Context*>(context);if(callbackThread==MACH_PORT_NULL)callbackThread=mach_thread_self();kern_return_t cpuBeforeStatus=0,cpuAfterStatus=0;auto queryBeforeStart=ns();auto cpuBefore=cpuRecords?threadCPU(cpuBeforeStatus):0;auto queryBeforeEnd=ns();auto start=ns();auto result=c->original(d,now,input,inputTime,output,outputTime,c->user);auto finished=ns();auto cpuAfter=cpuRecords?threadCPU(cpuAfterStatus):0;auto queryAfterEnd=ns();
 if(!records||!output||!output->mNumberBuffers||!output->mBuffers[0].mData||!output->mBuffers[0].mNumberChannels||sequence>=capacity)return result;
 const auto& b=output->mBuffers[0];unsigned channels=b.mNumberChannels,frames=b.mDataByteSize/(sizeof(float)*channels);const float* samples=static_cast<const float*>(b.mData);
 double square=0,peak=0,maxResidual=0;unsigned hits=0,maxZeros=0;double coeff=2*std::cos(2*3.141592653589793*997/rate);
 for(unsigned i=0;i<frames;i++){double x=samples[i*channels+std::min(auditChannel,channels-1)];square+=x*x;peak=std::fmax(peak,std::fabs(x));double residual=std::fabs(x-coeff*previous1+previous2);maxResidual=std::fmax(maxResidual,residual);if(residual>1e-5)hits++;if(std::fabs(x)<1e-9)zeros++;else zeros=0;maxZeros=std::max(maxZeros,zeros);previous2=previous1;previous1=x;}
 double* r=records+sequence*columns;
 r[0]=sequence;r[1]=start;r[2]=outputTime?uint64_t(outputTime->mHostTime*timeFactor):0;r[3]=outputTime?outputTime->mSampleTime:0;r[4]=frames;r[5]=rate;r[6]=finished-start;r[8]=peak;r[9]=std::sqrt(square/frames);r[10]=maxResidual;r[11]=hits;r[12]=maxZeros;r[13]=overloads.load();r[14]=rates.load();r[15]=buffers.load();r[16]=d;r[17]=outputTime?outputTime->mFlags:0;r[18]=hwFrames;r[19]=result;r[7]=ns()-finished;
 if(cpuRecords){double* t=cpuRecords+sequence*5;t[0]=sequence;t[1]=cpuAfter-cpuBefore;t[2]=queryBeforeEnd-queryBeforeStart;t[3]=queryAfterEnd-finished;t[4]=cpuBeforeStatus?cpuBeforeStatus:cpuAfterStatus;cpuPublished->store(sequence+1,std::memory_order_release);}
 published->store(++sequence,std::memory_order_release);return result;
}
extern "C" OSStatus auditCreate(AudioDeviceID device,AudioDeviceIOProc proc,void* user,AudioDeviceIOProcID* out){
 if(!records||contextCount>=8)return AudioDeviceCreateIOProcID(device,proc,user,out);
 UInt32 size=sizeof(rate);AudioObjectPropertyAddress address{kAudioDevicePropertyNominalSampleRate,kAudioObjectPropertyScopeGlobal,kAudioObjectPropertyElementMain};AudioObjectGetPropertyData(device,&address,0,nullptr,&size,&rate);
 size=sizeof(hwFrames);address.mSelector=kAudioDevicePropertyBufferFrameSize;AudioObjectGetPropertyData(device,&address,0,nullptr,&size,&hwFrames);
 unsigned listener=0;for(auto selector:std::array<UInt32,3>{kAudioDeviceProcessorOverload,kAudioDevicePropertyNominalSampleRate,kAudioDevicePropertyBufferFrameSize}){address.mSelector=selector;auto status=AudioObjectAddPropertyListener(device,&address,property,nullptr);if(contextCount==0)header[5+listener]=uint64_t(int64_t(status));listener++;}if(contextCount==0)header[4]=device;
 Context* c=&contexts[contextCount++];*c={proc,user,device,nullptr};auto status=AudioDeviceCreateIOProcID(device,callback,c,out);c->id=*out;return status;
}
extern "C" OSStatus auditStart(AudioDeviceID device,AudioDeviceIOProcID id){for(unsigned i=0;i<contextCount;i++)if(contexts[i].device==device && (const void*)id==(const void*)contexts[i].original)id=contexts[i].id;return AudioDeviceStart(device,id);}
extern "C" OSStatus auditStop(AudioDeviceID device,AudioDeviceIOProcID id){for(unsigned i=0;i<contextCount;i++)if(contexts[i].device==device && (const void*)id==(const void*)contexts[i].original)id=contexts[i].id;return AudioDeviceStop(device,id);}
__attribute__((used)) static struct {const void* replacement;const void* original;} stopInterpose __attribute__((section("__DATA,__interpose")))={(const void*)auditStop,(const void*)AudioDeviceStop};
__attribute__((used)) static struct {const void* replacement;const void* original;} startInterpose __attribute__((section("__DATA,__interpose")))={(const void*)auditStart,(const void*)AudioDeviceStart};
__attribute__((used)) static struct {const void* replacement;const void* original;} interpose __attribute__((section("__DATA,__interpose")))={(const void*)auditCreate,(const void*)AudioDeviceCreateIOProcID};
__attribute__((constructor)) static void setup(){
 const char* cpuPath=getenv("AWB_THREAD_CPU_AUDIT");if(cpuPath){int cfd=open(cpuPath,O_RDWR|O_CREAT|O_TRUNC,0600);size_t bytes=headerBytes+capacity*5*sizeof(double);if(cfd>=0&&!ftruncate(cfd,bytes)){void* cm=mmap(nullptr,bytes,PROT_READ|PROT_WRITE,MAP_SHARED,cfd,0);if(cm!=MAP_FAILED){std::memset(cm,0,bytes);auto ch=static_cast<uint64_t*>(cm);ch[0]=0x4157424350553031;ch[2]=5;ch[3]=capacity;cpuPublished=new(ch+1)std::atomic<uint64_t>(0);cpuRecords=reinterpret_cast<double*>(static_cast<char*>(cm)+headerBytes);}}if(cfd>=0)close(cfd);}
 auditChannel=getenv("AWB_AUDIO_AUDIT_CHANNEL")?atoi(getenv("AWB_AUDIO_AUDIT_CHANNEL")):0;const char* path=getenv("AWB_AUDIO_AUDIT");if(!path)return;mach_timebase_info_data_t info;mach_timebase_info(&info);timeFactor=double(info.numer)/info.denom;
 int fd=open(path,O_RDWR|O_CREAT|O_TRUNC,0600);size_t size=headerBytes+capacity*columns*sizeof(double);if(fd<0||ftruncate(fd,size)){fprintf(stderr,"AWB_AUDIO_AUDIT_FILE_ERROR\n");return;}void* mapped=mmap(nullptr,size,PROT_READ|PROT_WRITE,MAP_SHARED,fd,0);close(fd);if(mapped==MAP_FAILED)return;std::memset(mapped,0,size);auto h=static_cast<uint64_t*>(mapped);header=h;h[0]=0x4157424155444954;published=new(h+1)std::atomic<uint64_t>(0);h[2]=columns;h[3]=capacity;records=reinterpret_cast<double*>(static_cast<char*>(mapped)+headerBytes);fprintf(stderr,"AWB_AUDIO_AUDIT_READY\n");
}
