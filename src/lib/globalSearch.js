import {readAllPages} from "@/lib/readPages";
import {scoreTrack,searchScore} from "@/lib/searchMatching";
import { base44 } from "@/api/base44Client";
import { getPublishedTracks,getArtists,peekPublishedTracks } from "@/lib/catalogCache";
import { splitArtistNames } from "@/lib/artistTracks";

// Global search runs on the server so the whole catalogue is searchable without
// downloading it: tracks, artists and people are queried in parallel, each
// narrowed by the term the user has typed so far.

const rows = value => Array.isArray(value) ? value : Array.isArray(value?.items) ? value.items : [];
const TRACK_LIMIT = 40;
const PLAYLIST_LIMIT = 20; // public playlists the server returns per search
const ARTIST_SCAN = 50; // artist records the server may return per search
const ARTIST_SHOWN = 20; // ranked, de-duplicated artist rows actually surfaced
const COVER_SCAN = 200; // artwork page size; continue until each artist has a match

function escapeRegex(input) {
  return input.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function contains(field, pattern) {
  return { [field]: { $regex: pattern, $options: "i" } };
}

// Same normalization the Public Record page uses, so a row and the page it
// opens always agree on what counts as the same artist.
function normalizeName(name) {
  return (name || "").trim().replace(/\s+/g, " ").toLowerCase();
}

// Each source is read independently: one failing (rate limit, offline) must not
// blank the others, but the caller still learns whether the main list failed so
// an unreachable search is never reported as "no results".
const read = (promise) =>
  promise
    .then((value) => ({ ok: true, value }))
    .catch(() => ({ ok: false, value: null }));

// The server narrows the results; inside that page we rank the closest matches
// first so suggestions feel right while the user is still typing.
function rank(track, lower) {
  const title = (track.title || "").toLowerCase();
  const artist = (track.artist || track.uploader_name || "").toLowerCase();
  if (title.startsWith(lower)) return 4;
  if (title.includes(lower)) return 3;
  if (artist.startsWith(lower)) return 2;
  if (artist.includes(lower)) return 1;
  return 0;
}

// Name matches outrank bio / location matches, so the artist the user is
// actually typing sits first instead of wherever the record was last touched.
function rankArtist(artist, lower) {
  const name = normalizeName(artist.name);
  if (!name) return 0;
  if (name === lower) return 4;
  if (name.startsWith(lower)) return 3;
  if (name.includes(lower)) return 2;
  return 1; // matched on bio or location only
}

// Playlists rank on their own name: one that starts with the term sits above one
// that only mentions it further along.
function rankPlaylist(playlist, lower) {
  const name = (playlist.name || "").toLowerCase();
  return name.startsWith(lower) ? 2 : 1;
}

// The catalogue holds several records per artist name (one per upload), so the
// list must collapse to a single row per artist — the most recently updated
// record wins, which is also the one the Public Record page resolves.
function pruneArtists(artists, lower) {
  const byName = new Map();
  for (const artist of artists) {
    const key = normalizeName(artist.name);
    if (key && !byName.has(key)) byName.set(key, {...artist});
    else if(key){
      const newest=byName.get(key);
      if(!newest.cover_art_url&&artist.cover_art_url)newest.cover_art_url=artist.cover_art_url;
      if(!newest.avatar_url&&artist.avatar_url)newest.avatar_url=artist.avatar_url;
    }
  }
  return [...byName.values()]
    .sort((a, b) => rankArtist(b, lower) - rankArtist(a, lower))
    .slice(0, ARTIST_SHOWN);
}

function creditPattern(name) {
  // Bounded by anything that is not a letter or digit, so "Yeat" matches the
  // credit inside "Yeat, Drake" but never the "yeat" inside "Yeats".
  return `(^|[^a-z0-9])${escapeRegex(name)}([^a-z0-9]|$)`;
}

// Missing artist artwork is filled from the artist's newest accessible track.
// Track permissions still control which covers this listener can retrieve. Two things have to hold for that to
// work: a track's artist tag often lists several credits at once ("Yeat, Drake"),
// so the match is made against each credited name, and the query is narrowed on
// the server to the artists actually on screen instead of scanning whichever
// covers happen to be newest — which left every older artist without an image.
function artworkName(value) {
  return String(value||"").normalize("NFKD").replace(/[\u0300-\u036f]/g,"").replace(/[’‘]/g,"'").trim().replace(/\s+/g," ").toLowerCase();
}
function artworkCredits(track) {
  const raw=String(track.artist||"");
  const standard=raw.replace(/\s+[\[(]?(?:feat(?:uring)?\.?|ft\.?)\s+/gi,", ");
  const feature=String(track.title||"").match(/\b(?:feat(?:uring)?\.?|ft\.?)\s+([^)\]}]+)/i);
  return [...new Set([raw,...splitArtistNames(standard,false),...(feature?splitArtistNames(feature[1],false):[])].map(value=>artworkName(value.replace(/[)\]]\s*$/,""))).filter(Boolean))];
}
async function artistCovers(names) {
  const wanted=new Set(names.flatMap(name=>[name,...splitArtistNames(name,false)]).map(artworkName).filter(Boolean));
  const map=new Map();
  const add=track=>{
    const cover=String(track.cover_art_url||"").trim();
    if(!cover)return;
    for(const credit of artworkCredits(track)){
      if(!wanted.has(credit))continue;
      const list=map.get(credit)||[];
      if(list.length<4&&!list.includes(cover))map.set(credit,[...list,cover]);
    }
  };
  // Reuse the accessible catalog already read by Home/Search before requesting artwork.
  peekPublishedTracks().forEach(add);
  if(!wanted.size||[...wanted].every(name=>(map.get(name)?.length||0)>=3))return map;
  let cursor;
  for(let page=0;page<40;page++){
    const res=await read(base44.entities.Track.filter({
      cover_art_url:{$exists:true,$ne:""},
      $or:[...new Set(names.flatMap(name=>[name,...splitArtistNames(name,false)]))].flatMap(name=>{
        const pattern=creditPattern(name.trim()).replace(/\s+/g,"\\s+").replace(/[’‘]/g,"['’‘]");
        return [{artist:{$regex:pattern,$options:"i"}},{title:{$regex:pattern,$options:"i"}}];
      })
    },{sort:"-created_date",limit:COVER_SCAN,fields:["artist","title","cover_art_url"],...(cursor?{cursor}:{})}));
    if(!res.ok)break;
    rows(res.value).forEach(add);
    if([...wanted].every(name=>(map.get(name)?.length||0)>=3)||Array.isArray(res.value)||!res.value?.has_more||!res.value?.next_cursor)break;
    cursor=res.value.next_cursor;
  }
  return map;
}
function coversFor(artist,covers) {
  const keys=[artist.name,...splitArtistNames(artist.name,false)].map(artworkName);
  return [...new Set(keys.flatMap(key=>covers.get(key)||[]))];
}

