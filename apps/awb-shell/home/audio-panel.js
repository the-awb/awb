// Named host commands only. Form and console state survive host notifications.
class ShellAudioPanel {
  constructor(host, refresh) {
    this.host=host;this.refresh=refresh;this.clearThrough=0;this.lastSettings=null;
    this.form=document.querySelector('#audio-form');
    this.message=document.querySelector('#host-message');
    this.output=document.querySelector('#console-output');
    this.follow=document.querySelector('#console-follow');
    this.form.addEventListener('submit',async event=>{
      event.preventDefault();
      const values=Object.fromEntries(new FormData(this.form));
      for(const key of ['inputDevice','outputDevice'])values[key]=values[key]||null;
      for(const key of ['sampleRate','inputChannels','outputChannels'])values[key]=values[key]===''?null:Number(values[key]);
      await this.run('shell.audio-settings',values,'Audio settings saved.');
    });
    document.querySelector('#audio-actions').addEventListener('click',event=>{
      const action=event.target.closest('[data-server-action]')?.dataset.serverAction;
      if(action)this.run('shell.server',{action},action==='status'?'Devices refreshed.':'Audio '+action+' completed.');
    });
    document.querySelector('#console-clear').addEventListener('click',()=>{
      this.clearThrough=this.snapshot?.nativeScHost?.logEnd??0;this.output.textContent='';
    });
    this.follow.addEventListener('change',()=>this.renderConsole());
    this.timer=setInterval(()=>this.poll(),2000);
  }
  async run(operation,payload,success) {
    if(this.busy)return;
    this.busy=true;this.message.textContent='Working…';this.update(this.snapshot);
    try{await this.host.request(operation,payload);this.message.textContent=success;}
    catch(error){this.message.textContent=error.message;}
    finally{this.busy=false;await this.refresh();}
  }
  async poll() {
    if(this.polling||this.busy||!this.snapshot?.host?.control?.audioLifecycle||this.snapshot?.host?.control?.status!=='ready')return;
    this.polling=true;
    try{await this.host.request('shell.server',{action:'status'});await this.refresh();}
    catch(error){this.message.textContent=error.message;}
    finally{this.polling=false;}
  }
  update(snapshot) {
    if(!snapshot)return;this.snapshot=snapshot;
    const control=snapshot.host.control??{}, audio=control.audio??{}, ready=control.status==='ready'&&control.audioLifecycle;
    const state=ready?(audio.state??snapshot.host.scsynth?.status):'unavailable';
    const owned=ready&&control.mode==='headless';
    const stopped=['stopped','failed','unavailable'].includes(state);
    document.querySelector('#audio-actions').innerHTML=['start','stop','restart','status'].map(action=>{
      const enabled=action==='status'?ready:owned&&!['booting','stopping'].includes(state)&&(action!=='start'||stopped);
      return `<button data-server-action="${action}" ${!enabled||this.busy?'disabled':''}>${action==='status'?'Refresh devices':action[0].toUpperCase()+action.slice(1)+' audio'}</button>`;
    }).join('');
    document.querySelector('#save-audio').disabled=this.busy||(!owned&&control.status==='ready')||!stopped;
    const settings=snapshot.audioSettings??audio.settings;
    // Notifications must not discard a composer's unsaved edits.
    const serialized=JSON.stringify(settings);
    if(settings&&serialized!==this.lastSettings){
      for(const [key,value] of Object.entries(settings))if(this.form.elements[key])this.form.elements[key].value=value??'';
      this.lastSettings=serialized;
    }
    for(const [id,devices] of [['input-devices',audio.inputDevices],['output-devices',audio.outputDevices]]){
      if(!devices)continue;const list=document.querySelector('#'+id);list.replaceChildren(...devices.map(value=>{const option=document.createElement('option');option.value=value;return option;}));
    }
    if(this.lastAudioError&&!audio.lastError&&this.message.textContent===this.lastAudioError)this.message.textContent='';
    this.lastAudioError=audio.lastError??null;
    if(audio.lastError&&!this.busy)this.message.textContent=audio.lastError;
    this.renderConsole();
  }
  renderConsole() {
    if(!this.follow.checked)return;
    const managed=this.snapshot?.nativeScHost??{},start=managed.logStart??0;
    this.output.textContent=(managed.logTail??[]).slice(Math.max(0,this.clearThrough-start)).join('\n')||
      (managed.owned?'Waiting for host output…':'Console output is captured for shell-managed language hosts.');
    this.output.scrollTop=this.output.scrollHeight;
  }
}
globalThis.ShellAudioPanel=ShellAudioPanel;
