import {useEffect,useRef,useState} from "react";
import {ChevronLeft,ChevronRight} from "lucide-react";
/** Native touch/trackpad scrolling; optional exact-page controls for profile cards. */
export default function ScrollShelf({children,className="",label="Music shelf",paged=false}){
 const rail=useRef(null),targets=useRef([]),requested=useRef(null),settle=useRef(null);
 const [state,setState]=useState({overflow:false,start:true,end:false,index:0,count:0});
 useEffect(()=>{
  const element=rail.current;if(!element)return;
  let frame=0;
  const update=()=>{
   frame=0;
   const end=Math.max(0,element.scrollWidth-element.clientWidth);
   const left=Math.max(0,Math.min(end,element.scrollLeft));
   let index=0;
   if(paged)targets.current.forEach((target,i)=>{if(Math.abs(target-left)<Math.abs((targets.current[index]||0)-left))index=i;});
   const next={overflow:end>4,start:left<=2,end:left>=end-2,index,count:element.children.length};
   setState(old=>Object.keys(next).every(key=>old[key]===next[key])?old:next);
  };
  const schedule=()=>{if(!frame)frame=requestAnimationFrame(update);};
  const measure=()=>{
   if(paged){
    const origin=element.getBoundingClientRect().left,padding=parseFloat(getComputedStyle(element).scrollPaddingLeft)||0;
    const end=Math.max(0,element.scrollWidth-element.clientWidth);
    targets.current=Array.from(element.children,child=>Math.max(0,Math.min(end,child.getBoundingClientRect().left-origin+element.scrollLeft-padding)));
   }
   schedule();
  };
  const reset=()=>{requested.current=null;};
  measure();element.addEventListener("scroll",schedule,{passive:true});
  element.addEventListener("scrollend",reset);
  element.addEventListener("pointerdown",reset,{passive:true});
  element.addEventListener("wheel",reset,{passive:true});
  const observer=typeof ResizeObserver!=="undefined"?new ResizeObserver(measure):null;
  observer?.observe(element);for(const child of element.children)observer?.observe(child);
  window.addEventListener("resize",measure);
  return()=>{cancelAnimationFrame(frame);clearTimeout(settle.current);requested.current=null;element.removeEventListener("scroll",schedule);element.removeEventListener("scrollend",reset);element.removeEventListener("pointerdown",reset);element.removeEventListener("wheel",reset);observer?.disconnect();window.removeEventListener("resize",measure);};
 },[children,paged]);
 const behavior=()=>window.matchMedia("(prefers-reduced-motion:reduce)").matches?"auto":"smooth";
 const goTo=index=>{
  const element=rail.current;if(!element)return;
  const target=Math.max(0,Math.min(targets.current.length-1,index));
  requested.current=target;
  element.scrollTo({left:targets.current[target]||0,behavior:behavior()});
  clearTimeout(settle.current);settle.current=setTimeout(()=>{requested.current=null;},800);
 };
 const move=direction=>{
  const element=rail.current;if(!element)return;
  if(paged)goTo((requested.current??state.index)+direction);
  else element.scrollBy({left:direction*element.clientWidth*.85,behavior:behavior()});
 };
 const onKeyDown=event=>{
  if(event.target!==event.currentTarget||!state.overflow)return;
  if(event.key==="ArrowLeft"||event.key==="ArrowRight"){event.preventDefault();move(event.key==="ArrowLeft"?-1:1);}
  else if(event.key==="Home"||event.key==="End"){event.preventDefault();if(paged)goTo(event.key==="Home"?0:state.count-1);else rail.current?.scrollTo({left:event.key==="Home"?0:rail.current.scrollWidth-rail.current.clientWidth,behavior:behavior()});}
 };
 const controls=<div className={paged?"paged-shelf-controls":"desktop-shelf-controls"} hidden={!state.overflow}>
  <button type="button" className={paged?"shelf-page-arrow":undefined} disabled={state.start} aria-label={"Previous "+label} onClick={()=>move(-1)}><ChevronLeft size={17}/></button>
  {paged&&<div className="shelf-page-dots" aria-label={label+" pages"}>{Array.from({length:state.count},(_,index)=><button key={index} type="button" aria-label={"Show item "+(index+1)+" in "+label} aria-pressed={index===state.index} onClick={()=>goTo(index)}><span/></button>)}</div>}
  <button type="button" className={paged?"shelf-page-arrow":undefined} disabled={state.end} aria-label={"Next "+label} onClick={()=>move(1)}><ChevronRight size={17}/></button>
 </div>;
 return <div className={"scroll-shelf"+(paged?" is-paged":"")}>{!paged&&controls}<div ref={rail} data-horizontal-scroll onKeyDown={onKeyDown} className={className} role="region" aria-label={label} tabIndex={0}>{children}</div>{paged&&controls}</div>;
}
