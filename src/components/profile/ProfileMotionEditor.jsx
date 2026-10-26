import {useEffect,useRef,useState} from "react";
import {Loader2} from "lucide-react";
import {Dialog,DialogContent,DialogHeader,DialogTitle,DialogDescription} from "@/components/ui/dialog";
import {prepareProfileMotion,profileMotionSeconds} from "@/lib/profileMotion";
import ProfileMedia from "@/components/ProfileMedia";
import "./profile-upgrades.css";
export default function ProfileMotionEditor({file,kind="avatar",onApply,onClose}) {
  const [prepared,setPrepared]=useState(null),[error,setError]=useState(""),[busy,setBusy]=useState(false),[tab,setTab]=useState("mobile");
  const lock=useRef(false);
  const [urls,setUrls]=useState(null);
  useEffect(()=>{let alive=true,urls;setPrepared(null);setError("");
    prepareProfileMotion(file,kind).then(result=>{if(!alive)return;urls={source:URL.createObjectURL(result.file),poster:URL.createObjectURL(result.poster)};setUrls(urls);setPrepared(result);}).catch(e=>{if(alive)setError(e.message);});
    return()=>{alive=false;if(urls){URL.revokeObjectURL(urls.source);URL.revokeObjectURL(urls.poster);}};
  },[file,kind]);
  async function apply(){if(!prepared||lock.current)return;lock.current=true;setBusy(true);setError("");
    try{if(await onApply(prepared)===false)throw Error("The upload did not finish. Your preview is still here; please retry.");onClose();}
    catch(e){setError(e.message||"Could not upload. Please retry.");}finally{lock.current=false;setBusy(false);}
  }
  return <Dialog open onOpenChange={open=>{if(!open&&!busy)onClose();}}><DialogContent className="profile-image-editor" onEscapeKeyDown={e=>{if(busy)e.preventDefault();}} onPointerDownOutside={e=>{if(busy)e.preventDefault();}}>
    <DialogHeader><DialogTitle>{kind==="banner"?"Bring your banner to life":"A little motion. All you."}</DialogTitle><DialogDescription>Videos and GIF loops up to {profileMotionSeconds(kind)} seconds. Previews play silently.{kind === "avatar" ? " Visitors can open your avatar clip to play its original audio." : ""} Apply here, then save your profile.</DialogDescription></DialogHeader>
    {kind==="banner"&&<div className="profile-crop-tabs" aria-label="Banner preview">{["mobile","desktop"].map(value=><button key={value} type="button" aria-pressed={tab===value} onClick={()=>setTab(value)}>{value==="mobile"?"Mobile":"Desktop"}</button>)}</div>}
    <div className={"profile-crop-stage "+(kind==="avatar"?"is-circle":"")} style={{aspectRatio:kind==="avatar"?1:tab==="desktop"?4.5:1.85}}>
      {prepared&&urls?<ProfileMedia src={urls.poster} gifSrc={prepared.type==="gif"?urls.source:""} videoSrc={prepared.type==="video"?urls.source:""} style={{width:"100%",height:"100%"}}/>:!error?<Loader2 className="animate-spin"/>:null}
    </div>
    {prepared&&<p className="text-xs text-muted-foreground">{prepared.type==="gif"?"Animated GIF":"Video clip"} · {prepared.duration.toFixed(1)} sec · {(file.size/1024/1024).toFixed(1)} MB</p>}
    {error&&<p role="alert" className="profile-editor-error">{error}</p>}
    <div className="profile-crop-footer"><button type="button" disabled={busy} onClick={onClose}>Cancel</button><button type="button" disabled={!prepared||busy} onClick={apply}>{busy?<Loader2 size={17} className="animate-spin"/>:null}{busy?"Uploading…":"Apply to draft"}</button></div>
  </DialogContent></Dialog>;
}
