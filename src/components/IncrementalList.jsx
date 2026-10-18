import {useEffect,useRef,useState} from "react";
const STEP=120;
/** Render long collections gradually while keeping the complete playback queue. */
export default function IncrementalList({items,renderItem,className}){
 const [shown,setShown]=useState(STEP),sentinel=useRef(null);
 const total=items.length;
 useEffect(()=>setShown(STEP),[items]);
 useEffect(()=>{
  if(shown>=total||!sentinel.current||typeof IntersectionObserver==="undefined")return;
  const observer=new IntersectionObserver(entries=>{if(entries.some(entry=>entry.isIntersecting))setShown(n=>Math.min(total,n+STEP));},{rootMargin:"600px"});
  observer.observe(sentinel.current);return()=>observer.disconnect();
 },[shown,total]);
 return <>
  <div className={className}>{items.slice(0,shown).map(renderItem)}</div>
  {shown<total&&<div ref={sentinel} className="incremental-list-more"><span aria-live="polite">Showing {Math.min(shown,total)} of {total}</span><button type="button" className="playlist-action" onClick={()=>setShown(n=>Math.min(total,n+STEP))}>Show more</button></div>}
 </>;
}
