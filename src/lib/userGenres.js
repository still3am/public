import {base44} from "@/api/base44Client";
import {GENRES} from "@/lib/audio-utils";

let cache=null,owner=null;
const rows=page=>Array.isArray(page)?page:page?.items||[];
export async function getUserGenres(userId){
 const uid=userId||(await base44.auth.me().catch(()=>null))?.id;
 if(!uid)return [];
 if(cache&&owner===uid)return cache;
 try{
  const records=rows(await base44.entities.UserGenre.filter({user_id:uid},"-created_date",1));
  const genres=Array.isArray(records[0]?.genres)?records[0].genres:[];
  owner=uid;cache=genres;return genres;
 }catch{return [];}
}
export function clearUserGenresCache(){cache=null;owner=null;}
window.addEventListener("account:cleared",clearUserGenresCache);
export async function saveUserGenres(genres,userId){
 if(!userId)throw Error("Sign in to save preferences");
 const clean=[...new Set(genres.filter(genre=>GENRES.includes(genre)))];
 const existing=rows(await base44.entities.UserGenre.filter({user_id:userId},"-created_date",1))[0];
 if(existing)await base44.entities.UserGenre.update(existing.id,{genres:clean});
 else await base44.entities.UserGenre.create({user_id:userId,genres:clean});
 owner=userId;cache=clean;
}
export async function hasUserGenres(){return (await getUserGenres()).length>0;}
