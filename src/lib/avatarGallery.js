import {AVATAR_PRESETS} from "./avatarPresets.js";
const rows=value=>Array.isArray(value)?value:value?.items||[];
export async function loadAvatarGallery(client){
 const removed=new Set(rows(await client.entities.AvatarRemoval.list("-created_date",1000)).map(row=>row.avatar_id));
 return AVATAR_PRESETS.filter(item=>!removed.has(item.id));
}
export async function removeGalleryAvatar(client,id){
 const user=await client.auth.me();
 if(user?.role!=="admin"||user.disabled||user.is_blocked)throw Error("Only admins can remove gallery avatars.");
 if(!AVATAR_PRESETS.some(item=>item.id===id))throw Error("Unknown avatar.");
 let failure;
 try{await client.entities.AvatarRemoval.create({avatar_id:id});}catch(error){failure=error;}
 const confirmed=rows(await client.entities.AvatarRemoval.filter({avatar_id:id},"-created_date",1));
 if(!confirmed.length)throw failure||Error("Deletion was not confirmed. Please retry.");
 if(typeof window!=="undefined")window.dispatchEvent(new Event("avatar-gallery:changed"));
}
