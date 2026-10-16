import {base44} from '@/api/base44Client';
let cached=null,loaded=false,expires=0,inflight=null,revision=0;
let writes=Promise.resolve();
export function invalidateAppSetting(){revision++;expires=0;inflight=null;}
export function acceptAppSetting(record){
 if(!record?.id)return false;
 revision++;cached=record;loaded=true;expires=Date.now()+30000;inflight=null;return true;
}
export async function readAppSetting(fresh=false){
 if(!fresh&&loaded&&Date.now()<expires)return cached;
 if(inflight)return inflight;
 const version=revision;
 let request;
 request=base44.entities.AppSetting.list('-created_date',1).then(page=>{
  const rows=Array.isArray(page)?page:page?.items;
  if(!Array.isArray(rows)||rows.some(row=>!row?.id))throw Error('App settings returned an invalid response. Please retry.');
  if(version!==revision)return loaded?cached:readAppSetting(true);
  cached=rows[0]||null;loaded=true;expires=Date.now()+30000;return cached;
 }).finally(()=>{if(inflight===request)inflight=null;});
 inflight=request;return request;
}
export function saveAppSetting(patch){
 const run=writes.then(async()=>{
  const current=await readAppSetting(true);
  const result=current?await base44.entities.AppSetting.update(current.id,patch):await base44.entities.AppSetting.create(patch);
  if(!result?.id)throw Error('Settings save was not confirmed. Please retry.');
  const updated={...current,...patch,...result};acceptAppSetting(updated);
  window.dispatchEvent(new CustomEvent('appsettings:changed',{detail:updated}));
  window.dispatchEvent(new CustomEvent('banner:changed',{detail:updated}));
  return updated;
 });
 writes=run.catch(()=>{});return run;
}
if(typeof window!=='undefined'){
 const changed=event=>{if(!acceptAppSetting(event.detail))invalidateAppSetting();};
 window.addEventListener('appsettings:changed',changed);
 window.addEventListener('banner:changed',changed);
}
