import { useEffect, useRef, useState } from "react";
import { Loader2, ArrowDown } from "lucide-react";

const THRESHOLD = 70;

/** @param {any} props */
export default function PullToRefresh({
  onRefresh,
  disabled = false,
  children,
  className = "",
}) {
  const startY = useRef(null);
  const [pull, setPull] = useState(0);
  const [refreshing, setRefreshing] = useState(false);

  const pullRef = useRef(0);
  const refreshingRef = useRef(false);
  const onRefreshRef = useRef(onRefresh);
  const rootRef = useRef(null);

  // Kept-alive tabs stay mounted while hidden — an invisible page must never
  // react to (or refresh on) a pull gesture that belongs to the visible one.
  const isVisible = () => rootRef.current?.offsetParent !== null;

  useEffect(() => {
    pullRef.current = pull;
  }, [pull]);
  useEffect(() => {
    refreshingRef.current = refreshing;
  }, [refreshing]);
  useEffect(() => {
    onRefreshRef.current = onRefresh;
  }, [onRefresh]);

  useEffect(()=>{
    if(disabled){startY.current=null;pullRef.current=0;setPull(0);return;}
    let alive=true,startX=null;
    const cancel=()=>{startY.current=null;startX=null;if(!refreshingRef.current){pullRef.current=0;setPull(0);}};
    const onStart=event=>{
      const root=rootRef.current,target=event.target;
      if(!isVisible()||!root?.contains(target)||event.touches.length!==1||window.scrollY>0||refreshingRef.current)return;
      if(target instanceof Element&&target.closest('button,a,input,textarea,select,[role="button"],[role="checkbox"],[role="dialog"],[data-rfd-drag-handle-draggable-id]'))return;
      const touch=event.touches[0];startY.current=touch.clientY;startX=touch.clientX;
    };
    const onMove=event=>{
      if(startY.current==null||refreshingRef.current||!isVisible())return;
      if(event.touches.length!==1||window.scrollY>0){cancel();return;}
      const touch=event.touches[0],dy=touch.clientY-startY.current,dx=Math.abs(touch.clientX-startX);
      if(dy<0||(dx>10&&dx>dy)){cancel();return;}
      if(dy>4&&dy>dx){if(event.cancelable)event.preventDefault();const next=Math.min(THRESHOLD*1.5,dy*.5);pullRef.current=next;setPull(next);}
    };
    const onEnd=async()=>{
      const reached=startY.current!=null&&isVisible()&&window.scrollY<=0&&pullRef.current>=THRESHOLD;
      startY.current=null;startX=null;
      if(!reached||refreshingRef.current||!onRefreshRef.current){if(!refreshingRef.current){pullRef.current=0;setPull(0);}return;}
      refreshingRef.current=true;setRefreshing(true);setPull(THRESHOLD);
      try{await onRefreshRef.current();}catch{/* Keep the loaded page available after a failed refresh. */}
      finally{refreshingRef.current=false;pullRef.current=0;if(alive){setRefreshing(false);setPull(0);}}
    };
    window.addEventListener('touchstart',onStart,{passive:true});window.addEventListener('touchmove',onMove,{passive:false});window.addEventListener('touchend',onEnd,{passive:true});window.addEventListener('touchcancel',cancel,{passive:true});
    return()=>{alive=false;startY.current=null;window.removeEventListener('touchstart',onStart);window.removeEventListener('touchmove',onMove);window.removeEventListener('touchend',onEnd);window.removeEventListener('touchcancel',cancel);};
  },[disabled]);

  return (
    <div ref={rootRef} className={`relative ${className}`}>
      {!disabled&&(pull > 0 || refreshing) && (
        <div
          className="grid place-items-center text-foreground/60 overflow-hidden transition-[height] duration-150 ease-out"
          style={{
            height: `${pull}px`,
            opacity: refreshing ? 1 : Math.min(1, pull / THRESHOLD),
          }}
        >
          {refreshing ? (
            <Loader2 size={22} className="animate-spin" />
          ) : (
            <ArrowDown
              size={22}
              className="transition-transform"
              style={{
                transform: `rotate(${(pull / THRESHOLD) * 180}deg)`,
              }}
            />
          )}
        </div>
      )}
      {children}
    </div>
  );
}