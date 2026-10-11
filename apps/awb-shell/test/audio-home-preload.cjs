const {contextBridge,ipcRenderer}=require('electron');
contextBridge.exposeInMainWorld('awbHost',{
 request:(operation,payload)=>ipcRenderer.invoke('fixture-request',operation,payload),
 onCommand:callback=>ipcRenderer.on('fixture-change',(_event,command)=>callback(command)),
 reportReady:()=>{}
});
