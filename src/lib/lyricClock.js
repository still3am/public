// Use media time, never wall-clock extrapolation: buffering and playback-rate
// changes must not let lyrics advance independently of the song.
export function readLyricClock(readPosition,trackId,fallback=0) {
 const value=readPosition?.(trackId);
 return typeof value==='number'&&Number.isFinite(value)?Math.max(0,value):Math.max(0,Number(fallback)||0);
}
