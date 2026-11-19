import {useEffect,useRef,useState} from "react";
import {ChevronLeft,ChevronRight} from "lucide-react";
/** Native touch/trackpad scrolling; optional exact-page controls for profile cards. */
export default function ScrollShelf({children,className="",label="Music shelf",paged=false,dragScroll=false}){
 const rail=useRef(null),targets=useRef([]),requested=useRef(null),settle=useRef(null);
 const drag=useRef(null),suppressClickUntil=useRef(0);
 const [dragging,setDragging]=useState(false);
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
 const finishDrag=event=>{
  const start=drag.current;if(!start||start.id!==event.pointerId)return;
  drag.current=null;setDragging(false);
  if(start.moved)suppressClickUntil.current=Date.now()+350;
  if(event.currentTarget.hasPointerCapture?.(event.pointerId))event.currentTarget.releasePointerCapture(event.pointerId);
 };
 const pointerDown=event=>{
  const element=event.currentTarget;
  if(!dragScroll||event.pointerType!=="mouse"||event.button!==0||element.scrollWidth<=element.clientWidth+4)return;
  if(event.target.closest?.('button,input,textarea,select,[contenteditable="true"]'))return;
  drag.current={id:event.pointerId,x:event.clientX,y:event.clientY,left:element.scrollLeft,moved:false};
 };
 const pointerMove=event=>{
  const start=drag.current;if(!start||start.id!==event.pointerId)return;
  const dx=event.clientX-start.x,dy=event.clientY-start.y;
  if(!start.moved){
   if(Math.abs(dy)>8&&Math.abs(dy)>Math.abs(dx)){drag.current=null;return;}
   if(Math.abs(dx)<8)return;
   start.moved=true;setDragging(true);event.currentTarget.setPointerCapture(event.pointerId);
  }
  event.preventDefault();
  event.currentTarget.scrollLeft=start.left-dx;
 };
 const previous=<button data-navigation-circle="" key="previous" type="button" className={paged?"shelf-page-arrow":undefined} disabled={state.start} aria-label={"Previous "+label} onClick={()=>move(-1)}><ChevronLeft size={17}/></button>;
 const next=<button data-navigation-circle="" key="next" type="button" className={paged?"shelf-page-arrow":undefined} disabled={state.end} aria-label={"Next "+label} onClick={()=>move(1)}><ChevronRight size={17}/></button>;
 const dotsStart=Math.max(0,Math.min(state.index-3,state.count-7));
 const dots=paged?<div key="pages" className="shelf-page-dots" aria-label={label+" pages"}>{Array.from({length:Math.min(7,state.count)},(_,offset)=>{const index=dotsStart+offset;return <button key={index} type="button" aria-label={"Show item "+(index+1)+" in "+label} aria-pressed={index===state.index} onClick={()=>goTo(index)}><span/></button>;})}</div>:null;
 const controls=<div className={paged?"paged-shelf-controls":"desktop-shelf-controls"} hidden={!state.overflow}>{paged?[previous,dots,next]:[previous,next]}</div>;
 return <div className={"scroll-shelf"+(paged?" is-paged":"")}>{!paged&&controls}<div ref={rail} data-horizontal-scroll data-drag-scroll={dragScroll||undefined} data-dragging={dragging||undefined}
 onPointerDown={pointerDown} onPointerMove={pointerMove} onPointerUp={finishDrag} onPointerCancel={finishDrag} onLostPointerCapture={finishDrag}
 onPointerLeave={event=>{if(drag.current&&!drag.current.moved)finishDrag(event);}}
 onClickCapture={event=>{if(event.detail>0&&Date.now()<suppressClickUntil.current){event.preventDefault();event.stopPropagation();}}}
 onDragStart={event=>{if(dragScroll)event.preventDefault();}}
 onKeyDown={onKeyDown} className={className} role="region" aria-label={label} tabIndex={0}>{children}</div>{paged&&controls}</div>;
}
