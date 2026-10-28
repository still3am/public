// Regular-account writes remain behind server authorization.
// Administrators may use their existing native RLS permission without a function call.
export async function followWrite(client, method, args, fallback) {
 const user=await client.auth.me();
 if(user?.role!=="admin")return fallback();
 const deny=message=>{throw Object.assign(Error(message),{status:403});};
 if(!user.id||user.disabled||user.is_blocked)deny("Account unavailable.");
 if(!["create","deleteMany"].includes(method))return fallback();
 const query=args[0];
 if(!query||Object.keys(query).some(k=>!["follower_id","following_id"].includes(k))||
    query.follower_id!==user.id||typeof query.following_id!=="string"||
    !query.following_id||query.following_id===user.id)deny("Invalid follow target.");
 const current=async()=>{
  const account=await client.auth.me();
  if(account?.id!==user.id||account.role!=="admin"||account.disabled||account.is_blocked)deny("Account changed or unavailable.");
 };
 const available=async()=>{
  await current();
  const blocks=rows(await client.entities.Block.filter({$or:[
   {user_id:user.id,blocked_user_id:query.following_id},
   {user_id:query.following_id,blocked_user_id:user.id}
  ]},"-created_date",1));
  if(blocks.length)deny("Interaction is unavailable because a user is blocked.");
  const target=await client.entities.User.get(query.following_id);
  if(!target?.id||target.id!==query.following_id||target.disabled||target.is_blocked)deny("Account unavailable.");
  await current();
 };
 await available();
 const follows=client.entities.Follow;
 if(method==="create"){
  const existing=rows(await follows.filter(query,"-created_date",1));
  if(existing.length)return existing[0];
  await available();
  return follows.create({follower_id:user.id,following_id:query.following_id});
 }
 // Fetch from offset zero after each batch so deletions cannot skip duplicates.
 const removed=[];
 for(;;){
  const page=rows(await follows.filter(query,"-created_date",100));
  if(!page.length)return removed;
  for(const row of page){
   if(!row.id||row.follower_id!==user.id||row.following_id!==query.following_id)deny("Invalid follow record.");
   await available();
   await follows.delete(row.id);
   removed.push(row.id);
  }
  const remaining=rows(await follows.filter(query,"-created_date",1));
  if(remaining.some(row=>removed.includes(row.id)))throw Error("Follow removal was not confirmed.");
 }
}
// Confirm persistence before showing success; share a lock across all entry points.
const pending=new Map();
const rows=page=>{if(Array.isArray(page))return page;if(Array.isArray(page?.items))return page.items;throw Error('Could not confirm follow status.');};
export function followError(error){
 const status=error?.response?.status??error?.status;
 if(status===402)return 'Couldn’t save this follow right now. Please try again later.';
 if(status===401)return 'Sign in again to follow this listener.';
 if(status===403){
  const reason=String(error?.response?.data?.error||error?.response?.data?.message||error?.message||'');
  if(/user is blocked|account is unavailable|account unavailable|suspended/i.test(reason))return 'This account is unavailable for following.';
  if(/platform domain/i.test(reason))return 'Following is unavailable in this preview. Open the published PUBLIC site and retry.';
  return 'PUBLIC could not authorize this follow. Please sign in again and retry.';
 }
 return error?.message==='Follow change already in progress.'?error.message:'Your follow change could not be confirmed. Refresh the profile and try again.';
}
export function setFollowState(client,uid,target,desired){
 if(!uid||!target||uid===target)return Promise.reject(Error('Invalid follow target.'));
 const key=uid+':'+target;
 const active=pending.get(key);
 if(active)return active.desired===desired?active.promise:Promise.reject(Error('Follow change already in progress.'));
 const promise=(async()=>{
  const current=await client.auth.me();
  if(current?.id!==uid||current.is_blocked||current.disabled)throw Object.assign(Error('Account unavailable.'),{status:401});
  const query={follower_id:uid,following_id:target};
  const read=async()=>rows(await client.entities.Follow.filter(query,'-created_date',1)).length>0;
  const before=await read();
  if(before===desired)return {following:before,changed:false};
  try{
   if(desired){const saved=await client.entities.Follow.create(query);if(!saved?.id)throw Error('Follow was not confirmed.');}
   else await client.entities.Follow.deleteMany(query);
  }catch(error){
   // A lost response can still represent a committed write. A read reconciles it.
   if(await read().catch(()=>!desired)===desired)return {following:desired,changed:true};
   throw error;
  }
  if(await read()!==desired)throw Error('Follow was not confirmed.');
  return {following:desired,changed:true};
 })();
 pending.set(key,{desired,promise});
 const cleanup=()=>{if(pending.get(key)?.promise===promise)pending.delete(key);};
 promise.then(cleanup,cleanup);
 return promise;
}
