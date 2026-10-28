import {useEffect,useRef,useState} from 'react';
import {readLyricClock,findLyricIndex} from '@/lib/lyricClock';
export function useLyricClock({trackId,position,enabled,readPosition,viewport,lines=[]}) {
 const [sample,setSample]=useState({trackId:null,position:0,segment:-2});
 const latest=useRef({position,readPosition,lines});latest.current={position,readPosition,lines};
 useEffect(()=>{
  if(!enabled||!readPosition)return;
  let frame=0,last=0,visible=true,disposed=false;
  const tick=now=>{
   frame=0;if(disposed||document.hidden||!visible)return;
   if(now-last>=50){last=now;const value=readLyricClock(latest.current.readPosition,trackId,latest.current.position);
    const timeline=latest.current.lines,segment=timeline.length?findLyricIndex(timeline,value):-2;
    const precise=segment===-2||!!timeline[segment]?.words?.length;
    setSample(previous=>previous.trackId===trackId&&(previous.position===value||(!precise&&previous.segment===segment))?previous:{trackId,position:value,segment});}
   frame=requestAnimationFrame(tick);
  };
  const wake=()=>{cancelAnimationFrame(frame);last=0;if(!disposed&&!document.hidden&&visible)frame=requestAnimationFrame(tick);};
  const observer=typeof IntersectionObserver!=='undefined'?new IntersectionObserver(entries=>{visible=entries[0]?.isIntersecting??true;wake();}):null;
  if(viewport.current)observer?.observe(viewport.current);
  document.addEventListener('visibilitychange',wake);wake();
  return()=>{disposed=true;cancelAnimationFrame(frame);observer?.disconnect();document.removeEventListener('visibilitychange',wake);};
 },[trackId,enabled,readPosition,viewport]);
 // A parent seek update takes effect immediately, before the next clock tick.
 const fallback=sample.trackId===trackId&&Math.abs(sample.position-position)<.5?sample.position:position;
 return readLyricClock(readPosition,trackId,fallback);
}
