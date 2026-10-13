import { base44 } from "@/api/base44Client";

// Surfaces like the follower list and the notifications feed need details for
// many users at once. Firing one request per id burst the API and tripped the
// platform rate limit, so ids are resolved in a single batched request, cached
// for the session, and identical batches share one in-flight request.
const cache=new Map(),expires=new Map(),inflight=new Map();
let generation=0;
const invalidate=()=>{generation++;cache.clear();expires.clear();inflight.clear();};
for(const event of ['catalog:invalidate','account:cleared','profiles:changed'])window.addEventListener(event,invalidate);
const TTL=120000;
const CHUNK = 100;

function fetchChunk(ids) {
  const key = ids.join(",");
  if (inflight.has(key)) return inflight.get(key);
  let req;
  req = (async()=>{
    try{
      const res=await base44.functions.invoke("usersByIds",{ids});
      if(!Array.isArray(res?.data?.users)||(!res.data.users.length&&ids.length))throw Error("Profile response could not resolve these accounts");
      return res.data.users;
    }catch(primary){
      const res=await base44.functions.invoke("securityGateway",{entity:"User",action:"lookupPublic",args:[ids]});
      if(!Array.isArray(res?.data?.result))throw primary;
      return res.data.result;
    }
  })().finally(()=>{if(inflight.get(key)===req)inflight.delete(key);});
  inflight.set(key, req);
  return req;
}

/**
 * Resolve user details for a list of ids, preserving input order.
 * Unknown/blocked users are simply omitted.
 */
export async function getUsersByIds(ids = []) {
  const unique = [...new Set((ids || []).filter(Boolean))];
  const started=generation;
  const missing = unique.filter((id) => !cache.has(id)||(expires.get(id)||0)<=Date.now());
  for (let i = 0; i < missing.length; i += CHUNK) {
    const chunk=missing.slice(i,i+CHUNK);
    const users = await fetchChunk(chunk);
    if(started!==generation)throw Error("Profile lookup changed while loading");
    chunk.forEach(id=>{cache.delete(id);expires.delete(id);});
    users.forEach((u) => {
      if (u?.id){cache.set(u.id,u);expires.set(u.id,Date.now()+TTL);}
    });
  }
  return unique.map((id) => cache.get(id)).filter(Boolean);
}

export function getCachedUser(id) {
  return (expires.get(id)||0)>Date.now()?cache.get(id)||null:null;
}
