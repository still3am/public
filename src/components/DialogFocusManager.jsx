import {useEffect} from 'react';
export default function DialogFocusManager(){
 useEffect(()=>{
  let current=null,lastFocused=document.activeElement,previousFocused=null,frame=0;
  const openers=new WeakMap();
  const visible=()=>[...document.querySelectorAll('[role="dialog"]')].filter(el=>el.getClientRects().length&&getComputedStyle(el).visibility!=='hidden');
  const controls=dialog=>[...dialog.querySelectorAll('button:not(:disabled),a[href],input:not(:disabled),textarea:not(:disabled),select:not(:disabled),[tabindex="0"]')].filter(el=>el.getClientRects().length);
  const focus=e=>{previousFocused=lastFocused;lastFocused=e.target;};
  const update=()=>{
   frame=0;const dialogs=visible(),top=dialogs.at(-1),next=top?.hasAttribute('data-public-dialog')?top:null;
   // Keep the player mounted so its portaled menus and audio session survive.
   // Count only visible overlays: inactive retained tabs must not hide it.
   const menuOpen=[...document.querySelectorAll('[data-public-menu],[role="menu"],[role="listbox"]')].some(el=>el.getAttribute('aria-hidden')!=='true'&&el.getAttribute('data-state')!=='closed'&&el.getClientRects().length&&getComputedStyle(el).visibility!=='hidden');
   document.documentElement.toggleAttribute('data-public-overlay-open',dialogs.length>0||menuOpen);
   if(next===current)return;
   if(current&&!dialogs.includes(current)){
    const opener=openers.get(current);openers.delete(current);
    if(opener?.isConnected&&opener.getClientRects().length)opener.focus();
   }
   current=next;
   if(!current)return;
   if(!openers.has(current)){const active=document.activeElement;openers.set(current,current.contains(active)?previousFocused:active);}
   if(!current.contains(document.activeElement))(controls(current)[0]||current).focus();
  };
  const schedule=()=>{if(!frame)frame=requestAnimationFrame(update);};
  const key=e=>{
   if(!current||visible().at(-1)!==current||e.key!=='Tab')return;
   const items=controls(current);if(!items.length){e.preventDefault();current.focus();return;}
   const first=items[0],last=items.at(-1);
   if(e.shiftKey&&(document.activeElement===first||!current.contains(document.activeElement))){e.preventDefault();last.focus();}
   else if(!e.shiftKey&&(document.activeElement===last||!current.contains(document.activeElement))){e.preventDefault();first.focus();}
  };
  const observer=new MutationObserver(schedule);observer.observe(document.body,{childList:true,subtree:true,attributes:true,attributeFilter:['class','style','hidden','aria-hidden','data-state','role','data-public-menu']});
  document.addEventListener('focusin',focus);document.addEventListener('keydown',key);update();
  return()=>{observer.disconnect();document.documentElement.removeAttribute('data-public-overlay-open');if(frame)cancelAnimationFrame(frame);document.removeEventListener('focusin',focus);document.removeEventListener('keydown',key);const opener=current&&openers.get(current);if(opener?.isConnected)opener.focus();};
 },[]);
 return null;
}
