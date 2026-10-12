import {clearAll,clearMeta} from '@/lib/offlineCache';
export async function clearPersonalData() {
 await clearAll();await clearMeta();
 for(const key of Object.keys(localStorage)) {
  if(key.startsWith('public:') && key!=='public:support-receipt') localStorage.removeItem(key);
 }
 window.dispatchEvent(new Event('account:cleared'));
 for(const event of ['offlinecache:change','recentplays:change','catalog:invalidate']) window.dispatchEvent(new Event(event));
}
