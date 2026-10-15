import {useEffect,useState} from 'react';
import {useToast} from '@/components/ui/use-toast';
export default function GlobalStatus() {
 const [offline,setOffline]=useState(!navigator.onLine);
 const {toast}=useToast();
 useEffect(()=>{const failed=event=>toast({title:event.detail?.message||"Couldn’t save that change. Please try again.",variant:"destructive"});window.addEventListener("public:error",failed);return()=>window.removeEventListener("public:error",failed);},[toast]);
 useEffect(()=>{
  const online=()=>setOffline(false),off=()=>setOffline(true);
  window.addEventListener('online',online);window.addEventListener('offline',off);
  return()=>{window.removeEventListener('online',online);window.removeEventListener('offline',off);};
 },[]);
 return offline?<div role="status" className="fixed top-0 inset-x-0 z-[200] text-center text-xs p-2 pt-[calc(.5rem+env(safe-area-inset-top))] bg-card border-b">Offline — your saved offline music is available.</div>:null;
}