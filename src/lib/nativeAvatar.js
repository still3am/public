import {withPresetBanner} from "./bannerPresets.js";
import {AVATAR_PRESETS} from "./avatarPresets.js";
export const PRESET_AVATAR_VALUES=["","initials",...AVATAR_PRESETS.map(item=>item.url)];
export function withPresetAvatar(row){
 row=withPresetBanner(row);
 if(!row)return row;
 row={...row,is_artist:row.role!=="admin"&&row.creator_role==="artist"};
 if(row.avatar_preset==="initials")return {...row,avatar_url:"",avatar_video_url:"",avatar_gif_url:""};
 if(AVATAR_PRESETS.some(item=>item.url===row.avatar_preset))return {...row,avatar_url:row.avatar_preset,avatar_video_url:"",avatar_gif_url:""};
 return row;
}
const rows=value=>Array.isArray(value)?value:value?.items||[];
export async function savePresetAvatar(client,url){
 if(url!==""&&!AVATAR_PRESETS.some(item=>item.url===url))throw Error("Choose a built-in avatar.");
 const current=await client.auth.me();
 if(!current?.id||current.disabled||current.is_blocked)throw Error("Sign in again before changing your avatar.");
 const value=url||"initials";
 const profiles=await client.entities.PublicProfile.filter({user_id:current.id,visible:true},"-updated_date",1);
 const row=rows(profiles)[0];if(!row)throw Error("Finish setting up your public profile first.");
 let failure;
 try{await client.auth.updateMe({avatar_preset:value});}catch(error){failure=error;}
 const confirmed=await client.auth.me();
 if(confirmed?.id!==current.id||confirmed.avatar_preset!==value){if(failure)throw failure;throw Error("Your avatar wasn’t confirmed. Please retry.");}
 failure=null;
 try{await client.entities.PublicProfile.update(row.id,{avatar_preset:value});}catch(error){failure=error;}
 const publicRow=rows(await client.entities.PublicProfile.filter({user_id:current.id,visible:true},"-updated_date",1))[0];
 if(publicRow?.avatar_preset!==value){if(failure)throw failure;throw Error("Your public avatar wasn’t confirmed. Please retry.");}
 if(typeof window!=="undefined")window.dispatchEvent(new Event("profiles:changed"));
 return withPresetAvatar(confirmed);
}

