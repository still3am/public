// Routes Public's existing audio pipeline; never creates a second player.
export class AudioOutput {
 constructor({elements,context,active,mediaDevices=globalThis.navigator?.mediaDevices}){
  this.elements=elements;this.context=context;this.active=active;this.mediaDevices=mediaDevices;
  this.listeners=new Set();this.cleanups=[];this.lock=false;this.revision=0;
  this.state={outputs:[],sinkId:"",label:"System default",remoteState:"disconnected",busy:false,error:""};
 }
 subscribe(listener){this.listeners.add(listener);listener(this.snapshot());return()=>this.listeners.delete(listener);}
 snapshot(){
  const audio=this.active(),ctx=this.context();
  return {...this.state,airplay:typeof audio?.webkitShowPlaybackTargetPicker==="function",
   remote:typeof audio?.remote?.prompt==="function",
   canRoute:!!audio&&typeof audio.setSinkId==="function"&&(!ctx||typeof ctx.setSinkId==="function"),
   canChoose:typeof this.mediaDevices?.selectAudioOutput==="function"};
 }
 emit(patch){Object.assign(this.state,patch);const state=this.snapshot();this.listeners.forEach(fn=>fn(state));}
 bind(){
  this.unbind();
  const update=()=>{
   const audio=this.active(),connected=!!audio?.webkitCurrentPlaybackTargetIsWireless;
   this.emit({remoteState:connected?"connected":audio?.remote?.state||"disconnected"});
  };
  for(const audio of this.elements().filter(Boolean)){
   for(const event of ["webkitcurrentplaybacktargetiswirelesschanged","webkitplaybacktargetavailabilitychanged","playing"]){
    audio.addEventListener(event,update);this.cleanups.push(()=>audio.removeEventListener(event,update));
   }
   for(const event of ["connecting","connect","disconnect"]){
    audio.remote?.addEventListener?.(event,update);this.cleanups.push(()=>audio.remote?.removeEventListener?.(event,update));
   }
  }
  const changed=()=>{this.refresh().catch(()=>{});};
  this.mediaDevices?.addEventListener?.("devicechange",changed);
  this.cleanups.push(()=>this.mediaDevices?.removeEventListener?.("devicechange",changed));
  update();
 }
 unbind(){this.cleanups.splice(0).forEach(fn=>fn());}
 async refresh(){
  const revision=++this.revision;
  try{
   const all=await this.mediaDevices?.enumerateDevices?.()||[];
   if(revision!==this.revision)return;
   const outputs=[...new Map(all.filter(d=>d.kind==="audiooutput"&&d.deviceId&&d.deviceId!=="default"&&d.label).map(d=>[d.deviceId,{deviceId:d.deviceId,label:d.label}])).values()];
   this.emit({outputs});
   if(this.state.sinkId&&!outputs.some(d=>d.deviceId===this.state.sinkId))await this.select({deviceId:"",label:"System default"});
  }catch{this.emit({error:"Couldn’t check your speakers. Try again."});}
 }
 async route(id){
  const targets=[...this.elements().filter(Boolean),this.context()].filter(Boolean);
  // A Web Audio graph owns the final output after EQ or transitions are enabled.
  if(targets.some(target=>typeof target.setSinkId!=="function"))throw Error("Use your device’s sound settings to change the output in this browser.");
  const previous=targets.map(target=>target.sinkId||"");
  const results=await Promise.allSettled(targets.map(target=>target.setSinkId(id)));
  const failed=results.find(result=>result.status==="rejected");
  if(failed){
   await Promise.allSettled(targets.map((target,i)=>target.setSinkId(previous[i])));
   throw failed.reason;
  }
 }
 async select(device){
  if(this.lock)return false;
  this.lock=true;this.emit({busy:true,error:""});
  try{
   await this.route(device.deviceId==="default"?"":device.deviceId);
   this.emit({sinkId:device.deviceId==="default"?"":device.deviceId,label:device.label||"Selected speaker"});
   return true;
  }catch(error){this.emit({error:this.message(error)});return false;}
  finally{this.lock=false;this.emit({busy:false});}
 }
 async choose(){
  if(this.lock)return false;
  if(!this.snapshot().canChoose){this.emit({error:"Choose a speaker in your device’s sound settings."});return false;}
  this.lock=true;this.emit({busy:true,error:""});
  try{
   // Must start directly from the click: no microphone permission is requested.
   const device=await this.mediaDevices.selectAudioOutput();
   await this.route(device.deviceId);
   this.emit({sinkId:device.deviceId,label:device.label||"Selected speaker"});
   await this.refresh();return true;
  }catch(error){if(error?.name!=="AbortError")this.emit({error:this.message(error)});return false;}
  finally{this.lock=false;this.emit({busy:false});}
 }
 async attachGraph(ctx){
  if(!this.state.sinkId)return;
  try{
   if(typeof ctx.setSinkId!=="function")throw Error("This browser uses system output for sound effects. Select your speaker in system sound settings.");
   await ctx.setSinkId(this.state.sinkId);
  }catch(error){
   // Do not silently switch to local speakers when the graph cannot keep a route.
   this.elements().forEach(audio=>audio?.pause());
   this.emit({error:this.message(error)});
  }
 }
 async wireless(){
  const audio=this.active();
  if(!audio?.src){this.emit({error:"Play a song first, then choose a device."});return false;}
  if(this.lock)return false;
  this.lock=true;this.emit({busy:true,error:""});
  try{
   if(typeof audio.webkitShowPlaybackTargetPicker==="function")audio.webkitShowPlaybackTargetPicker();
   else if(audio.remote?.prompt)await audio.remote.prompt();
   else throw Error("Use your device’s audio controls to select a wireless speaker.");
   // Connection events, not opening a picker, confirm an actual connection.
   return true;
  }catch(error){if(error?.name!=="AbortError")this.emit({error:this.message(error)});return false;}
  finally{this.lock=false;this.emit({busy:false});}
 }
 message(error){
  if(error?.name==="NotAllowedError"||error?.name==="SecurityError")return "Speaker access wasn’t allowed. Try again, or use system sound settings.";
  if(error?.name==="NotFoundError")return "That speaker is no longer available. Choose another output.";
  return error?.message||"Couldn’t connect. Check the device and try again.";
 }
}
