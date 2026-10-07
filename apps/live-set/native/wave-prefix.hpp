#pragma once
#include <algorithm>
#include <cstdint>
namespace ubview {
// Only samples already overwritten in the writer's current physical bin.
inline void writtenPrefix(const float* data,uint32_t channels,uint32_t channel,
                          uint32_t position,uint32_t width,float* result){
 result[0]=result[1]=0;
 const auto count=position%width;
 if(!count)return;
 const auto first=position-count;
 result[0]=result[1]=data[first*channels+channel];
 for(auto f=first+1;f<position;f++){
  const auto v=data[f*channels+channel];result[0]=std::min(result[0],v);result[1]=std::max(result[1],v);
 }
}
}
