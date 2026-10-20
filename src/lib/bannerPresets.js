export const BANNER_PRESETS=[{"id":"chrome","name":"Chrome","url":"/banners/chrome.svg","videoUrl":"","gifUrl":""},{"id":"aurora","name":"Aurora","url":"/banners/aurora.svg","videoUrl":"","gifUrl":""},{"id":"afterglow","name":"Afterglow","url":"/banners/afterglow.svg","videoUrl":"","gifUrl":""},{"id":"blue-hour","name":"Blue Hour","url":"/banners/blue-hour.svg","videoUrl":"","gifUrl":""},{"id":"moss","name":"Moss","url":"/banners/moss.svg","videoUrl":"","gifUrl":""},{"id":"rose","name":"Rose","url":"/banners/rose.svg","videoUrl":"","gifUrl":""}];
export function withPresetBanner(row){
 if(!row)return row;
 const preset=BANNER_PRESETS.find(item=>item.url===row.banner_preset);
 return preset?{...row,banner_url:preset.url,banner_mobile_url:preset.url,banner_video_url:preset.videoUrl,banner_gif_url:preset.gifUrl}:row;
}
const rows=value=>Array.isArray(value)?value:value?.items||[];
export async function savePresetBanner(client,url){
 if(!BANNER_PRESETS.some(item=>item.url===url))throw Error("Choose a built-in banner.");
 const current=await client.auth.me();
 if(!current?.id||current.disabled||current.is_blocked)throw Error("Sign in again before changing your banner.");
 const row=rows(await client.entities.PublicProfile.filter({user_id:current.id,visible:true},"-updated_date",1))[0];
 if(!row)throw Error("Finish setting up your public profile first.");
 const patch={banner_preset:url,banner_use_default:false};
 if((await client.auth.me())?.id!==current.id)throw Error("Your account changed. Reopen your profile.");
 let failure;
 try{await client.auth.updateMe(patch);}catch(error){failure=error;}
 const confirmed=await client.auth.me();
 if(confirmed?.id!==current.id||confirmed.banner_preset!==url||confirmed.banner_use_default!==false)throw failure||Error("Your banner wasn’t confirmed. Please retry.");
 failure=null;
 try{await client.entities.PublicProfile.update(row.id,patch);}catch(error){failure=error;}
 if((await client.auth.me())?.id!==current.id)throw Error("Your account changed. Reopen your profile.");
 const mirror=rows(await client.entities.PublicProfile.filter({user_id:current.id,visible:true},"-updated_date",1))[0];
 if(mirror?.banner_preset!==url||mirror.banner_use_default!==false)throw failure||Error("Your public banner wasn’t confirmed. Please retry.");
 if(typeof window!=="undefined")window.dispatchEvent(new Event("profiles:changed"));
 return withPresetBanner(confirmed);
}
