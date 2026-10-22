import {useState} from "react";
import {X,Check} from "lucide-react";
import {useAuth} from "@/lib/AuthContext";
import {useBannerGallery} from "@/hooks/useBannerGallery";
import ProfileMedia from "@/components/ProfileMedia";
import {Dialog,DialogContent,DialogHeader,DialogTitle,DialogDescription} from "@/components/ui/dialog";
import "./banner-gallery.css";
export default function BannerGallery({busy=false,onClose,onSelect}){
 const {user}=useAuth();
 const {banners,loading,error,deleting,remove}=useBannerGallery();
 const [selected,setSelected]=useState(""),[pending,setPending]=useState(""),[category,setCategory]=useState("images");
 const banner=banners.find(item=>item.url===selected);
 const locked=busy||!!deleting;
 const visible=banners.filter(item=>category==="gifs"?!!item.gifUrl:!item.gifUrl);
 const categories=[{id:"images",label:"Images",count:banners.filter(item=>!item.gifUrl).length},{id:"gifs",label:"GIFs",count:banners.filter(item=>!!item.gifUrl).length}];
 return <Dialog open onOpenChange={open=>{if(!open&&!locked)onClose();}}><DialogContent className="public-banner-gallery"><DialogHeader><DialogTitle>Banner gallery</DialogTitle><DialogDescription>Find a scene for your profile.</DialogDescription></DialogHeader>
 <div className="banner-gallery-tabs" role="group" aria-label="Banner type">{categories.map(tab=><button key={tab.id} type="button" disabled={locked} aria-pressed={category===tab.id} aria-controls="banner-gallery-results" onClick={()=>{setCategory(tab.id);setPending("");}}>{tab.label}{!loading&&<span>{tab.count}</span>}</button>)}</div>
 {error&&<p role="alert" className="banner-gallery-error">{error}</p>}
 <div className="banner-gallery-scroll" id="banner-gallery-results" aria-label={category==="gifs"?"GIF banners":"Image banners"} aria-busy={loading}>
 {loading?<div className="banner-gallery-skeletons" role="status" aria-label="Loading banners">{[0,1,2,3].map(i=><span key={i}/>)}</div>:!visible.length?<div className="banner-gallery-empty"><strong>{category==="gifs"?"No GIFs yet":"No images yet"}</strong><p>{error?"Reopen the gallery to try again.":"New banners will appear here."}</p></div>:
 <div className="banner-gallery-grid">{visible.map(item=><div className="banner-gallery-item" key={item.id}>
 <button type="button" className="banner-gallery-choice" disabled={locked} aria-label={"Choose "+item.name+" banner"} aria-pressed={selected===item.url} onClick={()=>setSelected(item.url)}><ProfileMedia src={item.url} gifSrc={item.gifUrl} className="banner-gallery-art"/><span className="banner-gallery-caption"><strong>{item.name}</strong>{selected===item.url&&<span className="banner-gallery-selected" aria-label="Selected"><Check size={15} aria-hidden="true"/></span>}</span></button>
 {user?.role==="admin"&&<button type="button" className="banner-gallery-delete" aria-label={"Delete "+item.name+" banner"} disabled={locked} onClick={()=>setPending(item.id)}><X size={14} aria-hidden="true"/></button>}
 {user?.role==="admin"&&pending===item.id&&<div className="banner-gallery-delete-confirm" role="group" aria-label={"Confirm deletion of "+item.name}><strong>Delete {item.name}?</strong><p>Remove from the gallery? Existing profile banners stay.</p><div><button type="button" disabled={locked} onClick={()=>setPending("")}>Cancel</button><button type="button" disabled={locked} onClick={async()=>{if(await remove(item.id)){if(selected===item.url)setSelected("");setPending("");}}}>{deleting===item.id?"Deleting…":"Delete banner"}</button></div></div>}
 </div>)}</div>}
 </div>
 <div className="banner-gallery-footer">{banner?<div className="banner-gallery-current"><img src={banner.url} alt=""/><span><strong>{banner.name}</strong><small>{banner.gifUrl?"Animated GIF":"Image"} · applies when you save your profile</small></span></div>:<p className="banner-gallery-prompt">Choose an image or GIF to preview on your profile.</p>}
 <div className="banner-gallery-actions"><button type="button" disabled={locked} onClick={onClose}>Cancel</button><button type="button" className="banner-gallery-confirm" disabled={locked||!banner} onClick={()=>onSelect(banner)}>Use banner</button></div></div>
 </DialogContent></Dialog>;
}
