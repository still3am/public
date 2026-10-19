import {base44} from '@/api/base44Client';
import {readAllPages} from '@/lib/readPages';
// Built-in User access is own-account only. These two offline preference fields
// cannot authorize audio playback or modify another member's account.
const migrations=new Map();
const ids=tracks=>[...new Set((tracks||[]).map(value=>typeof value==='string'?value:value?.id).filter(id=>typeof id==='string'&&/^[a-zA-Z0-9_-]{1,100}$/.test(id)))];
async function owner(userId){
 const current=await base44.auth.me();
 if(!userId||current?.id!==userId)throw Error('Sign in to sync your offline music.');
 if(current.disabled||current.is_blocked)throw Error('Account unavailable.');
 return current;
}
async function ready(userId){
 const current=await owner(userId);
 if(current.offline_migrated===true)return current;
 if(migrations.has(userId))return migrations.get(userId);
 let job;
 job=(async()=>{
  const rows=await readAllPages(options=>base44.entities.OfflineSync.filter({user_id:userId},{sort:'-updated_date',...options}));
  const legacy=ids(rows.flatMap(row=>{try{const parsed=JSON.parse(row.tracks||'[]');return Array.isArray(parsed)?parsed:[];}catch{return [];}}));
  await owner(userId);
  let failure;
  try{
   const result=await base44.entities.User.updateMany({id:userId,offline_migrated:{$ne:true}},{
    $addToSet:{offline_track_ids:{$each:legacy}},$set:{offline_migrated:true}
   });
   if(result?.success===false)throw Error('Offline library migration was not confirmed.');
  }catch(error){failure=error;}
  const confirmed=await owner(userId);
  if(confirmed.offline_migrated!==true)throw failure||Error('Offline library migration was not confirmed.');
  return confirmed;
 })().finally(()=>{if(migrations.get(userId)===job)migrations.delete(userId);});
 migrations.set(userId,job);return job;
}
export async function getCloudList(userId){
 if(!userId)return [];
 const user=await ready(userId);
 return ids(user.offline_track_ids).map(id=>({id}));
}
async function write(userId,operation,selection){
 await ready(userId);
 const values=ids(selection);
 await owner(userId);
 const patch=operation==='add'?{$addToSet:{offline_track_ids:{$each:values}}}:operation==='remove'?{$pull:{offline_track_ids:{$in:values}}}:{$set:{offline_track_ids:[]}};
 let failure;
 try{const result=await base44.entities.User.updateMany({id:userId},patch);if(result?.success===false)throw Error('Offline selection did not save.');}catch(error){failure=error;}
 const current=await owner(userId),actual=ids(current.offline_track_ids);
 const confirmed=operation==='add'?values.every(id=>actual.includes(id)):operation==='remove'?values.every(id=>!actual.includes(id)):!actual.length;
 if(!confirmed)throw failure||Error('Your offline library changed. Please retry.');
 return actual.map(id=>({id}));
}
export const addCloudTracks=(userId,tracks)=>write(userId,'add',tracks);
export async function addCloudTrack(userId,track){if(userId&&track?.id)return addCloudTracks(userId,[track]);}
export async function removeCloudTrack(userId,id){if(userId&&id)return write(userId,'remove',[id]);}
export async function setCloudList(userId,tracks){if(!userId)return;if(!tracks?.length)return write(userId,'clear',[]);return addCloudTracks(userId,tracks);}
