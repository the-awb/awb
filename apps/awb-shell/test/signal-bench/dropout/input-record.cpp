#include <CoreAudio/CoreAudio.h>
#include <CoreFoundation/CoreFoundation.h>
#include <mach/mach_time.h>
#include <atomic>
#include <algorithm>
#include <cmath>
#include <cstdio>
#include <cstdlib>
#include <cstring>
#include <vector>
#include <string>
#include <unistd.h>
#include <fcntl.h>
#include <sys/mman.h>
#include <signal.h>
#include <thread>
#include <chrono>
static constexpr uint64_t recordCapacity=160000,frameCapacity=48000*1500,headerBytes=4096,recordColumns=10;
struct Slot {double r[10];float samples[4096];};static Slot ring[64];static std::atomic<uint64_t> ringHead{0},ringTail{0},captureDrops{0};static std::atomic<bool> writerStopping{false};
static uint64_t *header;static std::atomic<uint64_t>* published;static double* records;static float* pcm;static uint64_t sequence=0,offset=0;static int channel=0;static double factor=1,rate=0;static volatile sig_atomic_t stop=0;
static void signalStop(int){stop=1;}static double ns(){return mach_absolute_time()*factor;}
static void check(OSStatus s,const char* label){if(s){fprintf(stderr,"%s: %d\n",label,int(s));exit(2);}}
static std::string name(AudioObjectID d){CFStringRef n=nullptr;UInt32 size=sizeof(n);AudioObjectPropertyAddress a{kAudioObjectPropertyName,kAudioObjectPropertyScopeGlobal,kAudioObjectPropertyElementMain};check(AudioObjectGetPropertyData(d,&a,0,nullptr,&size,&n),"device name");char b[512]={};CFStringGetCString(n,b,sizeof(b),kCFStringEncodingUTF8);CFRelease(n);return b;}
static unsigned channels(AudioObjectID d,AudioObjectPropertyScope scope){AudioObjectPropertyAddress a{kAudioDevicePropertyStreamConfiguration,scope,kAudioObjectPropertyElementMain};UInt32 size=0;check(AudioObjectGetPropertyDataSize(d,&a,0,nullptr,&size),"config size");std::vector<char> b(size);check(AudioObjectGetPropertyData(d,&a,0,nullptr,&size,b.data()),"config");auto l=(AudioBufferList*)b.data();unsigned sum=0;for(unsigned i=0;i<l->mNumberBuffers;i++)sum+=l->mBuffers[i].mNumberChannels;return sum;}
static OSStatus callback(AudioDeviceID,const AudioTimeStamp*,const AudioBufferList* input,const AudioTimeStamp* inputTime,AudioBufferList* output,const AudioTimeStamp*,void*){
 double entry=ns();if(output)for(unsigned i=0;i<output->mNumberBuffers;i++)if(output->mBuffers[i].mData)memset(output->mBuffers[i].mData,0,output->mBuffers[i].mDataByteSize);
 if(!input)return noErr;int index=channel;const AudioBuffer* b=nullptr;for(unsigned i=0;i<input->mNumberBuffers;i++){if(index<int(input->mBuffers[i].mNumberChannels)){b=&input->mBuffers[i];break;}index-=input->mBuffers[i].mNumberChannels;}if(!b||!b->mData||!b->mNumberChannels)return noErr;
 unsigned frames=b->mDataByteSize/(4*b->mNumberChannels);auto head=ringHead.load(std::memory_order_relaxed);if(frames>4096||head-ringTail.load(std::memory_order_acquire)>=64){captureDrops.fetch_add(1,std::memory_order_relaxed);return noErr;}auto& slot=ring[head%64];auto samples=(const float*)b->mData;for(unsigned i=0;i<frames;i++)slot.samples[i]=samples[i*b->mNumberChannels+index];double* r=slot.r;r[0]=head;r[1]=entry;r[2]=inputTime?inputTime->mHostTime*factor:0;r[3]=inputTime?inputTime->mSampleTime:0;r[4]=frames;r[5]=0;r[6]=rate;r[7]=inputTime?inputTime->mFlags:0;r[9]=channel;r[8]=ns()-entry;ringHead.store(head+1,std::memory_order_release);return noErr;

}
int main(int argc,char** argv){
 mach_timebase_info_data_t ti;mach_timebase_info(&ti);factor=double(ti.numer)/ti.denom;AudioObjectPropertyAddress a{kAudioHardwarePropertyDevices,kAudioObjectPropertyScopeGlobal,kAudioObjectPropertyElementMain};UInt32 size=0;check(AudioObjectGetPropertyDataSize(kAudioObjectSystemObject,&a,0,nullptr,&size),"devices size");std::vector<AudioDeviceID> devices(size/sizeof(AudioDeviceID));check(AudioObjectGetPropertyData(kAudioObjectSystemObject,&a,0,nullptr,&size,devices.data()),"devices");AudioDeviceID selected=0;
 for(auto d:devices){auto n=name(d);if(argc<2||std::string(argv[1])=="list")printf("device=%u name=%s input=%u output=%u\n",d,n.c_str(),channels(d,kAudioObjectPropertyScopeInput),channels(d,kAudioObjectPropertyScopeOutput));if(n=="1248")selected=d;}
 if(argc<2||std::string(argv[1])=="list")return 0;if(argc!=5||!selected){fprintf(stderr,"usage: record INPUT_ZERO_BASED SECONDS FILE\n");return 2;}channel=atoi(argv[2]);unsigned inputChannels=channels(selected,kAudioObjectPropertyScopeInput);if(channel<0||channel>=int(inputChannels))return 2;
 a={kAudioDevicePropertyNominalSampleRate,kAudioObjectPropertyScopeGlobal,kAudioObjectPropertyElementMain};size=sizeof(rate);check(AudioObjectGetPropertyData(selected,&a,0,nullptr,&size,&rate),"rate");double expectedRate=getenv("AWB_NATIVE_SAMPLE_RATE")?atof(getenv("AWB_NATIVE_SAMPLE_RATE")):48000;if((expectedRate!=44100&&expectedRate!=48000)||rate!=expectedRate){fprintf(stderr,"Expected observed %.0f Hz; got %.1f\n",expectedRate,rate);return 2;}
 // Verify all input streams use Float32 before interpreting their buffers.
 a={kAudioDevicePropertyStreams,kAudioObjectPropertyScopeInput,kAudioObjectPropertyElementMain};check(AudioObjectGetPropertyDataSize(selected,&a,0,nullptr,&size),"streams size");std::vector<AudioStreamID> streams(size/sizeof(AudioStreamID));check(AudioObjectGetPropertyData(selected,&a,0,nullptr,&size,streams.data()),"streams");for(auto stream:streams){AudioStreamBasicDescription f={};a={kAudioStreamPropertyVirtualFormat,kAudioObjectPropertyScopeGlobal,kAudioObjectPropertyElementMain};size=sizeof(f);check(AudioObjectGetPropertyData(stream,&a,0,nullptr,&size,&f),"format");if(f.mFormatID!=kAudioFormatLinearPCM||!(f.mFormatFlags&kAudioFormatFlagIsFloat)||f.mBitsPerChannel!=32){fprintf(stderr,"Unsupported non-Float32 input\n");return 2;}}
 size_t bytes=headerBytes+recordCapacity*recordColumns*8+frameCapacity*4;int fd=open(argv[4],O_RDWR|O_CREAT|O_TRUNC,0600);if(fd<0||ftruncate(fd,bytes))return 2;void* mapping=mmap(nullptr,bytes,PROT_READ|PROT_WRITE,MAP_SHARED,fd,0);close(fd);if(mapping==MAP_FAILED)return 2;memset(mapping,0,headerBytes);if(mlock(ring,sizeof(ring))){perror("lock recorder ring");return 2;}header=(uint64_t*)mapping;header[0]=0x415742494e505554;published=new(header+1)std::atomic<uint64_t>(0);header[2]=recordCapacity;header[3]=recordColumns;header[4]=frameCapacity;header[5]=channel;header[6]=selected;header[7]=uint64_t(rate);header[10]=2;records=(double*)((char*)mapping+headerBytes);pcm=(float*)((char*)records+recordCapacity*recordColumns*8);
 AudioDeviceIOProcID id=nullptr;check(AudioDeviceCreateIOProcID(selected,callback,nullptr,&id),"create input recorder");
 a={kAudioDevicePropertyIOProcStreamUsage,kAudioObjectPropertyScopeOutput,kAudioObjectPropertyElementMain};if(AudioObjectHasProperty(selected,&a)){check(AudioObjectGetPropertyDataSize(selected,&a,0,nullptr,&size),"output usage size");std::vector<char> usage(size);auto u=(AudioHardwareIOProcStreamUsage*)usage.data();u->mIOProc=(void*)id;check(AudioObjectGetPropertyData(selected,&a,0,nullptr,&size,u),"output usage");for(unsigned i=0;i<u->mNumberStreams;i++)u->mStreamIsOn[i]=0;check(AudioObjectSetPropertyData(selected,&a,0,nullptr,size,u),"disable recorder output");}
 std::thread writer([]{while(!writerStopping.load()||ringTail.load()<ringHead.load()){auto tail=ringTail.load(std::memory_order_relaxed);if(tail==ringHead.load(std::memory_order_acquire)){std::this_thread::sleep_for(std::chrono::milliseconds(1));continue;}auto& slot=ring[tail%64];auto frames=uint64_t(slot.r[4]);if(sequence<recordCapacity&&offset+frames<=frameCapacity){memcpy(pcm+offset,slot.samples,frames*4);slot.r[0]=sequence;slot.r[5]=offset;memcpy(records+sequence*recordColumns,slot.r,recordColumns*8);offset+=frames;published->store(++sequence,std::memory_order_release);}else captureDrops++;ringTail.store(tail+1,std::memory_order_release);}});
 signal(SIGTERM,signalStop);signal(SIGINT,signalStop);check(AudioDeviceStart(selected,id),"start input recorder");fprintf(stderr,"INPUT_RECORDER_READY device=%u channel=%d rate=%.0f inputChannels=%u\n",selected,channel,rate,inputChannels);double end=ns()+atof(argv[3])*1e9;while(!stop&&ns()<end)usleep(50000);check(AudioDeviceStop(selected,id),"stop input recorder");check(AudioDeviceDestroyIOProcID(selected,id),"destroy input recorder");writerStopping.store(true);writer.join();header[8]=offset;header[9]=captureDrops.load();fprintf(stderr,"INPUT_RECORDER_COMPLETE callbacks=%llu frames=%llu\n",sequence,offset);munmap(mapping,bytes);munlock(ring,sizeof(ring));int finalFD=open(argv[4],O_RDWR);if(finalFD>=0){ftruncate(finalFD,headerBytes+recordCapacity*recordColumns*8+offset*4);close(finalFD);}return 0;
}
