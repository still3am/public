import { base44 } from "@/api/base44Client";
import { readAllPages } from "@/lib/readPages";

// The public catalog is read by several discovery screens (Home, Search, Public
// Records, Recently Added, Top Charts). Reading it on each visit is the app's
// heaviest source of entity read traffic, so these helpers read it once — in
// full, following the server's cursor so the list is never cut off at one page —
// and share the result for a short window, collapsing simultaneous calls into a
// single request.
const resets=[];
let catalogGeneration=0;
const resetCaches=()=>{catalogGeneration++;resets.forEach(reset=>reset());};
window.addEventListener("catalog:invalidate",resetCaches);
window.addEventListener("account:cleared",resetCaches);
const TTL = 2 * 60 * 1000;
const RETRY_AFTER_ERROR = 30 * 1000;

function makeCache(fetcher, ttl = TTL) {
  let hasValue=false,value=null,expiresAt=0,inflight=null,version=0;
  resets.push(()=>{version++;hasValue=false;value=null;expiresAt=0;inflight=null;});
  const read=async(fresh=false)=>{
    if(fresh)expiresAt=0;
    if(hasValue&&Date.now()<expiresAt)return value;
    if(inflight)return inflight;
    const requestVersion=version;
    let request;
    request=fetcher().then(next=>{
      // A read started before a preference/account change cannot repopulate
      // the cache with the previous account's catalogue visibility.
      if(requestVersion!==version)return read();
      value=next;hasValue=true;expiresAt=Date.now()+ttl;return next;
    }).catch(()=>{
      if(requestVersion!==version)return read();
      expiresAt=Date.now()+RETRY_AFTER_ERROR;
      if(hasValue)return value;
      throw new Error("The music catalog is unavailable. Please check your connection.");
    }).finally(()=>{if(inflight===request)inflight=null;});
    inflight=request;return request;
  };
  return read;
}

// Share partial catalog pages with lightweight pickers while the full read continues.
let publishedSnapshot=[],completePublished=[];
const publishedListeners=new Set();
export const peekPublishedTracks=()=>publishedSnapshot;
export const subscribePublishedTracks=listener=>{publishedListeners.add(listener);return()=>publishedListeners.delete(listener);};
const publishSnapshot=rows=>{publishedSnapshot=rows;publishedListeners.forEach(listener=>{try{listener(rows);}catch{}});};
window.addEventListener("catalog:invalidate",()=>{completePublished=[];publishSnapshot([]);});
window.addEventListener("account:cleared",()=>{completePublished=[];publishSnapshot([]);});
export const getPublishedTracks=makeCache(async()=>{
 const partial=[],startedGeneration=catalogGeneration;
 try{
 const all=await readAllPages(opts=>base44.entities.Track.filter({is_published:true},{sort:"-created_date",...opts}).then(page=>{
  partial.push(...(Array.isArray(page)?page:page?.items||[]));
  if(startedGeneration===catalogGeneration)publishSnapshot([...new Map(partial.map(t=>[t.id,t])).values()]);
  return page;
 }));
 if(startedGeneration===catalogGeneration){completePublished=all;publishSnapshot(all);}return all;
 }catch(error){if(startedGeneration===catalogGeneration)publishSnapshot(completePublished);throw error;}
});

// Most played first — the same complete catalogue, ranked.
export const getTopTracks = async (fresh=false) =>
  [...await getPublishedTracks(fresh)].sort((a,b)=>(b.play_count||0)-(a.play_count||0));


export const getArtists = makeCache(() =>
  readAllPages((opts) =>
    base44.entities.Artist.filter({}, { sort: "-updated_date", ...opts })
  )
);

// The catalog size is counted server-side (and shared app-wide for an hour), but
// still reuse the answer here for a while so navigating back and forth is free.
export const getCatalogCount = makeCache(async () => {
  const res = await base44.functions.invoke("trackCount", {});
  const published = res?.data?.published;
  return typeof published === "number" ? published : null;
}, 15 * 60 * 1000);