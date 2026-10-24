import {BANNER_PRESETS,savePresetBanner} from "@/lib/bannerPresets";
import {entityRows} from "@/lib/entityRows";
import {followWrite} from "@/lib/followActions";
import {loungeAction} from "@/lib/adminLounge";
import {saveTimedLyrics} from "@/lib/saveTimedLyrics";
import {AVATAR_PRESETS} from "@/lib/avatarPresets";
import recoveredAlbumMetadata from "@/data/recoveredAlbumMetadata.json";
import {recoveredAlbumResult,withRecoveredAlbumMetadata} from "@/lib/recoveredAlbums";
import {savePresetAvatar,withPresetAvatar} from "@/lib/nativeAvatar";
import { createClient } from '@base44/sdk';
import { appParams } from '@/lib/app-params';
const { appId, token, functionsVersion, appBaseUrl } = appParams;
const raw = createClient({appId,token,functionsVersion,serverUrl:'',requiresAuth:false,appBaseUrl});
const guarded = new Set(['Track','Lyrics','LoungeSession','LoungeMember','LoungeQueueItem','ProfileComment','TrackAnnotation','Suggestion','Notification','Message','Conversation','Follow','Playlist']);
const lounge = new Set(['LoungeSession','LoungeMember','LoungeQueueItem']);
const gateway = async(entity,action,args) => {const response=await raw.functions.invoke('securityGateway',{entity,action,args});if(!response?.data || !Object.prototype.hasOwnProperty.call(response.data,'result'))throw new Error(response?.data?.error||'Invalid security gateway response');const result=response.data.result;if(entity==='Track'&&action!=='read')window.dispatchEvent(new Event('catalog:invalidate'));return result;};
const handlers = new Map();
const entities = new Proxy(raw.entities,{get(target,name) {
  if(typeof name!=='string')return Reflect.get(target,name);
  if(name==="PublicProfile"){
   if(!handlers.has(name))handlers.set(name,new Proxy(target[name],{get(h,method){
    if(typeof method==="string" && ["get","list","filter"].includes(method))return async(...args)=>{const readArgs=args.map(arg=>arg&&typeof arg==="object"&&!Array.isArray(arg)&&Array.isArray(arg.fields)&&(arg.fields.includes("avatar_url")||arg.fields.includes("banner_url"))?{...arg,fields:[...new Set([...arg.fields,"avatar_preset","banner_preset","creator_role"])]}:arg);const page=await h[method](...readArgs);return Array.isArray(page)?page.map(withPresetAvatar):Array.isArray(page?.items)?{...page,items:page.items.map(withPresetAvatar)}:withPresetAvatar(page);};
    return h[method];
   }}));
   return handlers.get(name);
  }
  if(!guarded.has(name))return target[name];
  if(!handlers.has(name)) handlers.set(name,new Proxy(target[name],{get(h,method) {
    if(typeof method!=="string")return Reflect.get(h,method);
    if(lounge.has(name)&&["get","list","filter","create","update","delete"].includes(method))return (...args)=>loungeAction(raw,name,method,args,()=>gateway(name,["get","list","filter"].includes(method)?"read":method,["get","list","filter"].includes(method)?[method,...args]:args));
    if(name==='Follow'&&['create','deleteMany'].includes(method))return (...args)=>followWrite(raw,method,args,()=>gateway(name,method,args));
    if(name==='Track'&&method==='update')return (id,patch)=>Object.keys(patch||{}).length===1&&Object.hasOwn(patch,"lyrics_text")?saveManualLyrics(raw,id,patch):gateway(name,method,[id,patch]);
    if(['create','update','delete','deleteMany','bulkUpdate'].includes(method)) return async (...args)=>{if(method==='bulkUpdate'&&Array.isArray(args[0])&&args[0].length>100){const results=[];for(let i=0;i<args[0].length;i+=100)results.push(...await gateway(name,method,[args[0].slice(i,i+100)]));return results;}return gateway(name,method,args);};
    if(name==='Track'&&['get','list','filter','count','aggregate'].includes(method)) return async (...args)=>{
      try { return recoveredAlbumResult(await gateway(name,'read',[method,...args]),recoveredAlbumMetadata); }
      catch(error) {
        // Function availability must not blank an otherwise accessible catalog.
        // The entity API independently enforces Track RLS and private-file FLS.
        const status=error?.response?.status ?? error?.status;
        const platformFunctionOrigin=status===403&&String(error?.response?.data?.message||error?.message||'').includes('Backend functions cannot be accessed from the platform domain');
        if((status===403&&!platformFunctionOrigin) || status===422 || (method==='get'&&status===404))throw error;
        const current=await raw.auth.me().catch(e=>{if((e.status??e.response?.status)===401)return null;throw e;});
        const blocks=current&&current.role!=='admin'?await raw.entities.Block.filter({$or:[{user_id:current.id},{blocked_user_id:current.id}]},'-created_date',1000):[];
        const hidden=blocks.map(r=>r.user_id===current.id?r.blocked_user_id:r.user_id);
        const rule=hidden.length?{uploader_id:{$nin:hidden}}:{};
        let result;
        if(method==='get'){
          result=await h.get(args[0]);
          if(hidden.includes(result?.uploader_id))throw Object.assign(new Error('Track unavailable'),{status:403});
        }else if(method==='filter'||method==='count')result=await h[method]({$and:[args[0]||{},rule]},...args.slice(1));
        else if(method==='list')result=await h.filter(rule,...args);
        else result=await h.aggregate({...args[0],query:{$and:[args[0]?.query||{},rule]}});

        const mark=t=>{const track=withRecoveredAlbumMetadata(t,recoveredAlbumMetadata);return track&&!track.audio_url?{...track,_private_audio:true}:track;};
        if(method==='get'){
          const track=mark(result);
          // Private audio still requires the gateway to authorize and sign it.
          if(track?._private_audio)throw error;
          return track;
        }
        if(Array.isArray(result))return result.map(mark);
        if(Array.isArray(result?.items))return {...result,items:result.items.map(mark)};
        return result;
      }
    };
    if(lounge.has(name)&&['get','list','filter'].includes(method)) return (...args)=>gateway(name,'read',[method,...args]);
    return h[method];
  }}));
  return handlers.get(name);
}});
// Narrow native database surface for public song-note metadata.
// Track RLS/FLS still enforce publication and protect private audio.
// Playlist membership only: native RLS/FLS permits the owner to change track_ids.
// Names, ownership, artwork and visibility remain on the moderated gateway.
export const playlistDatabase = {
  auth:{me:()=>raw.auth.me()},
  entities:{Playlist:raw.entities.Playlist,Track:raw.entities.Track,Block:raw.entities.Block,PlaylistCollaboration:raw.entities.PlaylistCollaboration,PublicProfile:raw.entities.PublicProfile}
};
export const publicNoteDatabase = {
  auth: {me:()=>raw.auth.me()},
  entities: {PublicProfile:raw.entities.PublicProfile,Block:raw.entities.Block,Track:raw.entities.Track}
};
export const saveSyncedLyrics = input => saveTimedLyrics(raw, input, (action,args) => gateway("Lyrics",action,args));
export async function saveManualLyrics(client,id,patch){
  if(typeof id!=="string"||!id||Object.keys(patch||{}).length!==1||typeof patch.lyrics_text!=="string"||patch.lyrics_text.length>100000)throw Object.assign(new Error("Lyrics must be text under 100,000 characters."),{status:422});
  const user=await client.auth.me();
  if(!user?.id||user.is_blocked||user.disabled)throw Object.assign(new Error("Sign in with an active account before saving lyrics."),{status:403});
  const track=await client.entities.Track.get(id);
  if(!track?.id||user.role!=="admin"&&track.uploader_id!==user.id)throw Object.assign(new Error("Only the song owner or an administrator can edit lyrics."),{status:403});
  // Regular owners retain the existing server authorization and publication review.
  // The native Track API remains administrator-only; its schema is unchanged.
  if(user.role!=="admin")return gateway("Track","update",[id,{lyrics_text:patch.lyrics_text}]);
  if((await client.auth.me())?.id!==user.id)throw new Error("Your account changed. Reopen the song before saving.");
  let failure;
  try{await client.entities.Track.update(id,{lyrics_text:patch.lyrics_text});}catch(error){failure=error;}
  const current=await client.auth.me();
  if(current?.id!==user.id)throw new Error("Your account changed. Reopen the song to check the save.");
  const confirmed=await client.entities.Track.get(id);
  if(confirmed?.id!==id||confirmed.lyrics_text!==patch.lyrics_text)throw failure||new Error("Your lyrics were not confirmed. Your draft is still here.");
  if(typeof window!=="undefined")window.dispatchEvent(new Event("catalog:invalidate"));
  return confirmed;
}
export async function saveProfileLinks(client, uid, input) {
  const keys=["website","instagram","twitter","soundcloud"];
  const patch={};
  for(const [key,rawValue] of Object.entries(input||{})) {
    if(!keys.includes(key)||typeof rawValue!=="string")throw Error("Invalid profile link");
    let value=rawValue.trim();
    if(key==="instagram"||key==="twitter") {
      value=value.replace(/^@/,"");
      if(!/^[a-zA-Z0-9_.]{0,100}$/.test(value))throw Error("Enter a valid "+key+" username, without the full link.");
    } else if(value) {
      if(value.length>2048)throw Error("Profile link is too long.");
      const url=new URL(/^[a-z][a-z0-9+.-]*:/i.test(value)?value:"https://"+value);
      if(!["http:","https:"].includes(url.protocol)||url.username||url.password)throw Error("Use a valid http or https link.");
      value=url.href;
    }
    if(value.length>(key==="instagram"||key==="twitter"?100:2048))throw Error("Profile link is too long.");
    patch[key]=value;
  }
  if(!Object.keys(patch).length)throw Error("No profile links to save.");
  const owner=async()=>{
    const current=await client.auth.me();
    if(!uid||current?.id!==uid||current.disabled||current.is_blocked)throw Error("Your account changed or is unavailable. Reopen your profile before saving.");
    return current;
  };
  await owner();
  const rows=page=>{if(Array.isArray(page))return page;if(Array.isArray(page?.items))return page.items;throw Error("Could not confirm your public profile.");};
  const query={user_id:uid,visible:true};
  const row=rows(await client.entities.PublicProfile.filter(query,"-updated_date",1))[0];
  if(!row)throw Error("Your public profile could not be found. Please retry.");
  let failure;
  await owner();
  try{await client.auth.updateMe(patch);}catch(error){failure=error;}
  const confirmed=await owner();
  if(Object.entries(patch).some(([key,value])=>confirmed[key]!==value))throw failure||Error("Your profile links were not confirmed. Your draft is still here.");
  await owner();failure=null;
  try{await client.entities.PublicProfile.update(row.id,patch);}catch(error){failure=error;}
  await owner();
  const publicRow=rows(await client.entities.PublicProfile.filter(query,"-updated_date",1))[0];
  if(!publicRow||Object.entries(patch).some(([key,value])=>publicRow[key]!==value))throw failure||Error("Your public profile links were not confirmed. Please retry.");
  return confirmed;
}

