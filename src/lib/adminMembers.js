// Built-in User uses the array/offset endpoint; cursor v2 is not available
// consistently for account records. Keep this separate from catalog pagination.
export async function loadAdminMembers(client){
 const current=await client.auth.me();
 if(current?.role!=='admin'||current.disabled||current.is_blocked)throw Error('Administrator access required.');
 const users=new Map(),size=100;
 for(let skip=0;skip<100000;skip+=size){
  const response=await client.entities.User.list('-created_date',size,skip);
  const rows=Array.isArray(response)?response:response?.items||response?.entities;
  if(!Array.isArray(rows))throw Error('The member list returned an invalid response.');
  let added=0;for(const row of rows)if(row?.id&&!users.has(row.id)){users.set(row.id,row);added++;}
  if(rows.length<size)return [...users.values()];
  if(!added)throw Error('Member pagination could not finish. Please refresh.');
 }
 throw Error('The member list could not finish loading.');
}
