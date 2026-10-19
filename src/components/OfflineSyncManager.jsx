import {useEffect} from "react";
import {useAuth} from "@/lib/AuthContext";
import {useOfflineCache} from "@/hooks/useOfflineCache";
import {base44} from "@/api/base44Client";
import {coalesce} from "@/lib/coalesce";

// One background coordinator keeps offline selections active on every page.
export default function OfflineSyncManager(){
 const {user}=useAuth(),{syncFromCloud}=useOfflineCache();
 useEffect(()=>{
  if(!user?.id)return;
  const refresh=coalesce(()=>{if(navigator.onLine&&document.visibilityState!=="hidden")syncFromCloud();},1500);
  const subscriptions=[];
  try{subscriptions.push(base44.entities.User.subscribe(event=>{if(!event?.id||event.id===user.id)refresh();}));}catch{}
  try{subscriptions.push(base44.entities.OfflineSync.subscribe(event=>{if(!event?.data?.user_id||event.data.user_id===user.id)refresh();}));}catch{}
  const timer=setInterval(refresh,60000);
  return()=>{clearInterval(timer);refresh.cancel();subscriptions.forEach(unsubscribe=>unsubscribe?.());};
 },[user?.id,syncFromCloud]);
 return null;
}
