#include <cstdlib>
#include <unistd.h>
#include <cstdio>
int main(int argc,char** argv){char owner[32];snprintf(owner,sizeof(owner),"%d",int(getpid()));setenv("AWB_AUDIO_AUDIT_PID",owner,1);setenv("DYLD_INSERT_LIBRARIES",getenv("AWB_AUDIO_AUDIT_LIBRARY"),1);argv[0]=(char*)"/private/tmp/awb-full-gui-reserve-retry/fixture/scsynth";execv(argv[0],argv);perror("exec owned audited engine");return 1;}
