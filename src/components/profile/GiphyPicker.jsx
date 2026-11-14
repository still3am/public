import {useEffect,useRef,useState} from "react";
import {Loader2,Search,X} from "lucide-react";
import {base44} from "@/api/base44Client";
import {Dialog,DialogContent,DialogDescription,DialogTitle} from "@/components/ui/dialog";
import "./marketplace-giphy.css";

const CATEGORIES=["Trending","Laugh","Love","Celebrate","Surprised","Music"];
export default function GiphyPicker({kind="avatar",onSelect,onClose,disabled=false}){
 const initialKind=kind==="banner"?"banner":"avatar";
 const [target,setTarget]=useState(initialKind),[query,setQuery]=useState(""),[activeTerm,setActiveTerm]=useState(""),[items,setItems]=useState([]),[status,setStatus]=useState("Loading GIFs…"),[busy,setBusy]=useState(false),[moreLoading,setMoreLoading]=useState(false),[hasMore,setHasMore]=useState(false),[failed,setFailed]=useState(false);
 const requestId=useRef(0),itemsRef=useRef([]),loadingMore=useRef(false);
 useEffect(()=>setTarget(initialKind),[initialKind]);
 async function search(term="",offset=0){
  const request=++requestId.current;
  setActiveTerm(term);setFailed(false);
  if(!offset){setMoreLoading(false);loadingMore.current=false;itemsRef.current=[];setItems([]);setHasMore(false);setStatus("Loading GIFs…");}
  try{
   const result=await base44.functions.invoke("usersByIds",{action:"giphy_search",query:term,offset});
   if(request!==requestId.current)return;
   if(result?.data?.error)throw Error(result.data.error);
   const data=result?.data||{},next=Array.isArray(data.items)?data.items:[];
   const merged=offset?itemsRef.current.concat(next.filter(item=>!itemsRef.current.some(old=>old.id===item.id))):next;
   itemsRef.current=merged;setItems(merged);setHasMore(Boolean(data.has_more));setStatus(merged.length?"":"No GIFs found.");
  }catch(error){
   if(request!==requestId.current)return;
   if(!offset){itemsRef.current=[];setItems([]);}
   setFailed(true);setStatus(error?.response?.data?.error||error?.message||"GIPHY is temporarily unavailable.");
  }finally{if(request===requestId.current){setBusy(false);if(offset){loadingMore.current=false;setMoreLoading(false);}}}
 }
 useEffect(()=>{void search("");return()=>{requestId.current++;};},[]);
 async function loadMore(){
  if(!hasMore||loadingMore.current||busy||moreLoading)return;
  loadingMore.current=true;setMoreLoading(true);setFailed(false);
  await search(activeTerm,itemsRef.current.length);
 }
 function onScroll(event){
  const node=event.currentTarget;
  if(node.scrollHeight-node.scrollTop-node.clientHeight<240)void loadMore();
 }
 async function choose(item){
  if(busy||disabled)return;
  setBusy(true);
  try{
   const result=await base44.functions.invoke("usersByIds",{action:"add_giphy_to_marketplace",id:item.id,kind:target});
   if(result?.data?.error)throw Error(result.data.error);
   if(!result?.data?.id)throw Error("This GIF couldn’t be added to the Marketplace. Try another one.");
   window.dispatchEvent(new Event(target==="avatar"?"avatar-gallery:changed":"banner-gallery:changed"));
   onSelect?.({...item,url:item.gifUrl,gifUrl:item.gifUrl,source:"giphy",kind:target});
  }catch(error){setStatus(error?.response?.data?.error||error?.message||"Couldn’t add this GIF. Try again.");}
  finally{setBusy(false);}
 }
 return <Dialog open onOpenChange={open=>{if(!open&&!busy)onClose?.();}}>
  <DialogContent showClose={false} className="public-marketplace-giphy" onOpenAutoFocus={event=>event.preventDefault()}>
   <span className="public-marketplace-giphy-handle" aria-hidden="true"/>
   <DialogTitle className="sr-only">Choose a GIPHY</DialogTitle>
   <DialogDescription className="sr-only">Search GIPHY and select whether to use a GIF as your avatar or banner.</DialogDescription>
   <header className="public-marketplace-giphy-header"><strong>GIPHY</strong><button type="button" className="public-marketplace-giphy-close" aria-label="Close GIPHY picker" disabled={busy} onClick={onClose}><X size={18}/></button></header>
   <form className="public-marketplace-giphy-search" onSubmit={event=>{event.preventDefault();void search(query.trim());}}>
    <Search size={20} aria-hidden="true"/><input placeholder="Search GIPHY" aria-label="Search GIPHY" value={query} maxLength={80} onChange={event=>setQuery(event.target.value)}/><button type="submit" aria-label="Search GIFs" disabled={busy}><Search size={20}/></button>
   </form>
   <div className="public-marketplace-giphy-target" role="group" aria-label="Use GIF as">
    <span>Use as</span><button type="button" aria-pressed={target==="avatar"} onClick={()=>setTarget("avatar")}>Avatar</button><button type="button" aria-pressed={target==="banner"} onClick={()=>setTarget("banner")}>Banner</button>
   </div>
   <div className="public-marketplace-giphy-categories" role="group" aria-label="GIF categories">
    {CATEGORIES.map(category=>{const term=category==="Trending"?"":category.toLowerCase();return <button type="button" key={category} aria-pressed={activeTerm===term} onClick={()=>{setQuery(term);void search(term);}}>{category}</button>;})}
   </div>
   {status&&<p className="public-marketplace-giphy-status" role="status">{busy&&<Loader2 className="animate-spin" size={15}/>}<span>{status}</span>{failed&&<button type="button" onClick={()=>void search(activeTerm)}>Retry</button>}</p>}
   <div className="public-marketplace-giphy-results" role="region" aria-label="GIF results" aria-busy={status==="Loading GIFs…"} onScroll={onScroll} tabIndex={0}>
    {items.map(item=><button type="button" key={item.id} disabled={busy||disabled} onClick={()=>choose(item)} aria-label={"Use "+item.title+" as "+target} className={target==="banner"?"is-banner":""}>
     <img src={item.preview} alt={item.title||"GIPHY result"} loading="lazy" draggable="false"/><span>{item.title}{item.creatorName?" · "+item.creatorName:""}</span>
    </button>)}
    {moreLoading&&<p className="public-marketplace-giphy-loading" role="status">Loading more GIFs…</p>}
   </div>
   <footer className="public-marketplace-giphy-footer">Powered by GIPHY</footer>
  </DialogContent>
 </Dialog>;
}
