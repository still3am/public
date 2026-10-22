import {useEffect,useState} from "react";
import {base44} from "@/api/base44Client";
import {loadAvatarGallery,removeGalleryAvatar} from "@/lib/avatarGallery";
export function useAvatarGallery(){
 const [avatars,setAvatars]=useState([]),[loading,setLoading]=useState(true),[error,setError]=useState(""),[deleting,setDeleting]=useState("");
 useEffect(()=>{let active=true;async function refresh(){try{const list=await loadAvatarGallery(base44);if(active){setAvatars(list);setError("");}}catch{if(active)setError("Couldn’t load the avatar gallery. Reopen it to retry.");}finally{if(active)setLoading(false);}}
 refresh();window.addEventListener("avatar-gallery:changed",refresh);window.addEventListener("focus",refresh);
 return()=>{active=false;window.removeEventListener("avatar-gallery:changed",refresh);window.removeEventListener("focus",refresh);};},[]);
 async function remove(id){setDeleting(id);setError("");try{await removeGalleryAvatar(base44,id);setAvatars(list=>list.filter(item=>item.id!==id));return true;}catch{setError("Couldn’t delete this avatar. Please try again.");return false;}finally{setDeleting("");}}
 return {avatars,loading,error,deleting,remove};
}