export const base44 = new Proxy(raw,{get(target,name) {
  if(name==='entities') return entities;
  if(name==='auth') return {...target.auth,me:async()=>withPresetAvatar(await target.auth.me()),updateMe:async data=>{
    const galleryBanner=BANNER_PRESETS.find(item=>item.url===data?.banner_url);
    if(galleryBanner&&data.banner_use_default!==true){
      const {banner_url,banner_mobile_url,banner_video_url,banner_gif_url,banner_use_default,...remainder}=data;
      if(banner_video_url||(banner_gif_url&&banner_gif_url!==galleryBanner.gifUrl)||(banner_mobile_url&&banner_mobile_url!==galleryBanner.url))throw Error("Choose a gallery banner or uploaded media, not both.");
      if(Object.keys(remainder).length)await base44.auth.updateMe(remainder);
      return savePresetBanner(target,banner_url);
    }
    // Validated social identifiers/URLs do not need an AI/backend function.
    const linkKeys=["website","instagram","twitter","soundcloud"];
    const links=Object.fromEntries(Object.entries(data||{}).filter(([key])=>linkKeys.includes(key)));
    if(Object.keys(links).length){
      const current=await target.auth.me();
      if(!current?.id||current.disabled||current.is_blocked)throw new Error("Account unavailable");
      const remainder=Object.fromEntries(Object.entries(data).filter(([key])=>!linkKeys.includes(key)));
      // Text/media retain their existing authorization and moderation path.
      if(Object.keys(remainder).length)await base44.auth.updateMe(remainder);
      return saveProfileLinks(target,current.id,links);
    }
    if(Object.prototype.hasOwnProperty.call(data||{},"avatar_url")&&(data.avatar_url===""||AVATAR_PRESETS.some(item=>item.url===data.avatar_url))){
      const current=await target.auth.me();
      if(!current?.id||current.is_blocked||current.disabled)throw new Error('Account unavailable');
      const {avatar_url,avatar_video_url,avatar_gif_url,...profileChanges}=data;
      if(avatar_video_url || avatar_gif_url)throw new Error("Choose a gallery avatar or uploaded media, not both.");
      // Text still uses moderation; built-in artwork uses the confirmed native preset save.
      if(Object.keys(profileChanges).length)await base44.auth.updateMe(profileChanges);
      const owner=await target.auth.me();
      if(owner?.id!==current.id)throw new Error('Your account changed. Reopen your profile before saving.');
      return savePresetAvatar(target,avatar_url);
    }

    // Song associations use the signed-in account API; no new text or media is submitted.
    if(Object.keys(data||{}).length===1&&Object.hasOwn(data,"top_track_ids")){
      const ids=data.top_track_ids;
      if(!Array.isArray(ids)||ids.length>8||new Set(ids).size!==ids.length||ids.some(id=>typeof id!=="string"||!id||id.length>100))throw new Error("Choose up to eight different songs.");
      const current=await target.auth.me();
      if(!current?.id||current.disabled||current.is_blocked)throw new Error("Account unavailable");
      const old=new Set(current.top_track_ids||[]);
      for(const id of ids.filter(id=>!old.has(id))){
        const track=await entities.Track.get(id);
        if(!track?.id)throw new Error("This song is unavailable. Choose another song.");
      }
      const page=await target.entities.PublicProfile.filter({user_id:current.id,visible:true},"-updated_date",1);
      const row=(Array.isArray(page)?page:entityRows(page)||[])[0];
      if(!row)throw new Error("Your public profile could not be found. Please retry.");
      if((await target.auth.me())?.id!==current.id)throw new Error("Your account changed. Reopen your profile.");
      let failure;
      try{await target.auth.updateMe({top_track_ids:ids});}catch(error){failure=error;}
      const confirmed=await target.auth.me();
      if(confirmed?.id!==current.id||JSON.stringify(confirmed.top_track_ids)!==JSON.stringify(ids))throw failure||new Error("Your songs were not confirmed. Please retry.");
      failure=null;
      try{await target.entities.PublicProfile.update(row.id,{top_track_ids:ids});}catch(error){failure=error;}
      const result=await target.entities.PublicProfile.filter({user_id:current.id,visible:true},"-updated_date",1);
      if(JSON.stringify((Array.isArray(result)?result:entityRows(result)||[])[0]?.top_track_ids)!==JSON.stringify(ids))throw failure||new Error("Your public songs were not confirmed. Please retry.");
      return confirmed;
    }

    // Restoring existing default artwork does not upload or moderate new media.
    if(Object.keys(data||{}).length===1&&data.banner_use_default===true){
      const current=await target.auth.me();
      if(!current?.id||current.disabled||current.is_blocked)throw new Error('Account unavailable');
      const page=await target.entities.PublicProfile.filter({user_id:current.id,visible:true},'-updated_date',1);
      const row=(Array.isArray(page)?page:entityRows(page)||[])[0];
      if(!row)throw new Error('Your public profile could not be found. Please retry.');
      let failure;
      try{await target.auth.updateMe({banner_use_default:true});}catch(error){failure=error;}
      const confirmed=await target.auth.me();
      if(confirmed?.id!==current.id||confirmed.banner_use_default!==true)throw failure||new Error('Your default banner was not confirmed. Please retry.');
      if((await target.auth.me())?.id!==current.id)throw new Error('Your account changed. Reopen your profile.');
      try{await target.entities.PublicProfile.update(row.id,{banner_use_default:true});}catch(error){failure=error;}
      const check=await target.entities.PublicProfile.filter({user_id:current.id,visible:true},'-updated_date',1);
      if((Array.isArray(check)?check:entityRows(check)||[])[0]?.banner_use_default!==true)throw failure||new Error('Your public banner was not confirmed. Please retry.');
      return confirmed;
    }

    // Only these non-text own-account preferences use the SDK's own-account route.
    // All other profile fields keep the moderated security gateway.
    if(data.is_artist!==undefined||data.creator_role!==undefined)throw new Error('Creator access requires administrator approval');
    const preferenceKeys=['show_explicit','adult_confirmed'];
    const preferenceFields=Object.keys(data||{});
    if(preferenceFields.length&&preferenceFields.every(key=>preferenceKeys.includes(key))){
      if(preferenceFields.some(key=>typeof data[key]!=='boolean'))throw new Error('Invalid account preference');
      const current=await target.auth.me();
      if(!current?.id||current.is_blocked||current.disabled)throw new Error('Account unavailable');
      if(current.role==='admin'&&data.is_artist===true)throw new Error('Administrators cannot enable Artist Mode');
      if(data.show_explicit===true&&!(data.adult_confirmed===true||current.adult_confirmed===true))throw new Error('Confirm that you are 18 or older to show explicit content');
      // The SDK endpoint can update only the signed-in account. These boolean
      // preferences have their own field permissions; text moderation stays in the gateway.
      await target.auth.updateMe(data);
      const confirmed=await target.auth.me();
      if(confirmed?.id!==current.id||preferenceFields.some(key=>confirmed[key]!==data[key]))throw new Error('This setting was not confirmed. Please retry.');
      if(data.is_artist!==undefined){
        try{
          const page=await target.entities.PublicProfile.filter({user_id:current.id},'-updated_date',1);
          const row=(Array.isArray(page)?page:entityRows(page)||[])[0];
          if(row)await target.entities.PublicProfile.update(row.id,{is_artist:data.is_artist});
        }catch{}
      }
      return confirmed;
    }
    const colorKeys=['profile_background_mode','profile_background_colors','profile_background_motion','profile_background_speed','featured_track_id','onboarding_completed'];
    const keys=Object.keys(data||{});
    if(keys.length&&keys.every(key=>colorKeys.includes(key))){
      if(data.onboarding_completed!==undefined&&typeof data.onboarding_completed!=='boolean')throw new Error('Invalid onboarding preference');
      if(data.profile_background_mode!==undefined&&!['auto','custom','off'].includes(data.profile_background_mode))throw new Error('Invalid background mode');
      if(data.profile_background_motion!==undefined&&!['flow','still'].includes(data.profile_background_motion))throw new Error('Invalid background motion');
      if(data.profile_background_speed!==undefined&&(typeof data.profile_background_speed!=='number'||!Number.isFinite(data.profile_background_speed)||data.profile_background_speed<.35||data.profile_background_speed>1.6))throw new Error('Invalid background speed');
      const colors=data.profile_background_colors;
      if(colors!==undefined&&(!Array.isArray(colors)||colors.length>3||colors.some(c=>typeof c!=='string'||!/^#[0-9a-f]{6}$/i.test(c))))throw new Error('Invalid profile colors');
      if(data.featured_track_id!==undefined){
        const id=data.featured_track_id;
        if(typeof id!=='string'||id.length>100||(id&&!/^[a-zA-Z0-9_-]+$/.test(id)))throw new Error('Invalid profile song');
        if(id){const page=await target.entities.Track.filter({id},'-created_date',1);const rows=Array.isArray(page)?page:entityRows(page)||[];if(!rows.length)throw new Error('Song unavailable');}
      }
      const saved=await target.auth.updateMe(data);
      const publicAppearance=Object.fromEntries(['featured_track_id','profile_background_mode','profile_background_colors','profile_background_motion','profile_background_speed'].filter(key=>data[key]!==undefined).map(key=>[key,data[key]]));
      try{
        if(!Object.keys(publicAppearance).length)return saved;
        const uid=saved?.id || (await target.auth.me()).id;
        const page=await target.entities.PublicProfile.filter({user_id:uid},'-updated_date',1);
        const row=(Array.isArray(page)?page:entityRows(page)||[])[0];
        if(row)await target.entities.PublicProfile.update(row.id,publicAppearance);
      }catch{}
      return saved;
    }
    const user=await target.auth.me();
    return gateway('User','update',[user.id,data]);
  }};
  return target[name];
}});


// Native admin operations remain protected by entity and field permissions.
export const adminDatabase={auth:{me:()=>raw.auth.me()},entities:raw.entities};
