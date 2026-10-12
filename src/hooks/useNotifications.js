import { useCallback, useEffect, useRef, useState } from "react";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { getUsersByIds } from "@/lib/userLookup";
import { coalesce } from "@/lib/coalesce";

// Lightweight unread-count badge for nav surfaces.
export function useUnreadCount() {
  const { user } = useAuth();
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!user) {setCount(0);return;}
    let cancelled = false;
    async function load() {
      try {
        // Only the badge number is needed here — a small page is enough and
        // keeps this read cheap since it runs on every app load.
        // A count, not a page: the badge has to be right even when there are
        // more unread notifications than one page holds.
        const unread = await base44.entities.Notification.count({
          user_id: user.id,
          read: false,
        });
        if (!cancelled) setCount(unread || 0);
      } catch {
        if (!cancelled) setCount(0);
      }
    }
    load();
    // A burst of likes/follows arrives as several events — collapse them.
    const reload = coalesce(load, 1500);
    const unsub = base44.entities.Notification.subscribe(() => reload());
    return () => {
      cancelled = true;
      reload.cancel();
      unsub();
    };
  }, [user]);

  return count;
}

// Notifications load in pages; mark-all is scoped to the current user on the server.
export function useNotifications(){
 const {user}=useAuth();
 const [notifications,setNotifications]=useState([]),[loading,setLoading]=useState(true),[error,setError]=useState(false),[hasMore,setHasMore]=useState(false),[unreadCount,setUnreadCount]=useState(0);
 const cursor=useRef(null),epoch=useRef(0),busy=useRef(false),account=useRef(user?.id);account.current=user?.id;
 const load=useCallback(async(reset=true)=>{
  if(!user?.id){setNotifications([]);setUnreadCount(0);setLoading(false);return;}
  if(!reset&&busy.current)return;
  const request=++epoch.current,uid=user.id;busy.current=true;setLoading(true);setError(false);
  try{
   const page=await base44.entities.Notification.filter({user_id:uid},{sort:'-created_date',limit:50,...(!reset&&cursor.current?{cursor:cursor.current}:{})});
   const items=Array.isArray(page)?page:page.items||[];
   const actors=await getUsersByIds([...new Set(items.map(n=>n.actor_id).filter(Boolean))]);
   const actorMap=new Map(actors.map(a=>[a.id,a])),trackMap=new Map();
   const ids=[...new Set(items.map(n=>n.track_id).filter(Boolean))];
   if(ids.length){try{const tracks=await base44.entities.Track.filter({id:{$in:ids}},'-created_date',50);tracks.forEach(t=>trackMap.set(t.id,t));}catch{}}
   const count=await base44.entities.Notification.count({user_id:uid,read:false});
   if(request!==epoch.current||account.current!==uid)return;
   const enriched=items.map(n=>({...n,actor:actorMap.get(n.actor_id)||null,track:trackMap.get(n.track_id)||null}));
   setNotifications(prev=>reset?enriched:[...prev,...enriched.filter(n=>!prev.some(p=>p.id===n.id))]);
   cursor.current=page.next_cursor||null;setHasMore(!!page.has_more&&!!page.next_cursor);setUnreadCount(count||0);
  }catch{if(request===epoch.current)setError(true);}
  finally{if(request===epoch.current){setLoading(false);busy.current=false;}}
 },[user?.id]);
 useEffect(()=>{
  cursor.current=null;epoch.current++;setNotifications([]);setUnreadCount(0);load(true);
  if(!user?.id)return;
  const reload=coalesce(()=>load(true),1500),unsub=base44.entities.Notification.subscribe(()=>reload());
  return()=>{epoch.current++;reload.cancel();unsub();};
 },[load,user?.id]);
 async function markAllAsRead(){
  const before=notifications,count=unreadCount;setNotifications(prev=>prev.map(n=>({...n,read:true})));setUnreadCount(0);
  try{const r=await base44.functions.invoke('safety',{action:'markAllRead'});if(r.data?.success!==true)throw Error();}
  catch{setNotifications(before);setUnreadCount(count);setError(true);}
 }
 async function markAsRead(id){
  const wasUnread=notifications.some(n=>n.id===id&&!n.read);if(!wasUnread)return;
  setNotifications(prev=>prev.map(n=>n.id===id?{...n,read:true}:n));setUnreadCount(n=>Math.max(0,n-1));
  try{await base44.entities.Notification.update(id,{read:true});}
  catch{setNotifications(prev=>prev.map(n=>n.id===id?{...n,read:false}:n));setUnreadCount(n=>n+1);setError(true);}
 }
 return {notifications,loading,error,hasMore,unreadCount,markAllAsRead,markAsRead,reload:()=>load(true),loadMore:()=>load(false)};
}
