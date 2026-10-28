import {useEffect,useRef,useState} from 'react';
import {usePlayer} from '@/context/PlayerContext';
import './lyric-interlude.css';
export default function LyricInterlude({active=false,progress=null}) {
 const player=usePlayer(),root=useRef(null),[visible,setVisible]=useState(true),[foreground,setForeground]=useState(true);
 useEffect(()=>{
  const update=()=>setForeground(!document.hidden);update();
  document.addEventListener('visibilitychange',update);
  const observer=typeof IntersectionObserver!=='undefined'?new IntersectionObserver(entries=>setVisible(entries[0]?.isIntersecting??true)):null;
  if(root.current)observer?.observe(root.current);
  return()=>{observer?.disconnect();document.removeEventListener('visibilitychange',update);};
 },[]);
 const timed=typeof progress==="number"&&Number.isFinite(progress);
 const fill=timed?Math.max(0,Math.min(1,progress)):0;
 const moving=active&&player?.isPlaying&&visible&&foreground;
 return <span ref={root} className="lyric-interlude" data-timed={timed?"true":"false"} data-active={active?'true':'false'} data-moving={moving?'true':'false'} role="img" aria-label="Instrumental passage">
  {[0,1,2].map(i=>{
   const amount=Math.max(0,Math.min(1,fill*3-i));
   const eased=amount*amount*(3-2*amount);
   return <span key={i} className="lyric-interlude-dot" data-fill={timed?amount:undefined} aria-hidden="true" style={{animationDelay:(i*-.32)+'s',...(timed?{
    backgroundImage:'linear-gradient(to top,currentColor '+eased*100+'%,rgba(255,255,255,.18) '+eased*100+'%)',
    opacity:.5+eased*.5,
    transform:'translateY('+(-Math.sin(amount*Math.PI)*2)+'px) scale('+(.88+eased*.12)+')'
   }:{})}}/>;
  })}
 </span>;
}
