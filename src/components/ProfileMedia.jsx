import {useEffect,useRef,useState} from "react";
import {useCoverUrl} from "@/hooks/useCoverUrl";

// Static posters remain visible when autoplay is unavailable or motion is reduced.
export default function ProfileMedia({src,videoSrc="",gifSrc="",mobileSrc="",motion=true,active=true,className="",style={},onError=undefined,alt=""}) {
  const host=useRef(null),video=useRef(null),[visible,setVisible]=useState(false),[reduced,setReduced]=useState(true),[failed,setFailed]=useState(false);
  const poster=useCoverUrl(src),mobile=useCoverUrl(mobileSrc);
  useEffect(()=>{setFailed(false);},[videoSrc,gifSrc,src]);
  useEffect(()=>{
    const query=window.matchMedia("(prefers-reduced-motion: reduce)"),connection=navigator.connection;
    const update=()=>setReduced(query.matches||!!connection?.saveData);
    update();query.addEventListener?.("change",update);connection?.addEventListener?.("change",update);
    return()=>{query.removeEventListener?.("change",update);connection?.removeEventListener?.("change",update);};
  },[]);
  useEffect(()=>{
    const el=host.current;if(!el)return;
    const visibility=()=>setVisible(!document.hidden&&el.getBoundingClientRect().bottom>0&&el.getBoundingClientRect().top<innerHeight);
    let observer;
    if(typeof IntersectionObserver!=="undefined"){observer=new IntersectionObserver(entries=>setVisible(entries[0].isIntersecting&&!document.hidden));observer.observe(el);}else visibility();
    document.addEventListener("visibilitychange",visibility);
    return()=>{observer?.disconnect();document.removeEventListener("visibilitychange",visibility);};
  },[]);
  const animate=motion&&active&&!reduced&&visible&&!failed;
  const play=!!videoSrc&&animate;
  useEffect(()=>{
    const el=video.current;if(!el)return;
    el.muted=true;
    let alive=true;
    if(play){const request=el.play();request?.catch(()=>{if(alive)setFailed(true);});}else el.pause();
    return()=>{alive=false;el.pause();};
  },[play,videoSrc]);
  return <span ref={host} className={"public-profile-media "+className} style={{display:"block",position:"relative",overflow:"hidden",...style}}>
    <picture style={{display:"block",width:"100%",height:"100%"}}>{mobile&&<source media="(max-width:767px)" srcSet={mobile}/>}<img src={poster||undefined} alt={alt} onError={onError} style={{display:"block",width:"100%",height:"100%",objectFit:"cover"}}/></picture>
    {gifSrc&&animate&&<img src={gifSrc} alt="" aria-hidden="true" onError={()=>setFailed(true)} style={{position:"absolute",inset:0,width:"100%",height:"100%",objectFit:"cover",pointerEvents:"none"}}/>}
    {play&&<video ref={video} src={videoSrc} poster={poster||undefined} muted loop playsInline autoPlay preload="metadata" aria-hidden="true" tabIndex={-1} onError={()=>setFailed(true)} style={{position:"absolute",inset:0,width:"100%",height:"100%",objectFit:"cover",pointerEvents:"none"}}/>}
  </span>;
}
