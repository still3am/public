import {useCallback,useEffect,useRef,useState} from "react";
import {base44} from "@/api/base44Client";
const rows=page=>Array.isArray(page)?page:page?.items||[];
export function useUploadsEnabled(){
 const [setting,setSetting]=useState(null),[loading,setLoading]=useState(true),[error,setError]=useState(false);
 const alive=useRef(true);
 const load=useCallback(async()=>{
  setLoading(true);
  try{const record=rows(await base44.entities.AppSetting.list("-created_date",1))[0]||null;if(alive.current){setSetting(record);setError(false);}}
  catch{if(alive.current)setError(true);}
  finally{if(alive.current)setLoading(false);}
 },[]);
 useEffect(()=>{
  alive.current=true;load();
  const changed=event=>{if(event.detail&&alive.current){setSetting(event.detail);setError(false);}};
  window.addEventListener("appsettings:changed",changed);window.addEventListener("banner:changed",changed);
  return()=>{alive.current=false;window.removeEventListener("appsettings:changed",changed);window.removeEventListener("banner:changed",changed);};
 },[load]);
 async function setEnabled(enabled){
  // A failed read must never create a replacement settings record.
  const current=rows(await base44.entities.AppSetting.list("-created_date",1))[0];
  const updated=current?await base44.entities.AppSetting.update(current.id,{uploads_enabled:enabled}):await base44.entities.AppSetting.create({uploads_enabled:enabled});
  if(alive.current){setSetting(updated);setError(false);}
  window.dispatchEvent(new CustomEvent("appsettings:changed",{detail:updated}));
  window.dispatchEvent(new CustomEvent("banner:changed",{detail:updated}));
 }
 return {loading,error,reload:load,enabled:!error&&(setting?setting.uploads_enabled!==false:true),setEnabled};
}
