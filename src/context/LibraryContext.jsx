import {readLibraryRows} from '@/lib/libraryRows';
import {createContext,useCallback,useContext,useEffect,useRef,useState} from "react";
import {base44} from "@/api/base44Client";
import {useAuth} from "@/lib/AuthContext";
import {coalesce} from "@/lib/coalesce";

const LibraryContext=createContext(null),EMPTY_IDS=new Set();
export function LibraryProvider({children}){
 const {user}=useAuth();
 const pending=useRef(new Map()),version=useRef(0),account=useRef(user?.id),owner=useRef(user?.id);
 account.current=user?.id;
 const [ids,setIds]=useState(new Set()),[revision,setRevision]=useState(0),[pendingIds,setPendingIds]=useState(new Set());
 const refresh=useCallback(async()=>{
  const uid=user?.id,request=++version.current;
  if(!uid){setIds(new Set());return;}
  try{
   const items=await readLibraryRows(base44.entities.LibraryItem,{user_id:uid});
   if(request!==version.current||account.current!==uid)return;
   const next=new Set(items.map(item=>item.track_id).filter(Boolean));
   pending.current.forEach((op,id)=>{if(op.uid===uid&&op.desired!==null){if(op.desired)next.add(id);else next.delete(id);}});
   setIds(previous=>previous.size===next.size&&[...next].every(id=>previous.has(id))?previous:next);
  }catch{/* Keep confirmed songs when a background refresh fails. */}
 },[user?.id]);
 useEffect(()=>{
  owner.current=user?.id;version.current++;pending.current.clear();setIds(new Set());setPendingIds(new Set());setRevision(0);refresh();
  return()=>{version.current++;};
 },[user?.id,refresh]);
 useEffect(()=>{
  if(!user?.id)return;
  const reload=coalesce(refresh,1200),changed=coalesce(()=>{refresh();setRevision(v=>v+1);},1200);
  let unsubscribe;try{unsubscribe=base44.entities.LibraryItem.subscribe(changed);}catch{}
  window.addEventListener('library:changed',changed);const timer=setInterval(reload,30000);
  return()=>{reload.cancel();changed.cancel();window.removeEventListener('library:changed',changed);clearInterval(timer);unsubscribe?.();};
 },[user?.id,refresh]);
 const toggle=useCallback(async track=>{
  if(!user?.id||!track?.id)return false;
  const uid=user.id,trackId=track.id;
  if(pending.current.has(trackId))return false;
  const op={uid,desired:null};pending.current.set(trackId,op);setPendingIds(new Set(pending.current.keys()));
  let wasSaved,stage="read";
  const display=saved=>setIds(previous=>{const next=new Set(previous);if(saved)next.add(trackId);else next.delete(trackId);return next;});
  try{
   // Resolve the actual saved state before toggling. A slow initial list or
   // another open tab must not turn a remove into a duplicate add.
   const result=await readLibraryRows(base44.entities.LibraryItem,{user_id:uid,track_id:trackId},{one:true});
   if(account.current!==uid)return false;
   wasSaved=result.length>0;
   stage=wasSaved?"remove":"save";
   op.desired=!wasSaved;version.current++;display(op.desired);
   const saved=wasSaved
    ?await base44.entities.LibraryItem.deleteMany({user_id:uid,track_id:trackId})
    :await base44.entities.LibraryItem.create({user_id:uid,track_id:trackId});
   if(saved?.success===false)throw Error("Library save was not confirmed");
   if(!wasSaved&&!saved?.id)throw Error("Library save was not confirmed");
   if(account.current!==uid)return false;
   if(!wasSaved)window.dispatchEvent(new CustomEvent("library:added",{detail:{uid,id:trackId}}));
   setRevision(v=>v+1);
   return true;
  }catch(error){
   if(account.current===uid&&wasSaved!==undefined)display(wasSaved);
   // Preserve the SDK status instead of hiding the failed request behind false.
   if(error&&typeof error==="object")error.libraryStage=stage;
   throw error;
  }finally{
   if(pending.current.get(trackId)===op){
    pending.current.delete(trackId);
    if(account.current===uid){setPendingIds(new Set(pending.current.keys()));window.dispatchEvent(new Event('library:changed'));}
   }
  }
 },[user?.id]);
 const visible=owner.current===user?.id?ids:EMPTY_IDS;
 return <LibraryContext.Provider value={{ids:visible,isInLibrary:id=>visible.has(id),isPending:id=>owner.current===user?.id&&pendingIds.has(id),toggle,refresh,revision,count:visible.size}}>{children}</LibraryContext.Provider>;
}
export function useLibrary(){
 const ctx=useContext(LibraryContext);
 if(!ctx)return {ids:EMPTY_IDS,isInLibrary:()=>false,isPending:()=>false,toggle:async()=>false,refresh:async()=>{},revision:0,count:0};
 return ctx;
}
