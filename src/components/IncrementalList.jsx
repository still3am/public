import {useEffect,useRef,useState} from "react";
const STEP=120;
/** Render long collections gradually while keeping the complete playback queue. */
export default function IncrementalList({items,renderItem,className}){
 const [progress,setProgress]=useState(()=>({items,shown:STEP})),sentinel=useRef(null);
 const total=items.length,shown=progress.items===items?progress.shown:STEP;
 useEffect(()=>setProgress({items,shown:STEP}),[items]);
 const more=()=>setProgress(previous=>({items,shown:Math.min(total,(previous.items===items?previous.shown:STEP)+STEP)}));
 useEffect(()=>{
  if(shown>=total||!sentinel.current||typeof IntersectionObserver==="undefined")return;
  const observer=new IntersectionObserver(entries=>{if(entries.some(entry=>entry.isIntersecting))more();},{rootMargin:"600px"});
  observer.observe(sentinel.current);return()=>observer.disconnect();
 },[shown,total,items]);
 return <>
  <div className={className}>{items.slice(0,shown).map(renderItem)}</div>
  {shown<total&&<div ref={sentinel} className="incremental-list-more flex flex-wrap items-center justify-center gap-4 mt-6 py-4 text-xs text-muted-foreground"><span aria-live="polite">Showing {Math.min(shown,total)} of {total}</span><button type="button" className="playlist-action" onClick={more}>Show more</button></div>}
 </>;
}
