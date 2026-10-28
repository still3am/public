// Use media time, never wall-clock extrapolation: buffering and playback-rate
// changes must not let lyrics advance independently of the song.
export function readLyricClock(readPosition,trackId,fallback=0) {
 const value=readPosition?.(trackId);
 return typeof value==='number'&&Number.isFinite(value)?Math.max(0,value):Math.max(0,Number(fallback)||0);
}

// Sorted timing lines allow fast lookup even for long songs and backward seeks.
export function findLyricIndex(lines,seconds) {
 let low=0,high=lines.length-1,result=-1;const ms=Math.max(0,Number(seconds)||0)*1000;
 while(low<=high){const middle=(low+high)>>>1;if(Number(lines[middle].start_time_ms)<=ms){result=middle;low=middle+1;}else high=middle-1;}
 return result;
}

// Only explicit source timing creates a mid-song break. Never infer silence
// from a long sentence or invent word timing for plain LRC.
export function prepareLyricTimeline(lines) {
 if(!lines.length)return lines;
 const timeline=[];
 if(Number(lines[0].start_time_ms)>=3000)timeline.push({text:'♪',start_time_ms:0,end_time_ms:Number(lines[0].start_time_ms)});
 for(let i=0;i<lines.length;i++){
  const line=lines[i],start=Number(line.start_time_ms);
  const boundary=Number(lines[i+1]?.start_time_ms??line.end_time_ms);
  const lastWord=line.words?.at(-1),wordEnd=Number(lastWord?.end_time_ms);
  const explicitEnd=Number(line.end_time_ms);
  const stop=Number.isFinite(wordEnd)&&wordEnd>Number(lastWord.start_time_ms)?wordEnd:explicitEnd;
  if(Number.isFinite(stop)&&stop>start&&Number.isFinite(boundary)&&boundary-stop>=3000){
   timeline.push({...line,end_time_ms:stop},{text:'♪',start_time_ms:stop,end_time_ms:boundary});
  }else timeline.push(line);
 }
 return timeline;
}
