const DAY=86400000;
const rows=page=>Array.isArray(page)?page:page?.items||[];
const fail=(message,status=403)=>{throw Object.assign(Error(message),{status});};
export const hasNativeNotes=db=>!!(db?.entities?.PublicProfile&&db?.auth?.me);
async function currentUser(db) {
 const user=await db.auth.me();
 if(!user?.id)fail("Sign in to save a note",401);
 if(user.disabled||user.is_blocked)fail("Account unavailable");
 return user;
}
async function profileRow(db,id) {
 return rows(await db.entities.PublicProfile.filter({user_id:id,visible:true},"-updated_date",1))[0]||null;
}
async function checkBlock(db,user,other) {
 if(user.id===other)return;
 const page=await db.entities.Block.filter({$or:[{user_id:user.id,blocked_user_id:other},{user_id:other,blocked_user_id:user.id}]},"-created_date",1);
 if(rows(page).length)fail("This profile or song is unavailable");
}
async function publicTrack(db,user,id) {
 const track=rows(await db.entities.Track.filter({id,is_published:true,approval_status:"approved"},"-created_date",1))[0];
 if(!track)fail("Choose an available published song",422);
 if(track.uploader_id)await checkBlock(db,user,track.uploader_id);
 const safe={...track};
 delete safe.audio_file_uri;delete safe.music_video_file_uri;delete safe.audio_sha256;
 if(!safe.audio_url)safe._private_audio=true;
 return safe;
}
async function writeState(db,owner,state) {
 const user=await currentUser(db);
 if(user.id!==owner)fail("Your account changed. Reopen your profile.",409);
 const row=await profileRow(db,owner);
 if(!row)fail("Finish setting up your public profile before adding a song note.",409);
 let original;
 try{await db.entities.PublicProfile.update(row.id,{public_song_note:state});}catch(error){original=error;}
 // Read after write also recovers a response lost after the database committed.
 const confirmed=await profileRow(db,owner);
 if(!confirmed||JSON.stringify(confirmed.public_song_note)!==JSON.stringify(state)){
  if(original)throw original;fail("Song note was not confirmed. Please retry.",503);
 }
 if(state.mode==="song" && (!Number.isFinite(Date.parse(confirmed.updated_date)) && !Number.isFinite(Date.parse(confirmed.created_date))))fail("Song note time was not confirmed. Please retry.",503);
 if(typeof window!=="undefined")window.dispatchEvent(new Event("profiles:changed"));
 return confirmed;
}
export async function saveNativeSongNote(db,owner,trackId) {
 if(typeof trackId!=="string"||!trackId||trackId.length>100||!/^[a-zA-Z0-9_-]+$/.test(trackId))fail("Choose a song",422);
 const user=await currentUser(db);
 if(user.id!==owner)fail("Your account changed. Reopen your profile.",409);
 const track=await publicTrack(db,user,trackId);
 const row=await writeState(db,owner,{mode:"song",track_id:trackId,expires_at:new Date(Date.now()+DAY).toISOString()});
 return songFromRow(row,track);
}
function songFromRow(row,track) {
 const state=row.public_song_note;
 const serverTime=Date.parse(row.updated_date||row.created_date);
 const until=Math.min(Date.parse(state.expires_at),serverTime+DAY);
 if(!Number.isFinite(until)||until<=Date.now())return null;
 return {id:"native:"+row.id,user_id:row.user_id,track_id:track.id,track,caption:"",expires_at:new Date(until).toISOString(),_native:true};
}
export async function readNativeSongNote(db,owner) {
 const user=await currentUser(db);
 await checkBlock(db,user,owner);
 const row=await profileRow(db,owner),state=row?.public_song_note;
 if(!state||state.mode==="server")return {handled:false};
 if(state.mode==="none")return {handled:true,note:null};
 if(state.mode!=="song"||!state.track_id)return {handled:true,note:null};
 if(Date.parse(state.expires_at)<=Date.now())return {handled:true,note:null};
 try{return {handled:true,note:songFromRow(row,await publicTrack(db,user,state.track_id))};}
 catch(error){if([403,404,422].includes(error.status??error.response?.status))return {handled:true,note:null};throw error;}
}
export async function setNativeNoteMode(db,owner,mode) {
 return writeState(db,owner,{mode,track_id:"",expires_at:new Date().toISOString()});
}