export async function searchPeople(q) {
  const term=String(q||"").trim().replace(/^@/,"").slice(0,100);
  if(term.length<2)return {data:{results:[]}};
  try{
    const pattern=escapeRegex(term);
    const page=await base44.entities.PublicProfile.filter({visible:true,$or:[contains("display_name",pattern),contains("full_name",pattern),contains("username",pattern)]},{sort:"-updated_date",limit:50,fields:["user_id","display_name","full_name","username","avatar_url"]});
    let candidates=rows(page);
    if(candidates.length<5&&term.length>=3){
      const broader=await readAllPages(opts=>base44.entities.PublicProfile.filter({visible:true},{...opts,fields:["user_id","display_name","full_name","username","avatar_url"]}));
      candidates=[...new Map([...candidates,...broader.filter(row=>Math.max(searchScore(row.username,term),searchScore(row.display_name,term),searchScore(row.full_name,term))>0)].map(row=>[row.user_id,row])).values()];
    }
    const results=candidates.map(row=>({id:row.user_id,username:row.username||"",display_name:row.display_name||row.full_name||"",avatar_url:row.avatar_url||""}));
    results.sort((a,b)=>Math.max(searchScore(b.username,term),searchScore(b.display_name,term))-Math.max(searchScore(a.username,term),searchScore(a.display_name,term)));results.splice(50);
    return {data:{results}};
  }catch(primary){
    try{
      const response=await base44.functions.invoke("searchUsers",{q:term});
      if(!Array.isArray(response?.data?.results))throw primary;
      return {data:{results:response.data.results}};
    }catch{
      // Both server routes enforce the same authenticated public-profile policy.
      const response=await base44.functions.invoke("securityGateway",{entity:"User",action:"searchPublic",args:[term]});
      if(!Array.isArray(response?.data?.result))throw primary;
      return {data:{results:response.data.result}};
    }
  }
}

