export function creatorType(user){return user?.role==='admin'?'admin':['artist','uploader'].includes(user?.creator_role)?user.creator_role:'listener';}
export function canUploadMusic(user){return !!user?.id&&!user.disabled&&!user.is_blocked&&creatorType(user)!=='listener';}
export async function setCreatorAccess(client,member,type){
 const admin=await client.auth.me();if(admin?.role!=='admin'||admin.disabled||admin.is_blocked)throw Error('Administrator access required.');
 if(member.role==='admin')throw Error('Administrators keep their existing access.');
 if(!['listener','uploader','artist'].includes(type))throw Error('Invalid creator role.');
 if(type==='artist'){
 const apps=await client.entities.ArtistApplication.filter({user_id:member.id},'-created_date',100);
 if(!(Array.isArray(apps)?apps:apps?.items||[]).some(a=>a.status==='pending'||a.status==='approved'))throw Error('An artist application is required.');
 }
 const patch={creator_role:type,is_artist:type==='artist'};
 await client.entities.User.update(member.id,patch);
 const confirmed=await client.entities.User.get(member.id);if(confirmed.creator_role!==type)throw Error('Role change could not be confirmed.');
 const profiles=await client.entities.PublicProfile.filter({user_id:member.id},'-updated_date',100);
 for(const profile of Array.isArray(profiles)?profiles:profiles?.items||[])await client.entities.PublicProfile.update(profile.id,patch);
 if(typeof window!=='undefined')window.dispatchEvent(new Event('profiles:changed'));
 return confirmed;
}
