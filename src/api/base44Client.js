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
    if(["get","list","filter"].includes(method))return async(...args)=>{const readArgs=args.map(arg=>arg&&typeof arg==="object"&&!Array.isArray(arg)&&Array.isArray(arg.fields)&&arg.fields.includes("avatar_url")?{...arg,fields:[...new Set([...arg.fields,"avatar_preset"])]}:arg);const page=await h[method](...readArgs);return Array.isArray(page)?page.map(withPresetAvatar):Array.isArray(page?.items)?{...page,items:page.items.map(withPresetAvatar)}:withPresetAvatar(page);};
    return h[method];
   }}));
   return handlers.get(name);
  }
  if(!guarded.has(name))return target[name];
  if(!handlers.has(name)) handlers.set(name,new Proxy(target[name],{get(h,method) {
    if(typeof method!=="string")return Reflect.get(h,method);
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
  entities:{Playlist:raw.entities.Playlist,Track:raw.entities.Track,Block:raw.entities.Block}
};
export const publicNoteDatabase = {
  auth: {me:()=>raw.auth.me()},
  entities: {PublicProfile:raw.entities.PublicProfile,Block:raw.entities.Block,Track:raw.entities.Track}
};
export const base44 = new Proxy(raw,{get(target,name) {
  if(name==='entities') return entities;
  if(name==='auth') return {...target.auth,me:async()=>withPresetAvatar(await target.auth.me()),updateMe:async data=>{
    if(Object.prototype.hasOwnProperty.call(data||{},"avatar_url")&&(data.avatar_url===""||AVATAR_PRESETS.some(item=>item.url===data.avatar_url))){
      const current=await target.auth.me();
      if(!current?.id||current.is_blocked||current.disabled)throw new Error('Account unavailable');
      const {avatar_url,...profileChanges}=data;
      // Text still uses moderation; built-in artwork uses the confirmed native preset save.
      if(Object.keys(profileChanges).length)await base44.auth.updateMe(profileChanges);
      const owner=await target.auth.me();
      if(owner?.id!==current.id)throw new Error('Your account changed. Reopen your profile before saving.');
      return savePresetAvatar(target,avatar_url);
    }

    // Only these non-text own-account preferences use the SDK's own-account route.
    // All other profile fields keep the moderated security gateway.
    const preferenceKeys=['is_artist','show_explicit','adult_confirmed'];
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
          const row=(Array.isArray(page)?page:page?.items||[])[0];
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
        if(id){const page=await target.entities.Track.filter({id},'-created_date',1);const rows=Array.isArray(page)?page:page?.items||[];if(!rows.length)throw new Error('Song unavailable');}
      }
      const saved=await target.auth.updateMe(data);
      const publicAppearance=Object.fromEntries(['featured_track_id','profile_background_mode','profile_background_colors','profile_background_motion','profile_background_speed'].filter(key=>data[key]!==undefined).map(key=>[key,data[key]]));
      try{
        if(!Object.keys(publicAppearance).length)return saved;
        const uid=saved?.id || (await target.auth.me()).id;
        const page=await target.entities.PublicProfile.filter({user_id:uid},'-updated_date',1);
        const row=(Array.isArray(page)?page:page?.items||[])[0];
        if(row)await target.entities.PublicProfile.update(row.id,publicAppearance);
      }catch{}
      return saved;
    }
    const user=await target.auth.me();
    return gateway('User','update',[user.id,data]);
  }};
  return target[name];
}});
