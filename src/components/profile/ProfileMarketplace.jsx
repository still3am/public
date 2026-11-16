import {useEffect,useState} from "react";
import {Dialog,DialogContent,DialogDescription,DialogHeader,DialogTitle} from "@/components/ui/dialog";
import AvatarPicker from "./AvatarPicker";
import BannerGallery from "./BannerGallery";
import GiphyPicker from "./GiphyPicker";
import "./marketplace-dialog.css";

export default function ProfileMarketplace({kind="avatars",user,busy=false,onClose,onSelectAvatar,onSelectBanner,onSelectBackground,onAvatarUpload,onEditPhoto,error,allowMotion=false,backgroundMode=false}){
 const [activeKind,setActiveKind]=useState(kind==="banners"?"banners":"avatars");
 const [showGiphy,setShowGiphy]=useState(false);
 useEffect(()=>setActiveKind(kind==="banners"?"banners":"avatars"),[kind]);
 const locked=busy;
 const chooseGiphy=item=>{
  setShowGiphy(false);
  const asset={...item,url:item.gifUrl,gifUrl:item.gifUrl,source:"giphy"};
  if(backgroundMode)onSelectBackground?.(asset);
  else if(item.kind==="banner")onSelectBanner?.(asset);
  else onSelectAvatar?.(asset);
  onClose?.();
 };
 const chooseBackground=asset=>{onSelectBackground?.(asset);onClose?.();};
 return <Dialog open onOpenChange={open=>{if(!open&&!locked)onClose?.();}}>
  <DialogContent className="public-marketplace-dialog public-marketplace-unified" aria-describedby="profile-marketplace-description">
   <DialogHeader className="marketplace-header">
    <DialogTitle>PUBLIC Marketplace</DialogTitle>
    <DialogDescription id="profile-marketplace-description">{backgroundMode?"Choose an image, GIF, or clip from the PUBLIC Marketplace for this conversation.":"Choose an avatar or a banner for your profile."}</DialogDescription>
   </DialogHeader>
   <div className="marketplace-kind-tabs" role="tablist" aria-label="Marketplace type">
    <button type="button" role="tab" aria-selected={activeKind==="avatars"} onClick={()=>setActiveKind("avatars")}>Avatars</button>
    <button type="button" role="tab" aria-selected={activeKind==="banners"} onClick={()=>setActiveKind("banners")}>Banners</button>
   </div>
   {activeKind==="avatars"
    ? <AvatarPicker user={user} busy={busy} backgroundMode={backgroundMode} onClose={onClose} onSelect={value=>{if(backgroundMode)chooseBackground(value);else{onSelectAvatar?.(value);onClose?.();}}} onUpload={onAvatarUpload} onEditPhoto={onEditPhoto} error={error} allowMotion={allowMotion} onOpenGiphy={()=>setShowGiphy(true)} onGiphySelect={chooseGiphy}/>
    : <BannerGallery busy={busy} backgroundMode={backgroundMode} onClose={onClose} onSelect={banner=>{if(backgroundMode)chooseBackground(banner);else{onSelectBanner?.(banner);onClose?.();}}} onOpenGiphy={()=>setShowGiphy(true)} onGiphySelect={chooseGiphy}/>}
   {showGiphy&&<GiphyPicker kind={activeKind==="banners"?"banner":"avatar"} disabled={busy} onClose={()=>setShowGiphy(false)} onSelect={chooseGiphy}/>}
  </DialogContent>
 </Dialog>;
}
