// Changes associations only. The database independently enforces owner-only
// row updates and track_ids-only field writes; no media is uploaded or signed.
const fail=(message,status=400)=>{throw Object.assign(new Error(message),{status});};
const rows=value=>Array.isArray(value)?value:value?.items||[];
async function all(entity,query,fields){
 const out=[];let cursor;const seen=new Set();
 for(let n=0;n<100;n++){
  const page=await entity.filter(query,{limit:200,fields,...(cursor?{cursor}:{})});out.push(...rows(page));
  if(Array.isArray(page)||!page?.has_more)return out;
  if(!page.next_cursor||seen.has(page.next_cursor))fail('Music could not finish loading. Try again.',503);
  seen.add(page.next_cursor);cursor=page.next_cursor;
 }
 fail('Choose fewer songs and try again.',400);
}
const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
export async function savePlaylistTracks(database,id,action,ids,expected){
 if(typeof id!=='string'||!id||!['playlistAdd','playlistRemove','playlistReorder'].includes(action))fail('Choose a playlist.');
 if(!Array.isArray(ids)||ids.length>5000||ids.some(id=>typeof id!=='string'||!id||id.length>100))fail('Invalid song selection.');
 const user=await database.auth.me();
 if(!user?.id)fail('Sign in to save songs.',401);
 if(user.disabled||user.is_blocked)fail('Account unavailable.',403);
 const {Playlist,Track,Block}=database.entities;
 const playlist=await Playlist.get(id);
 if(playlist.creator_id!==user.id&&user.role!=='admin')fail('Only the playlist owner can change its songs.',403);
 const current=playlist.track_ids||[],unique=[...new Set(ids)];
 const owner=async()=>{const confirmed=await database.auth.me();if(confirmed?.id!==user.id||confirmed.disabled||confirmed.is_blocked)fail('Your account changed. Reopen this playlist before saving.',403);};
 if(action==='playlistAdd'){
  const added=unique.filter(id=>!current.includes(id));
  if(added.length){
   const blocked=user.role==='admin'?[]:await all(Block,{$or:[{user_id:user.id},{blocked_user_id:user.id}]},['user_id','blocked_user_id']);
   const hidden=new Set(blocked.map(row=>row.user_id===user.id?row.blocked_user_id:row.user_id));
   for(let offset=0;offset<added.length;offset+=200){
    const wanted=added.slice(offset,offset+200),available=await all(Track,{id:{$in:wanted}},['id','uploader_id','is_published','approval_status']);
    const allowed=new Set(available.filter(t=>!hidden.has(t.uploader_id)&&(user.role==='admin'||t.uploader_id===user.id||t.is_published===true&&t.approval_status==='approved')).map(t=>t.id));
    if(wanted.some(id=>!allowed.has(id)))fail('One of these songs is no longer available. Refresh your selection.',403);
   }
  }
 }else if(action==='playlistReorder'){
  if(!same(expected,current))fail('This playlist changed on another device. Refresh before reordering.',409);
  const counts=values=>{const map=new Map();values.forEach(id=>map.set(id,(map.get(id)||0)+1));return map;};
  const before=counts(current),after=counts(ids);
  if(current.length!==ids.length||before.size!==after.size||[...before].some(([id,n])=>after.get(id)!==n))fail('Reorder must retain every stored song.');
 }
 await owner();
 // A plain array is a match-any shorthand in the entity query API. Use a
 // scalar revision, or explicit array equality, for the atomic order check.
 const revision=playlist.updated_date?{updated_date:playlist.updated_date}:{track_ids:{$eq:current}};
 const query={id,creator_id:playlist.creator_id,...(action==='playlistReorder'?revision:{})};
 const patch=action==='playlistAdd'?{$addToSet:{track_ids:{$each:unique}}}:action==='playlistRemove'?{$pull:{track_ids:{$in:unique}}}:{$set:{track_ids:ids}};
 let writeError;
 try{const result=await Playlist.updateMany(query,patch);if(result?.success===false)throw Error('Playlist save was not confirmed.');}catch(error){writeError=error;}
 await owner();
 const saved=await Playlist.get(id),actual=saved.track_ids||[];
 const confirmed=action==='playlistAdd'?unique.every(id=>actual.includes(id)):action==='playlistRemove'?unique.every(id=>!actual.includes(id)):same(actual,ids);
 if(!confirmed)throw writeError||Object.assign(Error('The playlist changed while saving. Refresh and retry.'),{status:409});
 return saved;
}
