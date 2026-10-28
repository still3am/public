import {useEffect,useRef,useState} from "react";
import {useCoverUrl} from "@/hooks/useCoverUrl";

// Static posters remain visible when autoplay is unavailable or motion is reduced.
export default function ProfileMedia({src,videoSrc="",gifSrc="",mobileSrc="",motion=true,active=true,className="",style={},onError=undefined,alt=""}) {
  const host=useRef(null),video=useRef(null),[visible,setVisible]=useState(false),[reduced,setReduced]=useState(true),[failed,setFailed]=useState(false),[autoplayBlocked,setAutoplayBlocked]=useState(false);
  const poster=useCoverUrl(src),mobile=useCoverUrl(mobileSrc);
  useEffect(()=>{setFailed(false);setAutoplayBlocked(false);},[videoSrc,gifSrc,src]);
  useEffect(()=>{
    const query=window.matchMedia("(prefers-reduced-motion: reduce)"),connection=/** @type {Navigator & {connection?: {saveData?: boolean,addEventListener?: Function,removeEventListener?: Function}}} */ (navigator).connection;
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
    el.muted=true;el.defaultMuted=true;el.playsInline=true;
    let alive=true;
    const rejected=error=>{if(!alive||error?.name==="AbortError")return;if(error?.name==="NotAllowedError")setAutoplayBlocked(true);else setFailed(true);};
    if(play){try{const request=el.play();request?.then(()=>{if(alive)setAutoplayBlocked(false);}).catch(rejected);}catch(error){rejected(error);}}else el.pause();
    return()=>{alive=false;el.pause();};
  },[play,videoSrc]);
  const retryAnimation=()=>{
    const el=video.current;if(!autoplayBlocked||!play||!el)return;
    el.muted=true;
    try{el.play()?.then(()=>setAutoplayBlocked(false)).catch(()=>{});}catch{}
  };
  return <span onPointerDown={retryAnimation} onKeyDown={event=>{if(event.key==="Enter"||event.key===" ")retryAnimation();}} ref={host} className={"public-profile-media "+className} style={{display:"block",position:"relative",overflow:"hidden",...style}}>
    <picture style={{display:"block",width:"100%",height:"100%"}}>{mobile&&<source media="(max-width:767px)" srcSet={mobile}/>}<img src={poster||undefined} alt={alt} onError={onError} style={{display:"block",width:"100%",height:"100%",objectFit:"cover"}}/></picture>
    {gifSrc&&animate&&<img src={gifSrc} alt="" aria-hidden="true" onError={()=>setFailed(true)} style={{position:"absolute",inset:0,width:"100%",height:"100%",objectFit:"cover",pointerEvents:"none"}}/>}
    {autoplayBlocked&&play&&<span aria-hidden="true" style={{position:"absolute",bottom:8,left:"50%",transform:"translateX(-50%)",zIndex:1,whiteSpace:"nowrap",padding:"4px 7px",borderRadius:999,background:"#080809db",color:"white",fontSize:9,pointerEvents:"none"}}>Tap to animate</span>}
    {play&&<video ref={video} src={videoSrc} poster={poster||undefined} muted loop playsInline autoPlay preload="metadata" aria-hidden="true" tabIndex={-1} onError={()=>setFailed(true)} style={{position:"absolute",inset:0,width:"100%",height:"100%",objectFit:"cover",pointerEvents:"none"}}/>}
  </span>;
}
