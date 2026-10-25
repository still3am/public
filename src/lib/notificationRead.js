const rows=value=>{const list=Array.isArray(value)?value:value?.items;if(!Array.isArray(list))throw Error('Read status could not be confirmed.');return list;};
async function owner(client,uid){const user=await client.auth.me();if(!uid||user?.id!==uid||user.disabled||user.is_blocked)throw Error('Your account changed. Reopen Activity.');}
// Read flags only; all notification content remains protected by database FLS.
export async function markNotificationRead(client,uid,id){
 await owner(client,uid);
 const original=await client.entities.Notification.get(id);
 if(original?.user_id!==uid)throw Error('This notification is unavailable.');
 if(original.read===true)return;
 await owner(client,uid);let failure;
 try{await client.entities.Notification.updateMany({id,user_id:uid},{$set:{read:true}});}catch(error){failure=error;}
 await owner(client,uid);
 const saved=await client.entities.Notification.get(id);
 if(saved?.user_id!==uid||saved.read!==true)throw failure||Error('Read status was not saved. Please retry.');
}
export async function markAllNotificationsRead(client,uid){
 await owner(client,uid);
 // Notifications arriving after this click stay unread.
 const query={user_id:uid,read:false,created_date:{$lte:new Date().toISOString()}};
 for(let page=0;page<200;page++){
  const before=rows(await client.entities.Notification.filter(query,'id',1));
  if(!before.length)return;
  await owner(client,uid);let failure;
  try{await client.entities.Notification.updateMany(query,{$set:{read:true}});}catch(error){failure=error;}
  await owner(client,uid);
  const after=rows(await client.entities.Notification.filter(query,'id',1));
  if(!after.length)return;
  if(after[0].id===before[0].id)throw failure||Error('Read status was not saved. Please retry.');
 }
 throw Error('Some notifications still need to be marked read. Please retry.');
}
