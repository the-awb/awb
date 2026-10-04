from pathlib import Path
root=Path('/Users/willy/awb/apps/awb-shell/test/signal-bench/dropout')
out=Path('/private/tmp/awb-rack-diagnostics-20261004')
s=(root/'callback-audit.cpp').read_text().replace('#include <mach/mach_time.h>','#include <mach/mach_time.h>\n#include <mach/mach.h>')
s=s.replace('static OSStatus callback(','''static double* cpuRecords=nullptr;static std::atomic<uint64_t>* cpuPublished=nullptr;static thread_t callbackThread=MACH_PORT_NULL;
static uint64_t threadCPU(kern_return_t& status){thread_basic_info_data_t info{};mach_msg_type_number_t size=THREAD_BASIC_INFO_COUNT;status=thread_info(callbackThread,THREAD_BASIC_INFO,reinterpret_cast<thread_info_t>(&info),&size);return uint64_t(info.user_time.seconds+info.system_time.seconds)*1000000000ull+uint64_t(info.user_time.microseconds+info.system_time.microseconds)*1000ull;}
static OSStatus callback(''')
s=s.replace('auto c=static_cast<Context*>(context);auto start=ns();', '''auto c=static_cast<Context*>(context);if(callbackThread==MACH_PORT_NULL)callbackThread=mach_thread_self();kern_return_t cpuBeforeStatus=0,cpuAfterStatus=0;auto queryBeforeStart=ns();auto cpuBefore=cpuRecords?threadCPU(cpuBeforeStatus):0;auto queryBeforeEnd=ns();auto start=ns();''')
s=s.replace('auto finished=ns();','auto finished=ns();auto cpuAfter=cpuRecords?threadCPU(cpuAfterStatus):0;auto queryAfterEnd=ns();')
s=s.replace('published->store(++sequence', '''if(cpuRecords){double* t=cpuRecords+sequence*5;t[0]=sequence;t[1]=cpuAfter-cpuBefore;t[2]=queryBeforeEnd-queryBeforeStart;t[3]=queryAfterEnd-finished;t[4]=cpuBeforeStatus?cpuBeforeStatus:cpuAfterStatus;cpuPublished->store(sequence+1,std::memory_order_release);}
 published->store(++sequence''')
s=s.replace('auditChannel=getenv(','''const char* cpuPath=getenv("AWB_THREAD_CPU_AUDIT");if(cpuPath){int cfd=open(cpuPath,O_RDWR|O_CREAT|O_TRUNC,0600);size_t bytes=headerBytes+capacity*5*sizeof(double);if(cfd>=0&&!ftruncate(cfd,bytes)){void* cm=mmap(nullptr,bytes,PROT_READ|PROT_WRITE,MAP_SHARED,cfd,0);if(cm!=MAP_FAILED){std::memset(cm,0,bytes);auto ch=static_cast<uint64_t*>(cm);ch[0]=0x4157424350553031;ch[2]=5;ch[3]=capacity;cpuPublished=new(ch+1)std::atomic<uint64_t>(0);cpuRecords=reinterpret_cast<double*>(static_cast<char*>(cm)+headerBytes);}}if(cfd>=0)close(cfd);}
 auditChannel=getenv(''')
(out/'callback-thread-audit.cpp').write_text(s)
