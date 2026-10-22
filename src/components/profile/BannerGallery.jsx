import {useState} from "react";
import {X} from "lucide-react";
import {useAuth} from "@/lib/AuthContext";
import {useBannerGallery} from "@/hooks/useBannerGallery";
import ProfileMedia from "@/components/ProfileMedia";
import {Dialog,DialogContent,DialogHeader,DialogTitle,DialogDescription} from "@/components/ui/dialog";
import "./banner-gallery.css";
export default function BannerGallery({busy=false,onClose,onSelect}){
 const {user}=useAuth();
 const {banners,loading,error,deleting,remove}=useBannerGallery();
 const [selected,setSelected]=useState(""),[pending,setPending]=useState("");
 const banner=banners.find(item=>item.url===selected);
 const locked=busy||!!deleting;
 return <Dialog open onOpenChange={open=>{if(!open&&!locked)onClose();}}><DialogContent className="public-banner-gallery"><DialogHeader><DialogTitle>Banner gallery</DialogTitle><DialogDescription>Choose a banner. Save your profile changes to apply it.</DialogDescription></DialogHeader>
 {error&&<p role="alert" className="banner-gallery-error">{error}</p>}
 {loading&&<p role="status">Loading banners…</p>}
 {!loading&&!error&&!banners.length&&<p>No banners available yet.</p>}
 <div className="banner-gallery-grid">{banners.map(item=><div className="banner-gallery-item" key={item.id}>
 <button type="button" className="banner-gallery-choice" disabled={locked} aria-label={"Choose "+item.name+" banner"} aria-pressed={selected===item.url} onClick={()=>setSelected(item.url)}><ProfileMedia src={item.url} gifSrc={item.gifUrl} className="banner-gallery-art"/><span><strong>{item.name}</strong><small>{item.gifUrl?"GIF":"Image"}</small></span></button>
 {user?.role==="admin"&&<button type="button" className="banner-gallery-delete" aria-label={"Delete "+item.name+" banner"} disabled={locked} onClick={()=>setPending(item.id)}><X size={14} aria-hidden="true"/></button>}
 {user?.role==="admin"&&pending===item.id&&<div className="banner-gallery-delete-confirm" role="group" aria-label={"Confirm deletion of "+item.name}><strong>Delete {item.name}?</strong><p>This removes it from everyone’s gallery. Existing profile banners stay.</p><div><button type="button" disabled={locked} onClick={()=>setPending("")}>Cancel</button><button type="button" disabled={locked} onClick={async()=>{if(await remove(item.id)){if(selected===item.url)setSelected("");setPending("");}}}>{deleting===item.id?"Deleting…":"Delete banner"}</button></div></div>}
 </div>)}</div>
 <div className="banner-gallery-actions"><button type="button" disabled={locked} onClick={onClose}>Cancel</button><button type="button" className="banner-gallery-confirm" disabled={locked||!banner} onClick={()=>onSelect(banner)}>Use banner</button></div>
 </DialogContent></Dialog>;
}
