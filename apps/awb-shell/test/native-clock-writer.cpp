// Isolated synthetic ScopeOut2 publisher for native-reader lifecycle regression.
#include "server_shm.hpp"
#include <iostream>
#include <algorithm>
#include <string>
int main(int argc,char**argv){
 if(argc!=2)return 2;
 server_shared_memory_creator shared(std::stoi(argv[1]),64);
 auto writer=shared.get_scope_buffer_writer(0,2,1024);if(!writer.valid())return 3;
 std::cout<<"ready"<<std::endl;
 for(std::string command;std::getline(std::cin,command);){
  if(command=="quit")break;
  float* data=writer.data();std::fill(data,data+2048,0.125f);
  if(command!="bad"){
   int end=std::stoi(command);for(int i=0;i<512;i++)data[1024+i]=float(end-512+i);
  }
  writer.push(512);std::cout<<"published"<<std::endl;
 }
 shared.release_scope_buffer_writer(writer);return 0;
}
