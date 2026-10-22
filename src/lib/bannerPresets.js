export const BANNER_PRESETS=[{id:"roshi-reflections",name:"Roshi Reflections",url:"/banners/roshi-reflections.webp",gifUrl:"/banners/roshi-reflections.gif"}];
export function withPresetBanner(row){
 if(!row||row.banner_use_default)return row;
 const banner=BANNER_PRESETS.find(item=>item.url===row.banner_preset);
 return banner?{...row,banner_url:banner.url,banner_mobile_url:banner.url,banner_video_url:"",banner_gif_url:banner.gifUrl}:row;
}
const rows=value=>Array.isArray(value)?value:value?.items||[];
export async function savePresetBanner(client,url){
 const banner=BANNER_PRESETS.find(item=>item.url===url);if(!banner)throw Error("Choose a gallery banner.");
 const current=await client.auth.me();
 if(!current?.id||current.disabled||current.is_blocked)throw Error("Sign in again before changing your banner.");
 const owner=async()=>{const user=await client.auth.me();if(user?.id!==current.id||user.disabled||user.is_blocked)throw Error("Your account changed. Reopen your profile.");return user;};
 const row=rows(await client.entities.PublicProfile.filter({user_id:current.id,visible:true},"-updated_date",1))[0];
 if(!row)throw Error("Finish setting up your public profile first.");
 const patch={banner_preset:url,banner_use_default:false};let failure;
 await owner();try{await client.auth.updateMe(patch);}catch(error){failure=error;}
 const confirmed=await owner();
 if(confirmed.banner_preset!==url||confirmed.banner_use_default!==false)throw failure||Error("Your banner was not confirmed. Please retry.");
 failure=null;await owner();try{await client.entities.PublicProfile.update(row.id,patch);}catch(error){failure=error;}
 await owner();const publicRow=rows(await client.entities.PublicProfile.filter({user_id:current.id,visible:true},"-updated_date",1))[0];
 if(publicRow?.banner_preset!==url||publicRow?.banner_use_default!==false)throw failure||Error("Your public banner was not confirmed. Please retry.");
 if(typeof window!=="undefined")window.dispatchEvent(new Event("profiles:changed"));
 return withPresetBanner(confirmed);
}
