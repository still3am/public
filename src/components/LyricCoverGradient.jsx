import {useEffect,useRef,useState} from 'react';
import MotionGradient from '@/components/MotionGradient';
import {useColorPalette} from '@/hooks/useColorPalette';
import './lyric-card-motion.css';

export default function LyricCoverGradient({cover,animated}){
  const palette=useColorPalette(cover,true,5);
  const host=useRef(null);
  const [visible,setVisible]=useState(false);
  useEffect(()=>{
    if(!animated)return;
    const node=host.current;
    if(!node)return;
    if(typeof IntersectionObserver==='undefined'){setVisible(true);return;}
    const observer=new IntersectionObserver(([entry])=>setVisible(entry.isIntersecting));
    observer.observe(node);
    return()=>observer.disconnect();
  },[animated]);
  return <div ref={host} className="public-lyric-cover-gradient" aria-hidden="true"
    style={{backgroundImage:'linear-gradient(145deg,'+palette.join(',')+')'}}>
    {animated&&visible&&<MotionGradient colors={palette} speed={.85} className="absolute inset-0" />}
  </div>;
}
