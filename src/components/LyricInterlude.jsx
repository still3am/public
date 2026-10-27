import {useEffect,useRef} from 'react';
import {usePlayer} from '@/context/PlayerContext';
import './lyric-interlude.css';
export default function LyricInterlude({active=false}) {
 const player=usePlayer(),latest=useRef(player),bars=useRef([]);latest.current=player;
 useEffect(()=>{
  let frame=0,last=0,values=null;const levels=new Float32Array(9);
  const reduced=window.matchMedia('(prefers-reduced-motion: reduce)');
  if(active&&latest.current?.isPlaying)latest.current?.enableAnalyser?.();
  const draw=now=>{
   frame=0;if(document.hidden)return;
   if(now-last<40){frame=requestAnimationFrame(draw);return;}last=now;
   const p=latest.current,analyser=p?.getAnalyser?.();
   if(analyser&&active&&p.isPlaying&&!reduced.matches){if(!values||values.length!==analyser.frequencyBinCount)values=new Uint8Array(analyser.frequencyBinCount);analyser.getByteFrequencyData(values);}
   for(let i=0;i<9;i++){
    const target=values&&active&&p?.isPlaying&&!reduced.matches?values[Math.min(values.length-1,Math.floor(Math.pow(i/9,1.8)*values.length*.6))]/255:0;
    levels[i]+=(target-levels[i])*(target>levels[i] ? .5 : .18);
    if(bars.current[i])bars.current[i].style.transform='scaleY('+(.12+levels[i]*.88)+')';
   }
   if(active&&p?.isPlaying&&!reduced.matches)frame=requestAnimationFrame(draw);
  };
  const wake=()=>{cancelAnimationFrame(frame);frame=requestAnimationFrame(draw);};
  document.addEventListener('visibilitychange',wake);reduced.addEventListener('change',wake);wake();
  return()=>{cancelAnimationFrame(frame);document.removeEventListener('visibilitychange',wake);reduced.removeEventListener('change',wake);};
 },[active,player?.isPlaying]);
 return <span className="lyric-interlude" role="img" aria-label="Instrumental passage"><span className="lyric-interlude-bars" aria-hidden="true">{Array.from({length:9},(_,i)=><i key={i} ref={node=>{bars.current[i]=node;}}/>)}</span></span>;
}
