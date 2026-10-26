// A preview owns its audio and a lease on the unchanged main session.
export function createNotePreview({acquire,createAudio=()=>new Audio(),onChange=(_state)=>{},resumeOnEnd=false}){
 let session=null,version=0;
 const notify=()=>onChange(session?{trackId:session.id,playing:!session.audio.paused,loading:session.loading,duration:Number(session.audio.duration)||0}:{trackId:null,playing:false,loading:false});
 function stop(resume=true){
  version++;const old=session;session=null;
  if(old){clearInterval(old.timer);old.audio.onloadedmetadata=null;old.audio.ontimeupdate=null;old.audio.onended=null;old.audio.onerror=null;old.audio.onplay=null;old.audio.onpause=null;old.audio.pause();old.audio.removeAttribute('src');old.audio.load();old.source?.dispose();if(resume)old.lease.release();}
  notify();
 }
 async function play(track,ensure=false,selection={}){
  const start=selection.playback_mode==="clip"?Math.max(0,Number(selection.clip_start)||0):0;
  const length=selection.playback_mode==="clip"?Math.max(1,Math.min(60,Number(selection.clip_length)||30)):0;
  const signature=JSON.stringify([track.id,start,length]);
  if(session?.signature===signature){
   if(session.loading)return;
   if(!session.audio.paused){if(!ensure)session.audio.pause();notify();return;}
   try{if(length&&session.audio.currentTime>=start+length-.05)session.audio.currentTime=start;await session.audio.play();notify();}catch(e){stop();throw e;}return;
  }
  const held=session?.lease;
  stop(false);const token=++version,audio=createAudio();
  const lease=held||acquire(()=>stop(false));
  const current={id:track.id,signature,audio,lease,source:null,loading:true,timer:null};session=current;notify();
  const valid=()=>session===current&&version===token&&lease.isCurrent();
  try{
   const source=await lease.resolve(track);
   if(!valid()){source.dispose();return;}
   current.source=source;audio.src=source.url;audio.preload='auto';audio.loop=false;
   const seekStart=()=>{if(valid()){const duration=Number(audio.duration);if(Number.isFinite(duration)&&duration>0&&start>=duration)throw Error("This clip starts beyond the end of the song");audio.currentTime=start;notify();}};
   const finish=()=>{if(!valid())return;clearInterval(current.timer);if(resumeOnEnd)stop();else{audio.pause();notify();}};
   const checkEnd=()=>{if(valid()&&length&&audio.currentTime>=start+length)finish();};
   audio.onloadedmetadata=()=>{try{seekStart();}catch{stop();}};
   audio.ontimeupdate=checkEnd;
   audio.onplay=()=>{if(valid()){clearInterval(current.timer);if(length)current.timer=setInterval(checkEnd,80);notify();}};
   audio.onpause=()=>{clearInterval(current.timer);if(valid())notify();};
   try{audio.currentTime=start;}catch{/* Metadata callback seeks before playback starts. */}
   if(audio.readyState>=1)seekStart();
   audio.onended=finish;
   audio.onerror=()=>{if(valid())stop();};
   await audio.play();
   if(!valid()){audio.pause();return;}
   current.loading=false;notify();
  }catch(e){if(valid()){stop();throw e;}}
 }
 return {play,stop,setOutput(volume,muted,sinkId){if(session){session.audio.volume=volume;session.audio.muted=muted;if(sinkId&&session.audio.setSinkId)session.audio.setSinkId(sinkId).catch(()=>{});}}};
}