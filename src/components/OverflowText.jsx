import {useEffect,useRef,useState} from "react";
import "./overflow-text.css";
// The second copy is visual text only: artist links remain a single accessible set.
export default function OverflowText({text="",children,className=""}){
 const root=useRef(null),content=useRef(null),[distance,setDistance]=useState(0),[visible,setVisible]=useState(false);
 useEffect(()=>{
  const element=root.current,line=content.current;if(!element||!line)return;
  let alive=true;
  const measure=()=>{if(alive)setDistance(line.scrollWidth>element.clientWidth+2?line.scrollWidth+28:0);};
  const resize=new ResizeObserver(measure);resize.observe(element);resize.observe(line);
  const observer=new IntersectionObserver(entries=>setVisible(entries[0]?.isIntersecting||false));observer.observe(element);
  document.fonts?.ready.then(measure);measure();
  return()=>{alive=false;resize.disconnect();observer.disconnect();};
 },[text]);
 return <span ref={root} title={text} className={"overflow-text "+(distance?"has-overflow ":"")+className} style={{"--text-travel":distance+"px","--text-duration":Math.max(9,distance/24+3)+"s","--text-play":visible?"running":"paused"}}><span className="overflow-text-track"><span ref={content} className="overflow-text-copy">{children||text}</span>{distance>0&&<span className="overflow-text-copy overflow-text-duplicate" aria-hidden="true">{text}</span>}</span></span>;
}
