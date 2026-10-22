import {useEffect,useRef,useState} from "react";
import "./pfp-characters.css";
export default function PfpCharacter({src,design,active=true,className="",style={},onError}){
 const host=useRef(null),[running,setRunning]=useState(false);
 useEffect(()=>{
  const element=host.current;if(!element)return;
  let visible=false;
  const query=window.matchMedia("(prefers-reduced-motion: reduce)");
  const connection=/** @type {Navigator & {connection?:{saveData?:boolean}}} */(navigator).connection;
  const update=()=>setRunning(active&&visible&&!document.hidden&&!query.matches&&!connection?.saveData);
  let observer;
  if(typeof IntersectionObserver!=="undefined"){observer=new IntersectionObserver(entries=>{visible=entries[0]?.isIntersecting;update();});observer.observe(element);}
  else{visible=true;update();}
  query.addEventListener?.("change",update);document.addEventListener("visibilitychange",update);
  return()=>{observer?.disconnect();query.removeEventListener?.("change",update);document.removeEventListener("visibilitychange",update);};
 },[active]);
 return <span ref={host} className={"pfp-character "+className} data-character={design.id} data-running={running?"true":"false"} style={/** @type {import("react").CSSProperties} */({...style,"--pfp-duration":design.duration+"s","--pfp-delay":design.delay+"s","--pfp-ink":design.color})}>
  <img className="pfp-character-art" src={src} alt="" loading="lazy" onError={onError}/>
  <svg className="pfp-character-accent" viewBox="0 0 100 100" aria-hidden="true" focusable="false">
   <g className="pfp-character-mark" style={{transformOrigin:design.x+"px "+design.y+"px"}}><g transform={"translate("+(design.x-12)+" "+(design.y-12)+") scale(.67)"}><path d={design.path}/></g></g>
  </svg>
 </span>;
}
