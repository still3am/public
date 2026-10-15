import {useCallback,useEffect,useRef,useState} from "react";
import {base44} from "@/api/base44Client";
const DEFAULT_MESSAGES=["Made by the people, for the people.","New Music Weekly"];
let cached=null,loaded=false,expires=0,inflight=null;
const clean=values=>Array.isArray(values)?values.filter(value=>typeof value==="string").map(value=>value.trim()).filter(Boolean):[];
async function readSetting(fresh=false){
 if(!fresh&&loaded&&Date.now()<expires)return cached;
 if(inflight)return inflight;
 const request=base44.entities.AppSetting.list("-created_date",1).then(page=>{const rows=Array.isArray(page)?page:page?.items||[];cached=rows[0]||null;loaded=true;expires=Date.now()+30000;return cached;}).finally(()=>{if(inflight===request)inflight=null;});
 inflight=request;return request;
}
export function useBannerMessages(){
 const [setting,setSetting]=useState(cached),[loading,setLoading]=useState(!loaded);
 const alive=useRef(true);
 const load=useCallback(async()=>{try{const next=await readSetting();if(alive.current)setSetting(next);}catch{}finally{if(alive.current)setLoading(false);}},[]);
 useEffect(()=>{
  alive.current=true;load();
  const change=event=>{if(event.detail){cached=event.detail;loaded=true;expires=Date.now()+30000;setSetting(event.detail);}else{expires=0;load();}};
  const visible=()=>{if(!document.hidden)load();};
  window.addEventListener("banner:changed",change);window.addEventListener("focus",load);document.addEventListener("visibilitychange",visible);
  return()=>{alive.current=false;window.removeEventListener("banner:changed",change);window.removeEventListener("focus",load);document.removeEventListener("visibilitychange",visible);};
 },[load]);
 async function setMessages(values){
  const messages=clean(values),current=setting||await readSetting(true);
  const updated=current?await base44.entities.AppSetting.update(current.id,{banner_messages:messages}):await base44.entities.AppSetting.create({banner_messages:messages});
  cached=updated;loaded=true;expires=Date.now()+30000;
  if(alive.current)setSetting(updated);
  window.dispatchEvent(new CustomEvent("banner:changed",{detail:updated}));
 }
 const custom=clean(setting?.banner_messages);
 return {loading,messages:custom.length?custom:DEFAULT_MESSAGES,isCustom:custom.length>0,setMessages};
}
