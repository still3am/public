// A preview owns its audio and a lease on the unchanged main session.
export function createNotePreview({acquire,createAudio=()=>new Audio(),onChange=()=>{}}){
 let session=null,version=0;
 const notify=()=>onChange(session?{trackId:session.id,playing:!session.audio.paused,loading:session.loading}:{trackId:null,playing:false,loading:false});
 function stop(resume=true){
  version++;const old=session;session=null;
  if(old){old.audio.onended=null;old.audio.onerror=null;old.audio.onplay=null;old.audio.onpause=null;old.audio.pause();old.audio.removeAttribute('src');old.audio.load();old.source?.dispose();if(resume)old.lease.release();}
  notify();
 }
 async function play(track,ensure=false){
  if(session?.id===track.id){
   if(session.loading)return;
   if(!session.audio.paused){if(!ensure)session.audio.pause();notify();return;}
   try{await session.audio.play();notify();}catch(e){stop();throw e;}return;
  }
  stop();const token=++version,audio=createAudio();
  const lease=acquire(()=>stop(false));
  const current={id:track.id,audio,lease,source:null,loading:true};session=current;notify();
  const valid=()=>session===current&&version===token&&lease.isCurrent();
  try{
   const source=await lease.resolve(track);
   if(!valid()){source.dispose();return;}
   current.source=source;audio.src=source.url;audio.preload='auto';audio.loop=false;
   audio.onplay=audio.onpause=()=>{if(valid())notify();};
   audio.onended=()=>{if(valid()){audio.pause();notify();}};
   audio.onerror=()=>{if(valid())stop();};
   await audio.play();
   if(!valid()){audio.pause();return;}
   current.loading=false;notify();
  }catch(e){if(valid()){stop();throw e;}}
 }
 return {play,stop,setOutput(volume,muted,sinkId){if(session){session.audio.volume=volume;session.audio.muted=muted;if(sinkId&&session.audio.setSinkId)session.audio.setSinkId(sinkId).catch(()=>{});}}};
}
