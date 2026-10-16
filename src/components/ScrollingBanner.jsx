import {useEffect,useRef,useState} from "react";
import {useBannerMessages} from "@/hooks/useBannerMessages";
export default function ScrollingBanner(){
 const {messages,loading}=useBannerMessages();
 const root=useRef(null),copy=useRef(null);
 const [geometry,setGeometry]=useState({width:0,distance:0,duration:28});
 const [paused,setPaused]=useState(false);
 const signature=JSON.stringify(messages);
 useEffect(()=>{
  let frame=0,active=true;
  const measure=()=>{
   if(!active)return;
   const width=root.current?.clientWidth||0;
   const distance=Math.max(width,copy.current?.getBoundingClientRect().width||0);
   if(!width||!distance)return;
   const duration=Math.max(12,distance/30);
   setGeometry(previous=>previous.width===width&&previous.distance===distance?previous:{width,distance,duration});
  };
  const schedule=()=>{cancelAnimationFrame(frame);frame=requestAnimationFrame(measure);};
  measure();
  let observer;
  if(typeof ResizeObserver!=="undefined"){observer=new ResizeObserver(schedule);if(root.current)observer.observe(root.current);if(copy.current)observer.observe(copy.current);}
  window.addEventListener("resize",schedule);
  document.fonts?.ready?.then(()=>{if(active)schedule();});
  return()=>{active=false;cancelAnimationFrame(frame);observer?.disconnect();window.removeEventListener("resize",schedule);};
 },[signature,loading]);
 useEffect(()=>{const update=()=>setPaused(document.hidden);document.addEventListener("visibilitychange",update);update();return()=>document.removeEventListener("visibilitychange",update);},[]);
 return <div ref={root} className="public-banner" aria-busy={loading} style={{"--banner-width":geometry.width?geometry.width+"px":"100%","--banner-offset":-geometry.distance+"px","--banner-duration":geometry.duration+"s"}} role="region" aria-label="PUBLIC announcements">
  <span className="sr-only">{!loading&&messages.join(" · ")}</span>
  <div className="public-banner-track" aria-hidden="true" key={signature} style={{animationPlayState:paused||loading||!geometry.distance?"paused":undefined,visibility:loading?"hidden":undefined}}>
   {[0,1].map(group=><div className="public-banner-copy" key={group} ref={group===0?copy:undefined} aria-hidden={group===1?"true":undefined}>{messages.map((message,index)=><span key={index}>{message}</span>)}</div>)}
  </div>
 </div>;
}
