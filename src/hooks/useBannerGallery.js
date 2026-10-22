import {useEffect,useRef,useState} from "react";
import {base44} from "@/api/base44Client";
import {loadBannerGallery,removeGalleryBanner} from "@/lib/bannerGallery";
export function useBannerGallery(){
 const [banners,setBanners]=useState([]),[loading,setLoading]=useState(true),[error,setError]=useState(""),[deleting,setDeleting]=useState("");
 const revision=useRef(0),alive=useRef(true);
 useEffect(()=>{alive.current=true;
 async function refresh(){const version=++revision.current;try{const list=await loadBannerGallery(base44);if(alive.current&&version===revision.current){setBanners(list);setError("");}}catch{if(alive.current&&version===revision.current)setError("Couldn’t load the banner gallery. Reopen it to retry.");}finally{if(alive.current&&version===revision.current)setLoading(false);}}
 refresh();window.addEventListener("banner-gallery:changed",refresh);window.addEventListener("focus",refresh);
 return()=>{alive.current=false;revision.current++;window.removeEventListener("banner-gallery:changed",refresh);window.removeEventListener("focus",refresh);};
 },[]);
 async function remove(id){setDeleting(id);setError("");try{await removeGalleryBanner(base44,id);revision.current++;if(alive.current)setBanners(list=>list.filter(item=>item.id!==id));return true;}catch{if(alive.current)setError("Couldn’t delete this banner. Please try again.");return false;}finally{if(alive.current){setDeleting("");setLoading(false);}}}
 return {banners,loading,error,deleting,remove};
}
