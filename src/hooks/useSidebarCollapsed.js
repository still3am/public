import {useEffect,useState} from "react";
const KEY="sidebar_collapsed",EVENT="sidebar:collapsed";
let memory=false;
function read(){
 try{const value=localStorage.getItem(KEY);if(value!==null)memory=value==="1";}
 catch{/* Storage may be unavailable; preserve this window's preference. */}
 return memory;
}
export function useSidebarCollapsed(){
 const [collapsed,setCollapsed]=useState(read);
 useEffect(()=>{
  const sync=event=>{
   if(event.type==="storage"&&event.key!==null&&event.key!==KEY)return;
   if(event.type===EVENT&&typeof event.detail==="boolean")memory=event.detail;
   else if(event.type==="storage"&&event.newValue===null)memory=false;
   else read();
   setCollapsed(memory);
  };
  window.addEventListener(EVENT,sync);window.addEventListener("storage",sync);
  return()=>{window.removeEventListener(EVENT,sync);window.removeEventListener("storage",sync);};
 },[]);
 const toggle=()=>{
  const next=!read();memory=next;
  try{localStorage.setItem(KEY,next?"1":"0");}catch{}
  setCollapsed(next);
  window.dispatchEvent(new CustomEvent(EVENT,{detail:next}));
 };
 return {collapsed,toggle};
}
