import {createContext,useContext,useEffect,useLayoutEffect,useState} from "react";
import {useAuth} from "@/lib/AuthContext";
import {glassKey,normalizeGlass,readGlass,saveGlass} from "@/lib/liquidGlass";
const Context=createContext({mode:"off",persisted:true,setMode:()=>{}});
function storage(){try{return window.localStorage;}catch{return null;}}
export function LiquidGlassProvider({children}){
 const {user}=useAuth(),uid=user?.id||"guest";
 const [state,setState]=useState(()=>({uid,mode:readGlass(uid,storage()),persisted:true}));
 const mode=state.uid===uid?state.mode:readGlass(uid,storage());
 useLayoutEffect(()=>{
  document.documentElement.dataset.liquidGlass=mode;
  return()=>{delete document.documentElement.dataset.liquidGlass;};
 },[uid,mode]);
 useEffect(()=>{
  const changed=event=>{if(event.key===glassKey(uid)||event.key===null)setState({uid,mode:normalizeGlass(event.key===null?null:event.newValue),persisted:true});};
  window.addEventListener("storage",changed);
  return()=>window.removeEventListener("storage",changed);
 },[uid]);
 const setMode=value=>{const result=saveGlass(uid,value,storage());setState({uid,...result});};
 return <Context.Provider value={{mode,setMode,persisted:state.uid===uid?state.persisted:true}}>{children}</Context.Provider>;
}
export const useLiquidGlass=()=>useContext(Context);
