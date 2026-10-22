export const BANNER_PRESETS=[{"id":"roshi-reflections","name":"Roshi Reflections","url":"/banners/roshi-reflections.webp","gifUrl":"/banners/roshi-reflections.gif"},{"id":"neon-code","name":"Neon Code","url":"/banners/neon-code.webp","gifUrl":"/banners/neon-code.gif"},{"id":"matrix-rain","name":"Matrix Rain","url":"/banners/matrix-rain.webp"},{"id":"daffy-money","name":"Daffy Money","url":"/banners/daffy-money.webp","gifUrl":"/banners/daffy-money.gif"},{"id":"cartoon-roll","name":"Cartoon Roll","url":"/banners/cartoon-roll.webp","gifUrl":"/banners/cartoon-roll.gif"},{"id":"hadouken","name":"Hadouken","url":"/banners/hadouken.webp","gifUrl":"/banners/hadouken.gif"},{"id":"pixel-boxing","name":"Pixel Boxing","url":"/banners/pixel-boxing.webp","gifUrl":"/banners/pixel-boxing.gif"},{"id":"world-is-yours","name":"World Is Yours","url":"/banners/world-is-yours.webp"},{"id":"pokemon-friends","name":"Pokémon Friends","url":"/banners/pokemon-friends.webp"},{"id":"roshi-reaction","name":"Roshi Reaction","url":"/banners/roshi-reaction.webp","gifUrl":"/banners/roshi-reaction.gif"},{"id":"midnight-music-bar","name":"Midnight Music Bar","url":"/banners/midnight-music-bar.webp","gifUrl":"/banners/midnight-music-bar.gif"},{"id":"ryu-and-ken","name":"Ryu and Ken","url":"/banners/ryu-and-ken.webp","gifUrl":"/banners/ryu-and-ken.gif"},{"id":"desert-rv","name":"Desert RV","url":"/banners/desert-rv.webp","gifUrl":"/banners/desert-rv.gif"},{"id":"golden-getaway","name":"Golden Getaway","url":"/banners/golden-getaway.webp"}];
export function withPresetBanner(row){
 if(!row||row.banner_use_default)return row;
 const banner=BANNER_PRESETS.find(item=>item.url===row.banner_preset);
 return banner?{...row,banner_url:banner.url,banner_mobile_url:banner.url,banner_video_url:"",banner_gif_url:banner.gifUrl||""}:row;
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
