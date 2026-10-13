import {readAllPages} from '@/lib/readPages';
import {useRef} from 'react';
import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { coalesce } from "@/lib/coalesce";

const LibraryContext = createContext(null);
const EMPTY_IDS=new Set();

export function LibraryProvider({ children }) {
  const { user } = useAuth();
  const pending=useRef(new Map()),version=useRef(0),account=useRef(user?.id),owner=useRef(user?.id);account.current=user?.id;
  const [ids, setIds] = useState(new Set());
  const [revision,setRevision]=useState(0);

  const refresh=useCallback(async()=>{
    const uid=user?.id,request=++version.current;
    if(!uid){setIds(new Set());return;}
    try{
      const items=await readAllPages(options=>base44.entities.LibraryItem.filter({user_id:uid},{sort:"-created_date",fields:["id","track_id"],...options}));
      if(request!==version.current||account.current!==uid)return;
      const next=new Set(items.map(item=>item.track_id).filter(Boolean));
      pending.current.forEach((operation,id)=>{if(operation.uid===uid){if(operation.desired)next.add(id);else next.delete(id);}});
      setIds(previous=>previous.size===next.size&&[...next].every(id=>previous.has(id))?previous:next);
    }catch{/* A failed refresh does not remove confirmed saved songs. */}
  },[user?.id]);
  useEffect(()=>{owner.current=user?.id;version.current++;pending.current.clear();setIds(new Set());setRevision(0);refresh();return()=>{version.current++;};},[user?.id,refresh]);
  useEffect(()=>{
    if(!user?.id)return;
    const reload=coalesce(refresh,1200),changed=coalesce(()=>{refresh();setRevision(value=>value+1);},1200);
    let unsubscribe;try{unsubscribe=base44.entities.LibraryItem.subscribe(changed);}catch{}
    window.addEventListener('library:changed',changed);const timer=setInterval(reload,30000);
    return()=>{reload.cancel();changed.cancel();window.removeEventListener('library:changed',changed);clearInterval(timer);unsubscribe?.();};
  },[user?.id,refresh]);

  const toggle = useCallback(
    async (track) => {
      if (!user?.id || !track?.id) return false;
      const trackId = track.id;
      if(pending.current.has(trackId))return false;
      const uid=user.id,isIn=owner.current===user.id&&ids.has(trackId),operation={uid,desired:!isIn};
      pending.current.set(trackId,operation);

      // Optimistic: the heart flips the instant it is tapped, then the write is
      // confirmed with the server and rolled back if that fails.
      setIds((prev) => {
        const n = new Set(prev);
        if (isIn) n.delete(trackId);
        else n.add(trackId);
        return n;
      });

      try {
        if(isIn){
          await base44.entities.LibraryItem.deleteMany({user_id:uid,track_id:trackId});
        }else{
          const existing=await base44.entities.LibraryItem.filter({user_id:uid,track_id:trackId},'-created_date',1);
          if(account.current!==uid)return false;
          if(!existing.length)await base44.entities.LibraryItem.create({user_id:uid,track_id:trackId});
        }
        if(account.current===uid)window.dispatchEvent(new Event('library:changed'));
        return true;
      } catch {
        // Roll back to exactly what the library held before the tap.
        if(account.current===uid)setIds((prev) => {
          const n = new Set(prev);
          if (isIn) n.add(trackId);
          else n.delete(trackId);
          return n;
        });
        return false;
      }finally{if(pending.current.get(trackId)===operation)pending.current.delete(trackId);}
    },
    [user?.id, ids]
  );

  const visibleIds=owner.current===user?.id?ids:EMPTY_IDS;
  return (
    <LibraryContext.Provider
      value={{ids:visibleIds,isInLibrary:id=>visibleIds.has(id),toggle,refresh,revision,count:visibleIds.size}}
    >
      {children}
    </LibraryContext.Provider>
  );
}

export function useLibrary() {
  const ctx = useContext(LibraryContext);
  if (!ctx) {
    return {
      ids: new Set(),
      isInLibrary: () => false,
      toggle: async () => false,
      refresh: async () => {},
      count: 0,
    };
  }
  return ctx;
}