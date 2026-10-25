async function owner(client,uid){const current=await client.auth.me();if(!uid||current?.id!==uid||current.disabled||current.is_blocked)throw Error('Your account changed. Reopen Activity.');}
export async function markArtistReleasesRead(client,uid,targets){
 await owner(client,uid);
 const grouped=new Map();
 for(const row of targets){if(!row.subscription_id||!row.track_id)throw Error('This release is unavailable.');const ids=grouped.get(row.subscription_id)||new Set();ids.add(row.track_id);grouped.set(row.subscription_id,ids);}
 for(const [id,ids] of grouped){
  const original=await client.entities.ArtistSubscription.get(id);
  if(original?.created_by_id!==uid)throw Error('This artist subscription is unavailable.');
  await owner(client,uid);let failure;
  try{await client.entities.ArtistSubscription.updateMany({id,created_by_id:uid},{$addToSet:{read_track_ids:{$each:[...ids]}}});}catch(error){failure=error;}
  await owner(client,uid);
  const saved=await client.entities.ArtistSubscription.get(id);
  if(saved?.created_by_id!==uid||[...ids].some(track=>!saved.read_track_ids?.includes(track)))throw failure||Error('Release read status was not saved. Please retry.');
 }
}
