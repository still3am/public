import {clearAll,clearMeta,getOfflineAccount,setOfflineAccount,rememberLegacyOfflineOwner} from '@/lib/offlineCache';
export async function clearPersonalData({deleteOffline=false,userId=getOfflineAccount()}={}) {
 let legacyOwner=userId;try{legacyOwner=legacyOwner||localStorage.getItem("public:active-account");}catch{}
 rememberLegacyOfflineOwner(legacyOwner);
 setOfflineAccount(null);
 // Invalidate pending downloads and playback before clearing session state.
 window.dispatchEvent(new Event('account:cleared'));
 try{
  if(deleteOffline&&userId){await clearAll(userId);await clearMeta(userId);}
 }finally{
  try{for(const key of Object.keys(localStorage)){
   if(!key.startsWith('public:')||key==='public:device_id')continue;
   if(key.startsWith('public:offline:')){
    if(deleteOffline&&(key==="public:offline:suppressed:"+userId||(key==="public:offline:legacy-owner"&&localStorage.getItem(key)===userId)))localStorage.removeItem(key);
    continue;
   }
   localStorage.removeItem(key);
  }}catch{}
  for(const event of ['offlinecache:change','recentplays:change','catalog:invalidate','transitions:change'])window.dispatchEvent(new Event(event));
 }
}

