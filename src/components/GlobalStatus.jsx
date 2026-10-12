import {useEffect,useState} from 'react';
import {useToast} from '@/components/ui/use-toast';
export default function GlobalStatus() {
 const {toast}=useToast(),[offline,setOffline]=useState(!navigator.onLine);
 useEffect(()=>{
  const online=()=>setOffline(false),off=()=>setOffline(true);
  const failed=()=>toast({title:'An action could not complete',description:'Check your connection and retry. Contact Support if this continues.',variant:'destructive'});
  window.addEventListener('online',online);window.addEventListener('offline',off);window.addEventListener('unhandledrejection',failed);window.addEventListener('public:error',failed);
  return()=>{window.removeEventListener('online',online);window.removeEventListener('offline',off);window.removeEventListener('unhandledrejection',failed);window.removeEventListener('public:error',failed);};
 },[toast]);
 return offline?<div role="status" className="fixed top-0 inset-x-0 z-[200] text-center text-xs p-2 pt-[calc(.5rem+env(safe-area-inset-top))] bg-card border-b">Offline — saved downloads remain available.</div>:null;
}