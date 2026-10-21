import {useArtistReleases} from "@/hooks/useArtistReleases";
import { useCallback, useEffect, useRef, useState } from "react";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { getUsersByIds } from "@/lib/userLookup";
import { coalesce } from "@/lib/coalesce";
import { reportActionError } from "@/lib/actionError";

// Lightweight unread-count badge for nav surfaces.
export function useUnreadCount() {
  const releases=useArtistReleases();
  const { user } = useAuth();
  const [badge, setBadge] = useState({uid:null,count:0});

  useEffect(() => {
    if (!user) {setBadge({uid:null,count:0});return;}
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
        if (!cancelled) setBadge({uid:user.id,count:typeof unread==="number"?unread:0});
      } catch {
        /* preserve the last confirmed unread count */
      }
    }
    load();
    // A burst of likes/follows arrives as several events — collapse them.
    const reload = coalesce(load, 1500);
    let unsub=()=>{};try{unsub=base44.entities.Notification.subscribe(()=>reload());}catch{}
    const timer=setInterval(reload,30000);window.addEventListener("notifications:changed",reload);
    return () => {
      cancelled = true;clearInterval(timer);window.removeEventListener("notifications:changed",reload);
      reload.cancel();
      unsub();
    };
  }, [user?.id]);

  return (badge.uid===user?.id?badge.count:0)+releases.unread;
}

