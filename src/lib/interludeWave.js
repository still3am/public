// A slow ribbon whose envelope follows real audio energy, rather than redrawing
// unrelated waveform snapshots on every frame. Phase is continuous while playing.
export function updateInterludeWave(samples,previous,playing=true,phase=0,dt=33) {
 const count=previous.length;let power=0;
 if(playing&&samples?.length){for(const sample of samples){const v=(sample-128)/128;power+=v*v;}power=Math.sqrt(power/samples.length);}
 const amplitude=Math.min(.85,power*1.7);
 const blend=1-Math.exp(-Math.max(0,Math.min(80,dt))/(playing?280:100));
 let energy=0;
 for(let i=0;i<count;i++){
  const x=i/Math.max(1,count-1);
  const shape=.72*Math.sin(x*Math.PI*2-phase)+.28*Math.sin(x*Math.PI*4-phase*.65);
  const target=amplitude*shape;
  previous[i]+=(target-previous[i])*blend;energy+=previous[i]*previous[i];
 }
 return Math.sqrt(energy/Math.max(1,count));
}
