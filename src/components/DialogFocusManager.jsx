import {useEffect} from 'react';
export default function DialogFocusManager(){
 useEffect(()=>{
  let current=null,previous=null;
  const visible=()=>[...document.querySelectorAll('[role="dialog"]')].filter(el=>el.getClientRects().length&&getComputedStyle(el).visibility!=='hidden');
  const update=()=>{
   const top=visible().at(-1),next=top?.hasAttribute('data-public-dialog')?top:null;
   if(next===current)return;
   if(current&&previous?.isConnected)previous.focus();
   current=next;previous=current?document.activeElement:null;
   if(current){const first=current.querySelector('button:not(:disabled),a[href],input:not(:disabled),textarea:not(:disabled),select:not(:disabled),[tabindex="0"]');(first||current).focus();}
  };
  const key=e=>{
   if(!current||visible().at(-1)!==current||e.key!=='Tab')return;
   const items=[...current.querySelectorAll('button:not(:disabled),a[href],input:not(:disabled),textarea:not(:disabled),select:not(:disabled),[tabindex="0"]')].filter(el=>el.getClientRects().length);
   if(!items.length){e.preventDefault();current.focus();return;}
   const first=items[0],last=items.at(-1);
   if(e.shiftKey&&(document.activeElement===first||!current.contains(document.activeElement))){e.preventDefault();last.focus();}
   else if(!e.shiftKey&&(document.activeElement===last||!current.contains(document.activeElement))){e.preventDefault();first.focus();}
  };
  const observer=new MutationObserver(update);observer.observe(document.body,{childList:true,subtree:true});document.addEventListener('keydown',key);update();
  return()=>{observer.disconnect();document.removeEventListener('keydown',key);if(previous?.isConnected)previous.focus();};
 },[]);
 return null;
}