// Notifications load in pages; mark-all is scoped to the current user on the server.
export function useNotifications(){
 const releases=useArtistReleases();
 const {user}=useAuth();
 const [notifications,setNotifications]=useState([]),[loading,setLoading]=useState(true),[error,setError]=useState(false),[hasMore,setHasMore]=useState(false),[unreadCount,setUnreadCount]=useState(0);
 const paging=useRef({pages:0,hasMore:false});
 const cursor=useRef(null),epoch=useRef(0),busy=useRef(false),account=useRef(user?.id),readingIds=useRef(new Set()),markingAll=useRef(false);account.current=user?.id;
 const load=useCallback(async(reset=true)=>{
  if(!user?.id){setNotifications([]);setUnreadCount(0);setLoading(false);return;}
  if(!reset&&busy.current)return;
  const request=++epoch.current,uid=user.id;busy.current=true;setLoading(true);setError(false);
  try{
   const page=await base44.entities.Notification.filter({user_id:uid},{sort:'-created_date',limit:50,...(!reset&&cursor.current?{cursor:cursor.current}:{})});
   const items=Array.isArray(page)?page:page?.items;
   if(!Array.isArray(items))throw Error("Invalid notification response");
   if(page.has_more&&(typeof page.next_cursor!=="string"||!page.next_cursor||(!reset&&page.next_cursor===cursor.current)))throw Error("Notifications could not finish loading. Please retry.");
   const actors=await getUsersByIds([...new Set(items.map(n=>n.actor_id||n.sender_id).filter(Boolean))]).catch(()=>[]);
   const actorMap=new Map(actors.map(a=>[a.id,a])),trackMap=new Map();
   const ids=[...new Set(items.map(n=>n.track_id).filter(Boolean))];
   if(ids.length){try{const tracks=await base44.entities.Track.filter({id:{$in:ids}},'-created_date',50);tracks.forEach(t=>trackMap.set(t.id,t));}catch{}}
   const count=await base44.entities.Notification.count({user_id:uid,read:false}).catch(()=>null);
   if(request!==epoch.current||account.current!==uid)return;
   setNotifications(prev=>{
    const previous=new Map(prev.map(n=>[n.id,n]));
    const enriched=items.map(n=>({...n,actor_id:n.actor_id||n.sender_id,actor:actorMap.get(n.actor_id||n.sender_id)||previous.get(n.id)?.actor||(n.actor_name?{id:n.actor_id||n.sender_id,display_name:n.actor_name,avatar_url:n.actor_avatar_url||''}:null),track:trackMap.get(n.track_id)||previous.get(n.id)?.track||null}));
    const merged=enriched.map(n=>markingAll.current||readingIds.current.has(n.id)?{...n,read:true}:n);
    if(!reset)return [...prev,...merged.filter(n=>!previous.has(n.id))];
    const boundary=items.at(-1)?.created_date,headIds=new Set(items.map(n=>n.id));
    const older=page.has_more&&boundary?prev.filter(n=>!headIds.has(n.id)&&n.created_date<=boundary):[];
    return [...merged,...older];
   });
   const more=!!page.has_more&&!!page.next_cursor;
   if(!reset||paging.current.pages<=1||!more){
    cursor.current=page.next_cursor||null;paging.current={pages:reset?1:paging.current.pages+1,hasMore:more};setHasMore(more);
   }else setHasMore(paging.current.hasMore);if(typeof count==="number"&&!markingAll.current&&!readingIds.current.size)setUnreadCount(count);
  }catch{if(request===epoch.current)setError(true);}
  finally{if(request===epoch.current){setLoading(false);busy.current=false;}}
 },[user?.id]);
 useEffect(()=>{
  cursor.current=null;paging.current={pages:0,hasMore:false};epoch.current++;busy.current=false;readingIds.current.clear();markingAll.current=false;setHasMore(false);setNotifications([]);setUnreadCount(0);load(true);
  if(!user?.id)return;
  const reload=coalesce(()=>load(true),1500);let unsub=()=>{};try{unsub=base44.entities.Notification.subscribe(()=>reload());}catch{}
  const timer=setInterval(reload,30000);
  return()=>{epoch.current++;clearInterval(timer);reload.cancel();unsub();};
 },[load,user?.id]);
 async function markAllAsRead(){
  try{await releases.markRead();}catch(error){reportActionError(error,"Release notifications couldn’t be marked read.");}
  if(!user?.id||!unreadCount||markingAll.current||readingIds.current.size)return;
  markingAll.current=true;const uid=user.id,count=unreadCount,unread=new Set(notifications.filter(n=>!n.read).map(n=>n.id));
  setNotifications(prev=>prev.map(n=>({...n,read:true})));setUnreadCount(0);
  try{const r=await base44.functions.invoke('safety',{action:'markAllRead'});if(r.data?.success!==true)throw Error();}
  catch(error){if(account.current===uid){setNotifications(prev=>prev.map(n=>unread.has(n.id)?{...n,read:false}:n));setUnreadCount(count);reportActionError(error,"Notifications could not be marked as read. Please retry.");}}
  finally{if(account.current===uid){markingAll.current=false;window.dispatchEvent(new Event("notifications:changed"));load(true);}}
 }
 async function markAsRead(id){
  if(id.startsWith("release:")){try{await releases.markRead(id);}catch(error){reportActionError(error,"Couldn’t mark this release as read.");}return;}
  const uid=user?.id,wasUnread=notifications.some(n=>n.id===id&&!n.read);
  if(!uid||!wasUnread||markingAll.current||readingIds.current.has(id))return;
  readingIds.current.add(id);
  setNotifications(prev=>prev.map(n=>n.id===id?{...n,read:true}:n));setUnreadCount(n=>Math.max(0,n-1));
  try{await base44.entities.Notification.update(id,{read:true});}
  catch(error){if(account.current===uid){setNotifications(prev=>prev.map(n=>n.id===id?{...n,read:false}:n));setUnreadCount(n=>n+1);reportActionError(error,"This notification could not be marked as read. Please retry.");}}
  finally{if(account.current===uid){readingIds.current.delete(id);window.dispatchEvent(new Event("notifications:changed"));}}
 }
 const releasedIds=new Set(releases.items.map(n=>n.track_id));
 const merged=[...notifications.filter(n=>n.type!=="new_upload_from_followed"||!releasedIds.has(n.track_id)),...releases.items].sort((a,b)=>new Date(b.created_date).getTime()-new Date(a.created_date).getTime());
 return {notifications:merged,loading,error:error||releases.error,hasMore,unreadCount:unreadCount+releases.unread,markAllAsRead,markAsRead,reload:()=>{releases.refresh();return load(true);},loadMore:()=>load(false)};
}
