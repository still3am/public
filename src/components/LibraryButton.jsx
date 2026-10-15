import {useRef,useState} from "react";
import {actionError} from "@/lib/actionError";
import {Plus,Check,Loader2} from "lucide-react";
import {useNavigate} from "react-router-dom";
import {useLibrary} from "@/context/LibraryContext";
import {useAuth} from "@/lib/AuthContext";
import {useToast} from "@/components/ui/use-toast";

/** @param {any} props */
export default function LibraryButton({track,className="",size=16,label=false}){
 const {isInLibrary,isPending,toggle}=useLibrary(),{user}=useAuth(),nav=useNavigate(),{toast}=useToast();
 const [busy,setBusy]=useState(false),lock=useRef(false);
 const inLib=isInLibrary(track?.id),saving=busy||isPending(track?.id);
 async function save(event){
  event.stopPropagation();event.preventDefault();
  if(!user){nav("/login?returnTo="+encodeURIComponent(window.location.pathname+window.location.search));return;}
  if(lock.current||saving||!track?.id)return;
  lock.current=true;setBusy(true);
  try{
   const ok=await toggle(track);
   toast(ok?{title:"Library updated"}:{title:"Couldn’t update your library. Please try again.",variant:"destructive"});
  }catch(error){const status=error?.status??error?.response?.status;toast({title:actionError(error,"Couldn’t "+(error?.libraryStage==="read"?"check your saved songs":"update your library")+". Please try again."),description:status?"Library request: HTTP "+status:undefined,variant:"destructive"});}
  finally{lock.current=false;setBusy(false);}
 }
 return <button type="button" disabled={saving||!track?.id} onClick={save} className={className} aria-busy={saving} aria-pressed={inLib}
  aria-label={saving?"Updating library":inLib?"Remove from library":"Add to library"} title={inLib?"In your library":"Add to library"}>
  {saving?<Loader2 size={size} className="animate-spin"/>:inLib?<Check size={size}/>:<Plus size={size}/>}
  {label&&<span className="truncate">{saving?"Saving…":inLib?"In library":"Add to library"}</span>}
 </button>;
}
