import {AVATAR_PRESETS} from "./avatarPresets.js";
const rows=value=>Array.isArray(value)?value:value?.items||[];
export async function loadAvatarGallery(client){
 const removed=new Set(rows(await client.entities.AvatarRemoval.list("-created_date",1000)).map(row=>row.avatar_id));
 const submitted=client.entities.GallerySubmission
  ? rows(await client.entities.GallerySubmission.filter({kind:"avatar",status:"approved"},"-created_date",1000).catch(()=>[]))
  : [];
 return [...AVATAR_PRESETS,...submitted.map(item=>({...item,gifUrl:/\.gif(?:$|\?)/i.test(item.url)?item.url:undefined}))].filter(item=>!removed.has(item.id));
}
export async function removeGalleryAvatar(client,id){
 const user=await client.auth.me();
 if(user?.role!=="admin"||user.disabled||user.is_blocked)throw Error("Only admins can remove gallery avatars.");
 if(!(await loadAvatarGallery(client)).some(item=>item.id===id))throw Error("Unknown avatar.");
 let failure;
 try{await client.entities.AvatarRemoval.create({avatar_id:id});}catch(error){failure=error;}
 const confirmed=rows(await client.entities.AvatarRemoval.filter({avatar_id:id},"-created_date",1));
 if(!confirmed.length)throw failure||Error("Deletion was not confirmed. Please retry.");
 if(typeof window!=="undefined")window.dispatchEvent(new Event("avatar-gallery:changed"));
}
