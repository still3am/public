import {useEffect,useState} from 'react';
export default function GlobalStatus() {
 const [offline,setOffline]=useState(!navigator.onLine);
 useEffect(()=>{
  const online=()=>setOffline(false),off=()=>setOffline(true);
  window.addEventListener('online',online);window.addEventListener('offline',off);
  return()=>{window.removeEventListener('online',online);window.removeEventListener('offline',off);};
 },[]);
 return offline?<div role="status" className="fixed top-0 inset-x-0 z-[200] text-center text-xs p-2 pt-[calc(.5rem+env(safe-area-inset-top))] bg-card border-b">Offline — saved downloads remain available.</div>:null;
}