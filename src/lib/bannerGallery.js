import {BANNER_PRESETS} from "./bannerPresets.js";
const rows=value=>Array.isArray(value)?value:value?.items||[];
export async function loadBannerGallery(client){
 const removed=new Set(rows(await client.entities.BannerRemoval.list("-created_date",1000)).map(row=>row.banner_id));
 const submitted=client.entities.GallerySubmission
  ? rows(await client.entities.GallerySubmission.filter({kind:"banner",status:"approved"},"-created_date",1000).catch(()=>[]))
  : [];
 return [...BANNER_PRESETS,...submitted.map(item=>({...item,gifUrl:item.gif_url||(/\.gif(?:$|\?)/i.test(item.url)?item.url:undefined),source:item.source,creatorName:item.creator_name,sourceUrl:item.source_url}))].filter(item=>!removed.has(item.id));
}
export async function removeGalleryBanner(client,id){
 const user=await client.auth.me();
 if(user?.role!=="admin"||user.disabled||user.is_blocked)throw Error("Only admins can delete gallery banners.");
 if(!(await loadBannerGallery(client)).some(item=>item.id===id))throw Error("Unknown banner.");
 const existing=rows(await client.entities.BannerRemoval.filter({banner_id:id},"-created_date",1));
 if(!existing.length){
  const current=await client.auth.me();
  if(current?.id!==user.id||current.role!=="admin"||current.disabled||current.is_blocked)throw Error("Your account changed. Reopen the gallery.");
  let failure;try{await client.entities.BannerRemoval.create({banner_id:id});}catch(error){failure=error;}
  if(!rows(await client.entities.BannerRemoval.filter({banner_id:id},"-created_date",1)).length)throw failure||Error("Deletion was not confirmed. Please retry.");
 }
 if(typeof window!=="undefined")window.dispatchEvent(new Event("banner-gallery:changed"));
}
