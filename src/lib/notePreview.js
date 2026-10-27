// A preview owns its audio and a lease on the unchanged main session.
export function createNotePreview({acquire,createAudio=()=>new Audio(),onChange=(_state)=>{},resumeOnEnd=false}){
 let session=null,version=0,lastError="";
 const notify=()=>onChange(session?{trackId:session.id,playing:!session.audio.paused,loading:session.loading,duration:Number(session.audio.duration)||0,position:Number(session.audio.currentTime)||0,error:lastError}:{trackId:null,playing:false,loading:false,duration:0,position:0,error:lastError});
 function stop(resume=true){
  version++;const old=session;session=null;
  if(old){clearTimeout(old.deadline);clearInterval(old.timer);old.audio.onloadedmetadata=null;old.audio.ontimeupdate=null;old.audio.onended=null;old.audio.onerror=null;old.audio.onplay=null;old.audio.onpause=null;old.audio.pause();old.audio.removeAttribute('src');old.audio.load();old.source?.dispose();if(resume)old.lease.release();}
  notify();
 }
 async function play(track,ensure=false,selection={}){
  lastError="";
  const start=selection.playback_mode==="clip"?Math.max(0,Number(selection.clip_start)||0):0;
  const length=selection.playback_mode==="clip"?Math.max(1,Math.min(60,Number(selection.clip_length)||30)):0;
  const signature=JSON.stringify([track.id,start,length]);
  if(session?.signature===signature){
   if(session.loading)return;
   session.requestedPause=false;
   if(selection.restart){session.audio.currentTime=start;await session.audio.play();notify();return;}
   if(!session.audio.paused){if(!ensure)session.audio.pause();notify();return;}
   try{if(length&&session.audio.currentTime>=start+length-.05)session.audio.currentTime=start;await session.audio.play();notify();}catch(e){stop();throw e;}return;
  }
  const held=session?.lease;
  stop(false);const token=++version,audio=createAudio();
  const lease=held||acquire(()=>stop(false));
  const current={id:track.id,signature,audio,lease,source:null,loading:true,timer:null,deadline:null,requestedPause:false};session=current;notify();
  const valid=()=>session===current&&version===token&&lease.isCurrent();
  const failed=message=>{if(valid()){lastError=message;stop();}};
  current.deadline=setTimeout(()=>failed("This song is taking too long to load. Tap play to retry."),15000);
  try{
   const source=await lease.resolve(track);
   if(!valid()){source.dispose();return;}
   current.source=source;audio.src=source.url;audio.preload='auto';audio.loop=false;
   const seekStart=()=>{if(valid()){const duration=Number(audio.duration);if(Number.isFinite(duration)&&duration>0&&start>=duration)throw Error("This clip starts beyond the end of the song");audio.currentTime=start;notify();}};
   const finish=()=>{if(!valid())return;clearInterval(current.timer);if(resumeOnEnd)stop();else{audio.pause();notify();}};
   const checkEnd=()=>{if(!valid())return;if(length&&audio.currentTime>=start+length)finish();else notify();};
   audio.onloadedmetadata=()=>{try{seekStart();}catch{failed("The selected clip is beyond the end of this song. Choose an earlier part.");}};
   audio.ontimeupdate=checkEnd;
   audio.onplay=()=>{if(valid()){clearInterval(current.timer);current.timer=setInterval(checkEnd,120);notify();}};
   audio.onpause=()=>{clearInterval(current.timer);if(valid())notify();};
   try{audio.currentTime=start;}catch{/* Metadata callback seeks before playback starts. */}
   if(audio.readyState>=1)seekStart();
   audio.onended=finish;
   audio.onerror=()=>failed("Couldn’t play this audio. Check your connection and tap play to retry.");
   if(current.requestedPause){clearTimeout(current.deadline);current.loading=false;notify();return;}
   await audio.play();
   if(current.requestedPause)audio.pause();
   if(!valid()){audio.pause();return;}
   clearTimeout(current.deadline);current.loading=false;notify();
  }catch(e){if(valid()){if(current.requestedPause){clearTimeout(current.deadline);current.loading=false;notify();return;}stop();throw e;}}
 }
 return {play,stop,pause(){if(session){session.requestedPause=true;session.audio.pause();notify();}},setOutput(volume,muted,sinkId){if(session){session.audio.volume=volume;session.audio.muted=muted;if(sinkId&&session.audio.setSinkId)session.audio.setSinkId(sinkId).catch(()=>{});}}};
}