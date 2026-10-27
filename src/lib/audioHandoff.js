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
 }catch{if(isCurrent())audio.pause?.();return false;}finally{clearTimeout(timer);}
}

// Smooth endpoints reduce abrupt envelope changes while keeping equal power.
export function equalPowerTransitionCurve(fadeIn,duration) {
 const steps=Math.max(32,Math.min(256,Math.round(duration*60))),curve=new Float32Array(steps);
 for(let i=0;i<steps;i++){const x=i/(steps-1),phase=x*x*(3-2*x);curve[i]=fadeIn?Math.sin(phase*Math.PI/2):Math.cos(phase*Math.PI/2);}
 return curve;
}
