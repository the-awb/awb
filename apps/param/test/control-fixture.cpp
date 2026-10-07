// Shared-memory API fixture only: no audio engine or device access.
#include "server_shm.hpp"
#include <iostream>
int main(int argc,char**argv){if(argc!=2)return 2;const unsigned port=std::stoul(argv[1]);try{boost::interprocess::managed_shared_memory existing(boost::interprocess::open_only,detail_server_shm::make_shmem_name(port).c_str());return 3;}catch(const boost::interprocess::interprocess_exception&){}server_shared_memory_creator server(port,64);auto values=server.get_control_busses();for(int i=0;i<64;i++)values[i]=i*.25f;std::cout<<"READY"<<std::endl;std::string line;std::getline(std::cin,line);return 0;}
