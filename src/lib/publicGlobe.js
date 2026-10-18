import {COUNTRIES} from "./globeWorld.js";
const rows=value=>Array.isArray(value)?value:value?.items||[];
export function activeGlobeShare(profile,now=Date.now()){
 const share=profile?.public_globe;
 return !!(profile?.visible&&share?.track_id&&COUNTRIES.some(c=>c.code===share.country)&&Math.min(Date.parse(share.expires_at),Date.parse(profile.updated_date||profile.created_date)+86400000)>now);
}
export async function loadGlobe(db){
 const user=await db.auth.me();if(!user?.id)throw Error("Sign in to explore PUBLIC Globe.");
 const blocks=rows(await db.entities.Block.filter({$or:[{user_id:user.id},{blocked_user_id:user.id}]},"-created_date",1000));
 const hidden=new Set(blocks.map(row=>row.user_id===user.id?row.blocked_user_id:row.user_id));
 const profiles=rows(await db.entities.PublicProfile.filter({visible:true,"public_globe.expires_at":{$gt:new Date().toISOString()}},"-updated_date",100));
 const visible=profiles.filter(row=>!hidden.has(row.user_id)&&activeGlobeShare(row));
 const ids=[...new Set(visible.map(row=>row.public_globe.track_id))];
 const tracks=ids.length?rows(await db.entities.Track.filter({id:{$in:ids},is_published:true,approval_status:"approved"},"-created_date",100)):[];
 return visible.flatMap(profile=>{
  const track=tracks.find(row=>row.id===profile.public_globe.track_id);
  if(!track||hidden.has(track.uploader_id)||(track.explicit&&!(user.show_explicit&&user.adult_confirmed)))return [];
  const safe={...track};delete safe.audio_file_uri;delete safe.music_video_file_uri;delete safe.audio_sha256;
  if(!safe.audio_url)safe._private_audio=true;
  return [{id:profile.id,user_id:profile.user_id,name:profile.display_name||profile.full_name||"PUBLIC listener",country:profile.public_globe.country,track:safe,expires_at:profile.public_globe.expires_at}];
 });
}
export async function saveGlobeShare(db,country,trackId,remove=false){
 const user=await db.auth.me();if(!user?.id||user.disabled||user.is_blocked)throw Error("Sign in to share on PUBLIC Globe.");
 if(!remove){
  if(!COUNTRIES.some(c=>c.code===country))throw Error("Choose a country.");
  const track=rows(await db.entities.Track.filter({id:trackId,is_published:true,approval_status:"approved"},"-created_date",1))[0];
  if(!track)throw Error("Choose an available published song.");
  if(track.explicit&&!(user.show_explicit&&user.adult_confirmed))throw Error("This song is unavailable with your current listening settings.");
  if(track.uploader_id&&track.uploader_id!==user.id){
   const blocked=rows(await db.entities.Block.filter({$or:[{user_id:user.id,blocked_user_id:track.uploader_id},{user_id:track.uploader_id,blocked_user_id:user.id}]},"-created_date",1));
   if(blocked.length)throw Error("This song is unavailable.");
  }
 }
 const profile=rows(await db.entities.PublicProfile.filter({user_id:user.id,visible:true},"-updated_date",1))[0];
 if(!profile)throw Error("Finish setting up your public profile first.");
 const state={country:remove?"":country,track_id:remove?"":trackId,expires_at:new Date(Date.now()+(remove?0:86400000)).toISOString()};
 let failure;try{await db.entities.PublicProfile.update(profile.id,{public_globe:state});}catch(error){failure=error;}
 const saved=rows(await db.entities.PublicProfile.filter({user_id:user.id,visible:true},"-updated_date",1))[0];
 if(!saved||Object.keys(state).some(key=>saved.public_globe?.[key]!==state[key])){
  if(failure)throw failure;throw Error("Your share wasn’t confirmed. Please retry.");
 }
 if(!remove&&!activeGlobeShare(saved))throw Error("The share time wasn’t confirmed. Please retry.");
 return saved;
}
