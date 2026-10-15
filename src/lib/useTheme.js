import {useCallback,useEffect,useState} from "react";
const KEY="public-theme",EVENT="public-theme-change";
const systemTheme=()=>{try{return window.matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light";}catch{return "light";}};
const stored=()=>{try{const value=localStorage.getItem(KEY);return ["dark","light"].includes(value)?value:null;}catch{return null;}};
let current=stored()||systemTheme(),explicit=!!stored();
function apply(next,persist=false){
 current=next;
 if(persist){explicit=true;try{localStorage.setItem(KEY,next);}catch{}}
 document.documentElement.classList.toggle("dark",next==="dark");
 document.documentElement.style.colorScheme=next;
 window.dispatchEvent(new CustomEvent(EVENT,{detail:{theme:next}}));
}
export function useTheme(){
 const [theme,setState]=useState(current);
 useEffect(()=>{
  const update=event=>setState(event.detail?.theme||current);
  const storage=event=>{if(event.key!==KEY&&event.key!==null)return;explicit=!!stored();apply(stored()||systemTheme());};
  const media=window.matchMedia?.("(prefers-color-scheme: dark)");
  const os=()=>{if(!explicit)apply(systemTheme());};
  window.addEventListener(EVENT,update);window.addEventListener("storage",storage);media?.addEventListener?.("change",os);
  document.documentElement.classList.toggle("dark",current==="dark");document.documentElement.style.colorScheme=current;
  return()=>{window.removeEventListener(EVENT,update);window.removeEventListener("storage",storage);media?.removeEventListener?.("change",os);};
 },[]);
 const setTheme=useCallback(value=>apply(value==="dark"?"dark":"light",true),[]);
 const toggle=useCallback(()=>apply(current==="dark"?"light":"dark",true),[]);
 return {theme,setTheme,toggle,isDark:theme==="dark"};
}
