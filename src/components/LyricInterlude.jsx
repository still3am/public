import {useEffect,useRef,useState} from 'react';
import {usePlayer} from '@/context/PlayerContext';
import './lyric-interlude.css';
export default function LyricInterlude({active=false}) {
 const player=usePlayer(),root=useRef(null),[visible,setVisible]=useState(true),[foreground,setForeground]=useState(true);
 useEffect(()=>{
  const update=()=>setForeground(!document.hidden);update();
  document.addEventListener('visibilitychange',update);
  const observer=typeof IntersectionObserver!=='undefined'?new IntersectionObserver(entries=>setVisible(entries[0]?.isIntersecting??true)):null;
  if(root.current)observer?.observe(root.current);
  return()=>{observer?.disconnect();document.removeEventListener('visibilitychange',update);};
 },[]);
 const moving=active&&player?.isPlaying&&visible&&foreground;
 return <span ref={root} className="lyric-interlude" data-active={active?'true':'false'} data-moving={moving?'true':'false'} role="img" aria-label="Instrumental passage">
  {[0,1,2].map(i=><span key={i} className="lyric-interlude-dot" aria-hidden="true" style={{animationDelay:(i*-.24)+'s'}}/>)}
 </span>;
}
