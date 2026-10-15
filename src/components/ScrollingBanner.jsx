import {useEffect,useRef,useState} from "react";
import {useBannerMessages} from "@/hooks/useBannerMessages";
export default function ScrollingBanner(){
 const {messages}=useBannerMessages();
 const root=useRef(null),copy=useRef(null);
 const [geometry,setGeometry]=useState({width:0,duration:28});
 const [paused,setPaused]=useState(false);
 useEffect(()=>{
  const measure=()=>{const width=root.current?.clientWidth||0;const length=Math.max(width,copy.current?.scrollWidth||0);setGeometry(previous=>previous.width===width&&previous.duration===Math.max(20,length/28)?previous:{width,duration:Math.max(20,length/28)});};
  measure();const observer=new ResizeObserver(measure);if(root.current)observer.observe(root.current);if(copy.current)observer.observe(copy.current);
  return()=>observer.disconnect();
 },[messages.join("|")]);
 useEffect(()=>{const update=()=>setPaused(document.hidden);document.addEventListener("visibilitychange",update);update();return()=>document.removeEventListener("visibilitychange",update);},[]);
 return <div ref={root} className="public-banner" style={{"--banner-width":geometry.width+"px","--banner-duration":geometry.duration+"s"}} aria-label="PUBLIC announcements">
  <div className="public-banner-track" style={paused?{animationPlayState:"paused"}:undefined}>
   {[0,1].map(group=><div className="public-banner-copy" key={group} ref={group===0?copy:undefined} aria-hidden={group===1?"true":undefined}>{messages.map((message,index)=><span key={index}>{message}</span>)}</div>)}
  </div>
 </div>;
}
