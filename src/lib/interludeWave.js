// Downsample real time-domain audio into a stable ribbon without invented beats.
export function updateInterludeWave(samples,previous,playing=true) {
 const count=previous.length;let energy=0;
 for(let i=0;i<count;i++){
  const from=samples?Math.floor(i*samples.length/count):0,to=samples?Math.max(from+1,Math.floor((i+1)*samples.length/count)):0;
  let sum=0,n=0;for(let j=from;j<to&&j<samples.length;j++){sum+=(samples[j]-128)/128;n++;}
  const target=playing&&n?Math.max(-1,Math.min(1,sum/n*1.8)):0;
  previous[i]+=(target-previous[i])*.32;energy+=previous[i]*previous[i];
 }
 return Math.sqrt(energy/Math.max(1,count));
}
