// Controls are scoped to the sender's own top-level desktop window.
function installWindowControls({app,ipcMain,BrowserWindow}) {
  const ownWindow=event=>{
    if(event.senderFrame!==event.sender.mainFrame)throw Error('Window controls require the top-level view.');
    const window=BrowserWindow.fromWebContents(event.sender);if(!window||window.isDestroyed())throw Error('Window unavailable.');return window;
  };
  ipcMain.handle('awb:fullscreen-state',event=>ownWindow(event).isFullScreen());
  ipcMain.handle('awb:toggle-fullscreen',event=>{const window=ownWindow(event);window.setFullScreen(!window.isFullScreen());return window.isFullScreen();});
  app.on('browser-window-created',(_event,window)=>{
    const publish=()=>{if(!window.webContents.isDestroyed())window.webContents.send('awb:fullscreen-state',window.isFullScreen());};
    window.on('enter-full-screen',publish);window.on('leave-full-screen',publish);
  });
}
module.exports={installWindowControls};
