// Account-scoped like state. Native Like RLS permits only the signed-in owner.
const jobs = new Map();
const key = uid => "public:offline:likes:" + encodeURIComponent(uid);
const offline = () => typeof navigator !== "undefined" && navigator.onLine === false;
const rows = page => {if(Array.isArray(page))return page;if(Array.isArray(page?.items))return page.items;throw Error("Could not read likes.");};
function cache(uid) {try {return JSON.parse(localStorage.getItem(key(uid)) || "{}");} catch {return {};}}
function remember(uid,id,value,required=false) {
 try {const saved=cache(uid);saved[id]=value;localStorage.setItem(key(uid),JSON.stringify(saved));}
 catch(error) {if(required)throw Error("Could not save this like on your device.");}
}
function changed(uid,id,liked) {
 if(typeof window!=="undefined")window.dispatchEvent(new CustomEvent("likes:changed",{detail:{uid,trackId:id,liked}}));
}
export async function readLikeState(client,uid,id) {
 const saved=cache(uid)[id];
 if(saved?.pending || offline())return !!saved?.liked;
 const liked=rows(await client.entities.Like.filter({user_id:uid,track_id:id},"-created_date",1)).length>0;
 remember(uid,id,{liked});return liked;
}
async function owner(client,uid) {
 const user=await client.auth.me();
 if(user?.id!==uid||user.is_blocked||user.disabled)throw Object.assign(Error("Sign in again to like this song."),{status:401});
}
export function setLikeState(client,uid,id,liked) {
 if(!uid||!id||typeof liked!=="boolean")return Promise.reject(Error("Invalid like."));
 const jobKey=uid+":"+id,existing=jobs.get(jobKey);
 if(existing)return existing.liked===liked?existing.promise:Promise.reject(Error("Like change in progress."));
 const promise=(async()=>{
  if(offline()){
   remember(uid,id,{liked,pending:true,token:Date.now()+":"+Math.random()},true);
   changed(uid,id,liked);return {liked,pending:true};
  }
  const initial=cache(uid)[id];
  await owner(client,uid);
  const query={user_id:uid,track_id:id};
  const read=async()=>rows(await client.entities.Like.filter(query,"-created_date",100));
  const before=await read();
  try {
   if(liked&&!before.length){const saved=await client.entities.Like.create(query);if(!saved?.id)throw Error("Like was not confirmed.");}
   if(!liked&&before.length)await client.entities.Like.deleteMany(query);
  } catch(error) {if((await read().catch(()=>null))?.length>0!==liked)throw error;}
  const actual=(await read()).length>0;
  if(actual!==liked)throw Error("Like was not confirmed.");
  // Preserve a newer queued choice if another tab changed it during this save.
  const queued=cache(uid)[id];
  if(!queued?.pending || queued.token===initial?.token)remember(uid,id,{liked});
  changed(uid,id,liked);
  // Counter maintenance is optional; a backend outage cannot undo a saved like.
  client.functions?.invoke("toggleLike",{track_id:id,recount_only:true}).catch(()=>{});
  return {liked,pending:false};
 })();
 jobs.set(jobKey,{liked,promise});
 const done=()=>{if(jobs.get(jobKey)?.promise===promise)jobs.delete(jobKey);};
 promise.then(done,done);return promise;
}
export async function syncPendingLikes(client,uid) {
 if(!uid||offline())return;
 for(const [id,entry] of Object.entries(cache(uid))) {
  if(!entry?.pending)continue;
  await owner(client,uid);
  await setLikeState(client,uid,id,!!entry.liked);
  const latest=cache(uid)[id];
  if(latest?.token===entry.token)remember(uid,id,{liked:!!entry.liked});
 }
}
