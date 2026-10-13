export function transitionDuration(requested,remaining,nextDuration=Infinity,rate=1){
 const speed=Number.isFinite(rate)&&rate>0?rate:1;
 const duration=Math.min(Math.max(.1,Number(requested)||.1),Math.max(0,remaining)/speed,Number.isFinite(nextDuration)&&nextDuration>0?nextDuration/(2*speed):Infinity);
 return Number.isFinite(duration)&&duration>0?duration:0;
}
export async function commitAudioHandoff(audio,isCurrent,commit,timeoutMs=5000){
 if(!isCurrent())return false;let timer;
 try{
  await Promise.race([Promise.resolve(audio.play()),new Promise((_,reject)=>{timer=setTimeout(()=>reject(Error('Audio start timed out')),timeoutMs);})]);
  if(!isCurrent())return false;commit();return true;
 }catch{return false;}finally{clearTimeout(timer);}
}
