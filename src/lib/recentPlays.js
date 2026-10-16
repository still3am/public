// Persists the user's most recently played tracks in localStorage.
// PlayerContext writes here; Home reads via the "recentplays:change" custom
// event so the "Recently Played" row updates live within the same tab.

const KEY = "public:recently_played";
const MAX = 20;

let memory = [];
function slim(track) {
  if (!track || typeof track.id !== "string" || !track.id.trim()) return null;
  const result = { id:track.id };
  for (const key of ['title','artist','uploader_name','uploader_id','cover_art_url','audio_url','genre']) result[key]=typeof track[key]==='string'?track[key]:'';
  result._private_audio=track._private_audio===true;
  result.explicit=track.explicit===true;
  result.is_published=track.is_published===true;
  result.duration_seconds=Number.isFinite(track.duration_seconds)&&track.duration_seconds>=0?track.duration_seconds:0;
  return result;
}
function normalize(value) {
  if (!Array.isArray(value)) return [];
  const seen=new Set();
  return value.map(slim).filter(track=>track&&!seen.has(track.id)&&seen.add(track.id)).slice(0,MAX);
}
export function getRecentPlays() {
  try { memory=normalize(JSON.parse(localStorage.getItem(KEY)||"[]")); } catch {}
  return memory.slice();
}
export function addRecentPlay(track) {
  const song=slim(track);
  if(!song)return getRecentPlays();
  memory=normalize([song,...getRecentPlays()]);
  try { localStorage.setItem(KEY,JSON.stringify(memory)); } catch {}
  window.dispatchEvent(new CustomEvent("recentplays:change"));
  return memory.slice();
}
export function clearRecentPlays() {
  memory=[];
  try { localStorage.removeItem(KEY); } catch {}
  window.dispatchEvent(new CustomEvent("recentplays:change"));
}
window.addEventListener("account:cleared",()=>{memory=[];});
