import {useEffect,useState} from "react";
import {Dialog,DialogContent,DialogDescription,DialogHeader,DialogTitle} from "@/components/ui/dialog";
import AvatarPicker from "./AvatarPicker";
import BannerGallery from "./BannerGallery";
import GiphyPicker from "./GiphyPicker";
import "./marketplace-dialog.css";

export default function ProfileMarketplace({kind="avatars",user,busy=false,onClose,onSelectAvatar,onSelectBanner,onAvatarUpload,onEditPhoto,error,allowMotion=false}){
 const [activeKind,setActiveKind]=useState(kind==="banners"?"banners":"avatars");
 const [showGiphy,setShowGiphy]=useState(false);
 useEffect(()=>setActiveKind(kind==="banners"?"banners":"avatars"),[kind]);
 const locked=busy;
 const chooseGiphy=item=>{
  setShowGiphy(false);
  if(item.kind==="banner")onSelectBanner?.({...item,url:item.gifUrl,gifUrl:item.gifUrl,source:"giphy"});
  else onSelectAvatar?.({...item,url:item.gifUrl,gifUrl:item.gifUrl,source:"giphy"});
  onClose?.();
 };
 return <Dialog open onOpenChange={open=>{if(!open&&!locked)onClose?.();}}>
  <DialogContent className="public-marketplace-dialog public-marketplace-unified" aria-describedby="profile-marketplace-description">
   <DialogHeader className="marketplace-header">
    <DialogTitle>PUBLIC Marketplace</DialogTitle>
    <DialogDescription id="profile-marketplace-description">Choose an avatar or a banner for your profile.</DialogDescription>
   </DialogHeader>
   <div className="marketplace-kind-tabs" role="tablist" aria-label="Marketplace type">
    <button type="button" role="tab" aria-selected={activeKind==="avatars"} onClick={()=>setActiveKind("avatars")}>Avatars</button>
    <button type="button" role="tab" aria-selected={activeKind==="banners"} onClick={()=>setActiveKind("banners")}>Banners</button>
   </div>
   {activeKind==="avatars"
    ? <AvatarPicker user={user} busy={busy} onClose={onClose} onSelect={value=>{onSelectAvatar?.(value);onClose?.();}} onUpload={onAvatarUpload} onEditPhoto={onEditPhoto} error={error} allowMotion={allowMotion} onOpenGiphy={()=>setShowGiphy(true)} onGiphySelect={chooseGiphy}/>
    : <BannerGallery busy={busy} onClose={onClose} onSelect={banner=>{onSelectBanner?.(banner);onClose?.();}} onOpenGiphy={()=>setShowGiphy(true)} onGiphySelect={chooseGiphy}/>}
   {showGiphy&&<GiphyPicker kind={activeKind==="banners"?"banner":"avatar"} disabled={busy} onClose={()=>setShowGiphy(false)} onSelect={chooseGiphy}/>}
  </DialogContent>
 </Dialog>;
}
