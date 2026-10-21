import {useEffect} from "react";
export function contentClearance(viewportHeight,rects){return Math.max(24,...rects.filter(rect=>rect.width>0&&rect.height>0&&rect.top<viewportHeight&&rect.bottom>0).map(rect=>Math.max(0,viewportHeight-rect.top)+24));}
export function useContentClearance(trackId,path){
 useEffect(()=>{
  const root=document.documentElement,viewport=window.visualViewport;let frame=0;
  const update=()=>{frame=0;
   const small=window.matchMedia("(max-width:767px)").matches;
   const focused=document.activeElement,typing=focused?.matches?.('input:not([type="range"]):not([type="checkbox"]):not([type="radio"]),textarea,[contenteditable="true"]');
   const keyboard=small&&typing&&viewport&&window.innerHeight-viewport.height-viewport.offsetTop>100;
   root.toggleAttribute("data-public-editing-keyboard",!!keyboard);
   const elements=[...document.querySelectorAll('.public-app .mobile-tab-bar,.public-app .player-surface')];
   const rects=elements.filter(element=>getComputedStyle(element).display!=="none"&&getComputedStyle(element).visibility!=="hidden").map(element=>element.getBoundingClientRect());
   root.style.setProperty("--public-measured-clearance",contentClearance(window.innerHeight,rects)+"px");
   if(keyboard&&focused&&!focused.closest('.mobile-tab-bar')){
    const rect=focused.getBoundingClientRect(),bottom=viewport.height+viewport.offsetTop;
    if(rect.bottom>bottom-16||rect.top<viewport.offsetTop+16)focused.scrollIntoView({block:"center",behavior:"auto"});
   }
  };
  const schedule=()=>{if(!frame)frame=requestAnimationFrame(update);};
  const observer=typeof ResizeObserver!=="undefined"?new ResizeObserver(schedule):null;
  document.querySelectorAll('.public-app .mobile-tab-bar,.public-app .player-surface').forEach(element=>observer?.observe(element));
  window.addEventListener("resize",schedule);viewport?.addEventListener("resize",schedule);viewport?.addEventListener("scroll",schedule);document.addEventListener("focusin",schedule);document.addEventListener("focusout",schedule);schedule();
  return()=>{cancelAnimationFrame(frame);observer?.disconnect();window.removeEventListener("resize",schedule);viewport?.removeEventListener("resize",schedule);viewport?.removeEventListener("scroll",schedule);document.removeEventListener("focusin",schedule);document.removeEventListener("focusout",schedule);root.removeAttribute("data-public-editing-keyboard");root.style.removeProperty("--public-measured-clearance");};
 },[trackId,path]);
}
