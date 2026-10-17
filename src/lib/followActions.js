// Follow writes remain behind server authorization (including block checks).
// Confirm persistence before showing success; share a lock across all entry points.
const pending=new Map();
const rows=page=>{if(Array.isArray(page))return page;if(Array.isArray(page?.items))return page.items;throw Error('Could not confirm follow status.');};
export function followError(error){
 const status=error?.response?.status??error?.status;
 if(status===402)return 'Following is unavailable because PUBLIC has reached its Base44 integration limit. Your follow change was not saved.';
 if(status===401)return 'Sign in again to follow this listener.';
 if(status===403)return 'This follow change is not allowed. The account may be unavailable or blocked.';
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
