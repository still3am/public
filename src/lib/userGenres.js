import {base44} from "@/api/base44Client";
import {GENRES} from "@/lib/audio-utils";

let cache=null,owner=null,generation=0;
const rows=page=>{if(Array.isArray(page))return page;if(Array.isArray(page?.items))return page.items;throw Error("Music preferences could not load. Please retry.");};
export async function getUserGenres(userId){
 const uid=userId||(await base44.auth.me().catch(error=>{if((error?.status??error?.response?.status)===401)return null;throw error;}))?.id;
 if(!uid)return [];
 if(cache&&owner===uid)return cache;
 const request=generation;
 {
  const records=rows(await base44.entities.UserGenre.filter({user_id:uid},"-created_date",1));
  const genres=Array.isArray(records[0]?.genres)?records[0].genres:[];
  if(request!==generation)throw Error("Account changed. Please retry.");
  owner=uid;cache=genres;return genres;
 }
}
export function clearUserGenresCache(){generation++;cache=null;owner=null;}
window.addEventListener("account:cleared",clearUserGenresCache);
export async function saveUserGenres(genres,userId){
 if(!userId)throw Error("Sign in to save preferences");
 const request=generation;
 const clean=[...new Set(genres.filter(genre=>GENRES.includes(genre)))];
 const existing=rows(await base44.entities.UserGenre.filter({user_id:userId},"-created_date",1))[0];
 if(request!==generation)throw Error("Account changed. Please retry.");
 if(existing)await base44.entities.UserGenre.update(existing.id,{genres:clean});
 else await base44.entities.UserGenre.create({user_id:userId,genres:clean});
 if(request!==generation)throw Error("Account changed. Please retry.");
 owner=userId;cache=clean;
}
export async function hasUserGenres(){return (await getUserGenres()).length>0;}
