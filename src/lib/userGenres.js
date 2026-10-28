import {withReadTimeout} from "@/lib/readTimeout";
import {base44} from "@/api/base44Client";
import {GENRES} from "@/lib/audio-utils";
let cache=null,owner=null,generation=0,revision=0;
const rows=page=>{if(Array.isArray(page))return page;if(Array.isArray(page?.items))return page.items;throw Error("Music preferences could not load. Please retry.");};
const normalized=record=>({genres:[...new Set((Array.isArray(record?.genres)?record.genres:[]).filter(g=>GENRES.includes(g)))],favorite_track_ids:[...new Set((Array.isArray(record?.favorite_track_ids)?record.favorite_track_ids:[]).filter(id=>typeof id==="string"))].slice(0,8),favorite_artists:[...new Set((Array.isArray(record?.favorite_artists)?record.favorite_artists:[]).filter(name=>typeof name==="string"&&name.trim()).map(name=>name.trim()))].slice(0,5)});
export async function getUserMusicPreferences(userId){
 const uid=userId||(await base44.auth.me().catch(error=>{if((error?.status??error?.response?.status)===401)return null;throw error;}))?.id;
 if(!uid)return normalized(null);
 if(cache&&owner===uid)return cache;
 const request=generation,startedRevision=revision;
 const records=rows(await withReadTimeout(base44.entities.UserGenre.filter({user_id:uid},"-created_date",1)));
 if(request!==generation)throw Error("Account changed. Please retry.");
 if(startedRevision!==revision&&owner===uid&&cache)return cache;
 owner=uid;cache=normalized(records[0]);return cache;
}
export async function getUserGenres(userId){return (await getUserMusicPreferences(userId)).genres;}
export function clearUserGenresCache(){generation++;cache=null;owner=null;}
window.addEventListener("account:cleared",clearUserGenresCache);
export async function saveUserMusicPreferences(patch,userId){
 if(!userId)throw Error("Sign in to save preferences");
 const request=generation,current=await base44.auth.me();
 if(current?.id!==userId)throw Error("Account changed. Please retry.");
 const existing=rows(await base44.entities.UserGenre.filter({user_id:userId},"-created_date",1))[0];
 if(request!==generation||(await base44.auth.me())?.id!==userId)throw Error("Account changed. Please retry.");
 const clean=normalized({...existing,...patch});
 const saved=existing?await base44.entities.UserGenre.update(existing.id,clean):await base44.entities.UserGenre.create({user_id:userId,...clean});
 if(request!==generation||!saved?.id||(await base44.auth.me())?.id!==userId||JSON.stringify(normalized(saved))!==JSON.stringify(clean))throw Error("Preferences were not confirmed. Please retry.");
 revision++;owner=userId;cache=clean;
 window.dispatchEvent(new CustomEvent("preferences:changed",{detail:{uid:userId}}));
 return clean;
}
export async function saveUserGenres(genres,userId){return saveUserMusicPreferences({genres},userId);}
export async function hasUserGenres(){return (await getUserGenres()).length>0;}