async function runSearch(query,scope="all") {
  const Q = query.trim();
  if (!Q) return { tracks: [], artists: [], people: [], playlists: [], failed: false };

  if(scope==="people"){
    if(Q.length<2)return {tracks:[],artists:[],people:[],playlists:[],failed:false,peopleFailed:false};
    const response=await read(searchPeople(Q));
    return {tracks:[],artists:[],people:response.value?.data?.results||[],playlists:[],failed:false,peopleFailed:!response.ok};
  }
  const pattern = escapeRegex(Q);
  const lower = Q.toLowerCase();

  const [trackRes, artistRes, peopleRes, playlistRes] = await Promise.all([
    read(
      base44.entities.Track.filter(
        {
          is_published: true,
          $or: [
            contains("title", pattern),
            contains("artist", pattern),
            contains("uploader_name", pattern),
            ...(Q.length>=5?[contains("lyrics_text",pattern)]:[]),
          ],
        },
        { sort: "-play_count", limit: TRACK_LIMIT }
      )
    ),
    read(
      base44.entities.Artist.filter(
        {
          $or: [
            contains("name", pattern),
            contains("aliases", pattern),
            contains("bio", pattern),
            contains("location", pattern),
          ],
        },
        { sort: "-updated_date", limit: ARTIST_SCAN }
      )
    ),
    read(searchPeople(lower)),
    read(
      base44.entities.Playlist.filter(
        // A playlist belongs in the results only when the term matches the
        // playlist itself — a description that happens to mention the term is not
        // a search for that playlist.
        { is_public: true, ...contains("name", pattern) },
        { sort: "-created_date", limit: PLAYLIST_LIMIT }
      )
    ),
  ]);

  let catalog=[],artistCatalog=[],catalogOK=false;
  if(Q.length>=3&&(rows(trackRes.value).length<8||rows(artistRes.value).length<3)){
    const extra=await Promise.all([read(getPublishedTracks()),read(getArtists())]);
    catalog=rows(extra[0].value);artistCatalog=rows(extra[1].value);catalogOK=extra[0].ok;
  }
  const candidates=[...new Map([...rows(trackRes.value),...catalog.filter(t=>scoreTrack(t,Q)>0)].map(t=>[t.id,t])).values()];
  const tracks=candidates.sort((a,b)=>scoreTrack(b,Q)-scoreTrack(a,Q)||rank(b,lower)-rank(a,lower)||(b.play_count||0)-(a.play_count||0)).slice(0,TRACK_LIMIT);
  const artistMatches=artistCatalog.filter(a=>Math.max(searchScore(a.name,Q),...(a.aliases||[]).map(alias=>searchScore(alias,Q)))>0);
  const found=pruneArtists([...rows(artistRes.value),...artistMatches],lower).sort((a,b)=>searchScore(b.name,Q)-searchScore(a.name,Q));
  const covers = await artistCovers(found.map((a) => a.name).filter(Boolean));
  const artists = found.map((artist) => ({
    ...artist,
    cover_candidates: [...new Set([artist.avatar_url,artist.cover_art_url,...coversFor(artist,covers)].filter(value=>typeof value==="string"&&value.trim()))],
    cover_art_url: artist.cover_art_url || artist.avatar_url || coversFor(artist,covers)[0] || "",
  }));

  const playlists = [...(rows(playlistRes.value))].sort(
    (a, b) => rankPlaylist(b, lower) - rankPlaylist(a, lower)
  );

  return {
    tracks,
    artists,
    people: peopleRes.value?.data?.results || [],
    playlists,
    failed: !trackRes.ok&&!catalogOK,
    peopleFailed: !peopleRes.ok,
  };
}

// Repeating the same term — backspacing, retyping, or navigating back to the
// search page — must not re-fire this many requests, so an identical term is
// answered from the last few seconds of results and simultaneous calls for the
// same term share one request. A manual refresh passes `fresh` to go to the
// server regardless.
const RECENT_TTL = 5 * 60 * 1000;
const recent = new Map();
window.addEventListener("catalog:invalidate",()=>recent.clear());
window.addEventListener("account:cleared",()=>recent.clear());

export function globalSearch(query, { fresh = false,scope="all" } = {}) {
  const Q = query.trim();
  if (!Q)
    return Promise.resolve({
      tracks: [],
      artists: [],
      people: [],
      playlists: [],
      failed: false,
    });

  const key=scope+"::"+Q;
  const now = Date.now();
  for (const [term, entry] of recent) {
    if (now - entry.at > RECENT_TTL) recent.delete(term);
  }

  if (!fresh) {
    const hit = recent.get(key);
    if (hit) return hit.promise;
  }

  const promise = runSearch(Q,scope).then(result=>{if(result.failed||result.peopleFailed)recent.delete(key);return result;}).catch(error=>{recent.delete(key);throw error;});
  recent.set(key, { at: now, promise, result:null });
  promise.then(result=>{const entry=recent.get(key);if(entry?.promise===promise)entry.result=result;}).catch(()=>{});
  return promise;
}
export function peekSearch(query,scope="all"){const entry=recent.get(scope+"::"+query.trim());return entry&&Date.now()-entry.at<RECENT_TTL?entry.result:null;}
