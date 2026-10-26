// Local audio-energy suggestions, not popularity data or guaranteed choruses.
export function measureNoteAudio(buffer) {
 const duration=Number(buffer.duration),rate=Number(buffer.sampleRate);
 if(!Number.isFinite(duration)||duration<=0||duration>600||!rate)throw Error('Audio is too long to analyze on this device.');
 const step=.25,count=Math.ceil(duration/step),energy=new Float32Array(count);
 const channels=Array.from({length:Math.min(2,buffer.numberOfChannels)},(_,i)=>buffer.getChannelData(i));
 for(let bin=0;bin<count;bin++){
  const start=Math.floor(bin*step*rate),end=Math.min(channels[0].length,Math.floor((bin+1)*step*rate));let sum=0,n=0;
  for(const channel of channels)for(let i=start;i<end;i+=4){sum+=channel[i]*channel[i];n++;}
  energy[bin]=n?Math.sqrt(sum/n):0;
 }
 const peak=Math.max(...energy),waveform=[];
 for(let b=0;b<96;b++){const from=Math.floor(b*count/96),to=Math.max(from+1,Math.floor((b+1)*count/96));let level=0;for(let i=from;i<Math.min(count,to);i++)level=Math.max(level,energy[i]);waveform.push(peak>0?Math.sqrt(level/peak):0);}
 return {duration,step,energy:Array.from(energy),waveform};
}
export function suggestedNoteMoments(profile,length=30) {
 if(!profile?.energy?.length||!Number.isFinite(profile.duration))return [];
 const {energy,step,duration}=profile,peak=Math.max(...energy);
 if(peak<.003||duration<=length+4)return [];
 const width=Math.max(1,Math.ceil(length/step)),candidates=[];
 for(let i=Math.ceil(3/step);i*step<=duration-length-2;i+=4){
  let sum=0,flux=0,quiet=0;
  for(let j=i;j<Math.min(energy.length,i+width);j++){sum+=energy[j];flux+=Math.max(0,energy[j]-(energy[j-1]||0));if(energy[j]<peak*.08)quiet++;}
  // Sustained energy and rhythmic changes, with a penalty for silence.
  const score=(sum/width+flux/width*.45)*(1-quiet/width);
  candidates.push({time:Math.round(i*step*10)/10,score});
 }
 candidates.sort((a,b)=>b.score-a.score||a.time-b.time);
 const chosen=[];
 for(const row of candidates)if(chosen.every(other=>Math.abs(other.time-row.time)>=Math.max(12,length*.8))){chosen.push(row);if(chosen.length===3)break;}
 return chosen.filter(row=>row.score>peak*.12).sort((a,b)=>a.time-b.time).map(row=>row.time);
}
export async function readNoteAudioBytes(response,signal,maxBytes=20*1024*1024) {
 if(!response.ok)throw Error('Audio could not be loaded.');
 if(Number(response.headers?.get('content-length'))>maxBytes)throw Error('This audio is too large to analyze on this device.');
 if(!response.body?.getReader){const value=await response.arrayBuffer();if(value.byteLength>maxBytes)throw Error('This audio is too large to analyze on this device.');return value;}
 const reader=response.body.getReader(),parts=[];let size=0;
 try{while(true){if(signal?.aborted)throw new DOMException('Cancelled','AbortError');const {done,value}=await reader.read();if(done)break;size+=value.byteLength;if(size>maxBytes)throw Error('This audio is too large to analyze on this device.');parts.push(value);}}
 finally{try{await reader.cancel();}catch{/* Already closed. */}}
 const result=new Uint8Array(size);let offset=0;for(const part of parts){result.set(part,offset);offset+=part.byteLength;}return result.buffer;
}
