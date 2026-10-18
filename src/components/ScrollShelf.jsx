import {useEffect,useRef,useState} from "react";
import {ChevronLeft,ChevronRight} from "lucide-react";
/** Mouse buttons on desktop; native swipe and keyboard scrolling on every size. */
export default function ScrollShelf({children,className="",label="Music shelf"}){
 const rail=useRef(null),[state,setState]=useState({overflow:false,start:true,end:false});
 useEffect(()=>{
  const element=rail.current;if(!element)return;
  const update=()=>setState(old=>{const next={overflow:element.scrollWidth>element.clientWidth+4,start:element.scrollLeft<=2,end:element.scrollLeft+element.clientWidth>=element.scrollWidth-2};return old.overflow===next.overflow&&old.start===next.start&&old.end===next.end?old:next;});
  update();element.addEventListener("scroll",update,{passive:true});
  const observer=typeof ResizeObserver!=="undefined"?new ResizeObserver(update):null;
  observer?.observe(element);for(const child of element.children)observer?.observe(child);
  window.addEventListener("resize",update);
  return()=>{element.removeEventListener("scroll",update);observer?.disconnect();window.removeEventListener("resize",update);};
 },[children]);
 const move=direction=>{const element=rail.current;if(element)element.scrollBy({left:direction*element.clientWidth*.85,behavior:window.matchMedia("(prefers-reduced-motion:reduce)").matches?"auto":"smooth"});};
 return <div className="scroll-shelf"><div className="desktop-shelf-controls" hidden={!state.overflow}><button type="button" disabled={state.start} aria-label={"Scroll "+label+" left"} onClick={()=>move(-1)}><ChevronLeft size={16}/></button><button type="button" disabled={state.end} aria-label={"Scroll "+label+" right"} onClick={()=>move(1)}><ChevronRight size={16}/></button></div><div ref={rail} className={className} role="region" aria-label={label} tabIndex={0}>{children}</div></div>;
}
