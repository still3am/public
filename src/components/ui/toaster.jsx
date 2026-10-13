import {useEffect} from "react";
import { useToast } from "@/components/ui/use-toast";
import { Toast, ToastClose, ToastDescription, ToastProvider, ToastTitle, ToastViewport } from "@/components/ui/toast";

function ToastItem({item,dismiss}){
 const {id,title,description,action,duration=4500,open,onOpenChange,...props}=item;
 useEffect(()=>{if(duration===Infinity)return;const timer=setTimeout(()=>dismiss(id),duration);return()=>clearTimeout(timer);},[id,title,duration,dismiss]);
 return <Toast {...props}><div className="grid gap-1 min-w-0">{title&&<ToastTitle>{title}</ToastTitle>}{description&&<ToastDescription>{description}</ToastDescription>}</div>{action}<ToastClose aria-label="Dismiss notification" onClick={e=>{e.stopPropagation();dismiss(id);}}/></Toast>;
}
export function Toaster() {
  const { toasts,dismiss } = useToast();
  return <ToastProvider>{toasts.filter(item=>item.open&&item.variant!=="destructive").slice(0,3).map(item=><ToastItem key={item.id} item={item} dismiss={dismiss}/>)}</ToastProvider>;
}
