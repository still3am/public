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
