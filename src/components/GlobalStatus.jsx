import {useEffect} from 'react';
import {useToast} from '@/components/ui/use-toast';
export default function GlobalStatus() {
 const {toast}=useToast();
 useEffect(()=>{const failed=event=>toast({title:event.detail?.message||"Couldn’t save that change. Please try again.",variant:"destructive"});window.addEventListener("public:error",failed);return()=>window.removeEventListener("public:error",failed);},[toast]);
 return null;
}