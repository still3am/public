import {useEffect} from 'react';
// Paint only the active line's existing highlight layers. No React redraw or
// wall-clock extrapolation: paused/buffering audio leaves every word in place.
export function useKaraokePaint({viewport,trackId,activeIndex,readPosition,lines}){
 useEffect(()=>{
  const container=viewport.current;
  if(!container||!readPosition)return;
  const nodes=[...container.querySelectorAll('[aria-current="true"] [data-karaoke-start]')];
  if(!nodes.length)return;
  let frame=0,disposed=false,visible=true,last=-1;
  const tick=()=>{
   frame=0;if(disposed||!visible||document.hidden)return;
   const seconds=readPosition(trackId);
   if(typeof seconds==='number'&&Number.isFinite(seconds)&&seconds!==last){
    last=seconds;const ms=Math.max(0,seconds)*1000;
    for(const node of nodes){
     const start=Number(node.dataset.karaokeStart),end=Number(node.dataset.karaokeEnd);
     if(!Number.isFinite(start)||!Number.isFinite(end)||end<=start)continue;
     const progress=Math.max(0,Math.min(1,(ms-start)/(end-start)));
     const clip='inset(0 '+((1-progress)*100).toFixed(3)+'% 0 0)';
     if(node.style.clipPath!==clip)node.style.clipPath=clip;
     const singing=ms>=start&&ms<end;
     const parent=node.parentElement;
     if(singing){if(parent?.getAttribute?.('data-singing')!=='true')parent?.setAttribute('data-singing','true');}
     else if(parent?.getAttribute?.('data-singing')==='true')parent?.removeAttribute('data-singing');
    }
   }
   frame=requestAnimationFrame(tick);
  };
  const wake=()=>{cancelAnimationFrame(frame);if(!disposed&&visible&&!document.hidden)frame=requestAnimationFrame(tick);};
  const observer=typeof IntersectionObserver==='undefined'?null:new IntersectionObserver(entries=>{visible=entries[0]?.isIntersecting??true;wake();});
  observer?.observe(container);document.addEventListener('visibilitychange',wake);wake();
  return()=>{disposed=true;cancelAnimationFrame(frame);observer?.disconnect();document.removeEventListener('visibilitychange',wake);};
 },[viewport,trackId,activeIndex,readPosition,lines]);
}
