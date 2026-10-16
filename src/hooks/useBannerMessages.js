import {useCallback,useEffect,useRef,useState} from "react";
import {base44} from "@/api/base44Client";
import {readAppSetting,saveAppSetting,invalidateAppSetting} from "@/lib/appSettings";
import {coalesce} from "@/lib/coalesce";
const DEFAULT_MESSAGES=["Made by the people, for the people.","New Music Weekly"];
const clean=values=>Array.isArray(values)?values.filter(value=>typeof value==="string").map(value=>value.trim()).filter(Boolean):[];
export function useBannerMessages(){
 const [setting,setSetting]=useState(null),[loading,setLoading]=useState(true),[error,setError]=useState(false);
 const alive=useRef(true),version=useRef(0);
 const load=useCallback(async(fresh=false)=>{
  const request=++version.current;
  try{const next=await readAppSetting(fresh);if(alive.current&&request===version.current){setSetting(next);setError(false);}}
  catch{if(alive.current&&request===version.current)setError(true);}
  finally{if(alive.current&&request===version.current)setLoading(false);}
 },[]);
 useEffect(()=>{
  alive.current=true;load();
  const change=event=>{if(event.detail?.id){version.current++;setSetting(event.detail);setError(false);setLoading(false);}else load(true);};
  const refresh=()=>{if(!document.hidden){invalidateAppSetting();load(true);}};
  const reload=coalesce(refresh,500);
  let unsub=()=>{};try{unsub=base44.entities.AppSetting.subscribe(reload);}catch{}
  const timer=setInterval(refresh,30000);
  window.addEventListener("banner:changed",change);window.addEventListener("appsettings:changed",change);window.addEventListener("focus",refresh);document.addEventListener("visibilitychange",refresh);
  return()=>{alive.current=false;version.current++;clearInterval(timer);reload.cancel();if(typeof unsub==='function')unsub();window.removeEventListener("banner:changed",change);window.removeEventListener("appsettings:changed",change);window.removeEventListener("focus",refresh);document.removeEventListener("visibilitychange",refresh);};
 },[load]);
 async function setMessages(values){return saveAppSetting({banner_messages:clean(values)});}
 const custom=clean(setting?.banner_messages);
 return {loading,error,reload:()=>load(true),messages:custom.length?custom:DEFAULT_MESSAGES,isCustom:custom.length>0,setMessages};
}
