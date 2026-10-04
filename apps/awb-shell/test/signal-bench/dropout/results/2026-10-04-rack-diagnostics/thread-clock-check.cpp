#include <mach/mach.h>
#include <mach/mach_time.h>
#include <cstdio>
#include <unistd.h>
#include <cmath>
static double factor;static thread_t target;
static double wall(){return mach_absolute_time()*factor;}
static double cpu(){thread_basic_info_data_t i{};mach_msg_type_number_t n=THREAD_BASIC_INFO_COUNT;auto s=thread_info(target,THREAD_BASIC_INFO,(thread_info_t)&i,&n);if(s) return -1;return (i.user_time.seconds+i.system_time.seconds)*1e9+(i.user_time.microseconds+i.system_time.microseconds)*1e3;}
int main(){mach_timebase_info_data_t t;mach_timebase_info(&t);factor=double(t.numer)/t.denom;target=mach_thread_self();double c0=cpu(),w0=wall();usleep(20000);double w1=wall(),c1=cpu();printf("sleep wall_ms=%.3f cpu_ms=%.3f\n",(w1-w0)/1e6,(c1-c0)/1e6);bool goodSleep=w1-w0>1e7 && c1-c0<1e6;c0=cpu();w0=wall();volatile double x=.3;while(wall()-w0<2e7)x=std::sin(x+.3);w1=wall();c1=cpu();printf("busy wall_ms=%.3f cpu_ms=%.3f value=%.6f\n",(w1-w0)/1e6,(c1-c0)/1e6,double(x));return goodSleep&&c1-c0>1e7?0:1;}
