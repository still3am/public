import recordings from '../data/alignedWordTimings.js';
export function lyricTextKey(text){
 const value=String(text||'').normalize('NFKC').toLowerCase().replace(/’/g,"'").replace(/'/g,'').replace(/[^a-z0-9]+/g,' ').trim();
 let hash=2166136261;for(let i=0;i<value.length;i++)hash=Math.imul(hash^value.charCodeAt(i),16777619)>>>0;
 return hash.toString(16);
}
// Alignment belongs to the exact uploaded audio file, not just a song title.
// Apply it only where the fetched lyric text and timing boundaries agree.
export function applyAlignedLyrics(result,track){
 if(!result?.record?.lines?.length||!track?.audio_url)return result;
 let file;try{file=new URL(track.audio_url).pathname.split('/').pop();}catch{return result;}
 const recording=recordings.find(item=>item.file===file);
 if(!recording)return result;
 const duration=Number(track.duration_seconds);
 if(duration>0&&Math.abs(duration-recording.duration)>2)return result;
 let applied=0;
 const lines=result.record.lines.map((line,i,all)=>{
  if(line.words?.length)return line;
  const parts=line.text?.match(/\S+\s*/g)||[];
  const hash=lyricTextKey(line.text),start=Number(line.start_time_ms),boundary=Number(all[i+1]?.start_time_ms??line.end_time_ms);
  const candidates=recording.segments.filter(([key,at,words])=>key===hash&&words.length===parts.length&&Math.abs(at-start)<=3500);
  const found=candidates.sort((a,b)=>Math.abs(a[1]-start)-Math.abs(b[1]-start))[0];
  if(!found)return line;
  const times=found[2];
  if(times.some(([a,b],j)=>!Number.isFinite(a)||!Number.isFinite(b)||a<start||b<=a||b>boundary||j>0&&a<times[j-1][1]))return line;
  applied++;
  return {...line,words:times.map(([a,b],j)=>({text:parts[j],start_time_ms:a,end_time_ms:b})),preserve_word_spacing:true};
 });
 return applied?{...result,record:{...result.record,lines},wordTimingSource:'audio-alignment',wordTimedLines:applied}:result;
}
