#include <cstdlib>
#include <unistd.h>
#include <cstdio>
int main(int argc,char** argv){setenv("DYLD_INSERT_LIBRARIES",getenv("AWB_AUDIO_AUDIT_LIBRARY"),1);argv[0]=(char*)"/private/tmp/awb-audit-scsynth";execv(argv[0],argv);perror("exec audit scsynth");return 1;}
