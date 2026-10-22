import {useState} from "react";
import {BANNER_PRESETS} from "@/lib/bannerPresets";
import ProfileMedia from "@/components/ProfileMedia";
import {Dialog,DialogContent,DialogHeader,DialogTitle,DialogDescription} from "@/components/ui/dialog";
import "./banner-gallery.css";
export default function BannerGallery({busy=false,onClose,onSelect}){
 const [selected,setSelected]=useState(BANNER_PRESETS[0].url);
 const banner=BANNER_PRESETS.find(item=>item.url===selected);
 return <Dialog open onOpenChange={open=>{if(!open&&!busy)onClose();}}><DialogContent className="public-banner-gallery"><DialogHeader><DialogTitle>Banner gallery</DialogTitle><DialogDescription>Choose a banner. Save your profile changes to apply it.</DialogDescription></DialogHeader>
 <div className="banner-gallery-grid">{BANNER_PRESETS.map(item=><button type="button" key={item.id} disabled={busy} aria-label={"Choose "+item.name+" banner"} aria-pressed={selected===item.url} onClick={()=>setSelected(item.url)}><ProfileMedia src={item.url} gifSrc={item.gifUrl} className="banner-gallery-art"/><span><strong>{item.name}</strong><small>{item.gifUrl?"GIF":"Image"}</small></span></button>)}</div>
 <div className="banner-gallery-actions"><button type="button" disabled={busy} onClick={onClose}>Cancel</button><button type="button" className="banner-gallery-confirm" disabled={busy||!banner} onClick={()=>onSelect(banner)}>Use banner</button></div>
 </DialogContent></Dialog>;
}
