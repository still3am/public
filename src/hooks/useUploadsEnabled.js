import {useCallback,useEffect,useRef,useState} from "react";
import {readAppSetting,saveAppSetting} from "@/lib/appSettings";
export function useUploadsEnabled(){
 const [setting,setSetting]=useState(null),[loading,setLoading]=useState(true),[error,setError]=useState(false);
 const alive=useRef(true),version=useRef(0);
 const load=useCallback(async()=>{
  const request=++version.current;setLoading(true);
  try{const record=await readAppSetting(true);if(alive.current&&request===version.current){setSetting(record);setError(false);}}
  catch{if(alive.current&&request===version.current)setError(true);}
  finally{if(alive.current&&request===version.current)setLoading(false);}
 },[]);
 useEffect(()=>{
  alive.current=true;load();
  const changed=event=>{if(event.detail?.id&&alive.current){version.current++;setSetting(event.detail);setError(false);setLoading(false);}else load();};
  window.addEventListener("appsettings:changed",changed);
  return()=>{alive.current=false;version.current++;window.removeEventListener("appsettings:changed",changed);};
 },[load]);
 async function setEnabled(enabled){return saveAppSetting({uploads_enabled:!!enabled});}
 return {loading,error,reload:load,enabled:!loading&&!error&&(setting?setting.uploads_enabled!==false:true),setEnabled};
}
