import {useEffect,useState} from "react";
import {Search,Loader2} from "lucide-react";
import {base44} from "@/api/base44Client";
import {Dialog,DialogContent,DialogDescription,DialogTitle} from "@/components/ui/dialog";

export default function GiphyPicker({kind,onSelect,onClose,disabled=false}){
 const [query,setQuery]=useState(""),[items,setItems]=useState([]),[status,setStatus]=useState("Loading GIFs…"),[busy,setBusy]=useState(false);
 async function search(term=""){
  setStatus("Loading GIFs…");
  try{
   const result=await base44.functions.invoke("usersByIds",{action:"giphy_search",query:term});
   if(result?.data?.error)throw Error(result.data.error);
   const next=result?.data?.items||[];
   setItems(next);setStatus(next.length?"":"No GIFs found. Try another search.");
  }catch(error){setItems([]);setStatus(error?.response?.data?.error||error?.message||"GIPHY search is unavailable. Try again.");}
 }
 useEffect(()=>{void search("");},[]);
 async function choose(item){
  if(busy||disabled)return;
  setBusy(true);setStatus("");
  try{
   const result=await base44.functions.invoke("usersByIds",{action:"add_giphy_to_marketplace",id:item.id,kind});
   if(result?.data?.error)throw Error(result.data.error);
   if(!result?.data?.id)throw Error("The GIF could not be added to the Marketplace.");
   window.dispatchEvent(new Event(kind==="avatar"?"avatar-gallery:changed":"banner-gallery:changed"));
   onSelect?.({...item,url:item.gifUrl,source:"giphy",kind});
  }catch(error){setStatus(error?.response?.data?.error||error?.message||"Couldn’t add this GIF. Try again.");}
  finally{setBusy(false);}
 }
 return <Dialog open onOpenChange={open=>{if(!open&&!busy)onClose?.();}}>
  <DialogContent className="max-w-3xl p-0 overflow-hidden rounded-3xl">
   <div className="flex flex-col max-h-[min(82vh,760px)] bg-background">
    <div className="px-5 pt-6 pb-4 border-b">
     <DialogTitle>Choose a GIPHY {kind==="avatar"?"avatar":"banner"}</DialogTitle>
     <DialogDescription className="mt-1">Pick a GIF to use on your profile and add to the PUBLIC Marketplace.</DialogDescription>
     <form className="mt-4 flex items-center gap-3 rounded-full border bg-muted/60 px-4 py-3" onSubmit={event=>{event.preventDefault();void search(query.trim());}}>
      <Search size={19}/><input className="min-w-0 flex-1 bg-transparent outline-none" placeholder="Search GIPHY" aria-label="Search GIPHY" value={query} maxLength={80} onChange={event=>setQuery(event.target.value)}/>
      <button type="submit" aria-label="Search GIFs" disabled={busy}><Search size={19}/></button>
     </form>
    </div>
    {status&&<p className="px-5 py-3 text-sm text-muted-foreground" role="status">{busy&&<Loader2 className="inline mr-2 animate-spin" size={15}/>}{status}</p>}
    <div className="grid flex-1 min-h-0 grid-cols-2 sm:grid-cols-3 gap-2 overflow-y-auto p-3">
     {items.map(item=><button key={item.id} type="button" disabled={busy||disabled} onClick={()=>choose(item)} aria-label={"Use "+item.title+" as "+kind} className="group relative overflow-hidden rounded-xl bg-muted focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary">
      <img className={kind==="avatar"?"aspect-square w-full object-cover":"aspect-[16/9] w-full object-cover"} src={item.preview} alt={item.title} loading="lazy"/>
      <span className="absolute inset-x-0 bottom-0 truncate bg-black/65 px-2 py-1.5 text-left text-xs text-white">{item.title}{item.creatorName?" · "+item.creatorName:""}</span>
     </button>)}
    </div>
    <div className="border-t px-5 py-3 text-center text-xs text-muted-foreground">Powered by GIPHY</div>
   </div>
  </DialogContent>
 </Dialog>;
}
