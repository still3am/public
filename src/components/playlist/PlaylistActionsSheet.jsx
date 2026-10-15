import { useEffect } from "react";
import { createPortal } from "react-dom";
import { X, ListMusic, ChevronRight } from "lucide-react";

export default function PlaylistActionsSheet({name,cover,subtitle,actions,onClose}) {
 useEffect(()=>{
  const previous=document.body.style.overflow;
  document.body.style.overflow="hidden";
  return()=>{document.body.style.overflow=previous;};
 },[]);
 return createPortal(<div role="dialog" aria-modal="true" aria-label="Playlist options" data-public-dialog tabIndex={-1} onKeyDown={e=>{if(e.key==="Escape"){e.stopPropagation();onClose();}}} className="fixed inset-0 z-[70] flex items-end justify-center p-0">
  <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose}/>
  <section className="relative w-full max-w-lg bg-card text-card-foreground border border-border rounded-t-[28px] shadow-2xl max-h-[85dvh] flex flex-col overflow-hidden pb-[env(safe-area-inset-bottom)]">
   <div aria-hidden="true" className="w-10 h-1 rounded-full bg-foreground/20 mx-auto mt-3 shrink-0"/>
   <header className="flex items-center gap-3 p-5 border-b border-border">
    <div className="w-14 h-14 rounded-xl overflow-hidden bg-muted grid place-items-center shrink-0">{cover?<img src={cover} alt="" className="w-full h-full object-cover"/>:<ListMusic size={24}/>}</div>
    <div className="min-w-0 flex-1"><h2 className="font-bold text-base truncate">{name}</h2><p className="text-xs text-muted-foreground mt-1">{subtitle}</p></div>
    <button onClick={onClose} aria-label="Close playlist options" className="w-11 h-11 min-h-11 shrink-0 rounded-full bg-foreground/5 grid place-items-center"><X size={20}/></button>
   </header>
   <div className="overflow-y-auto overscroll-contain px-3 py-2">
    {actions.map(({label,description,icon:Icon,disabled,onClick})=><button key={label} disabled={disabled} onClick={()=>{onClose();onClick();}} className="w-full flex items-center gap-3 px-3 py-3 min-h-[60px] text-left rounded-xl hover:bg-foreground/5 active:bg-foreground/10 disabled:opacity-35">
      <span className="w-10 h-10 rounded-xl bg-foreground/5 grid place-items-center shrink-0"><Icon size={20}/></span>
      <span className="min-w-0 flex-1"><span className="block text-sm font-semibold">{label}</span>{description&&<span className="block text-xs text-muted-foreground mt-0.5">{description}</span>}</span>
      <ChevronRight size={16} className="text-muted-foreground shrink-0"/>
    </button>)}
   </div>
  </section>
 </div>,document.body);
}
