export const ONBOARDING_PALETTES=[
 {name:"PUBLIC",colors:["#000000","#ffffff","#303030"]},
 {name:"Electric",colors:["#5335ff","#00dfd8","#ed65ff"]},
 {name:"Heat",colors:["#ff2000","#ff8600","#efff24"]},
 {name:"Daydream",colors:["#5950d6","#ff9abd","#74e3e4"]},
 {name:"After hours",colors:["#072d45","#1eceac","#4152be"]},
 {name:"Bloom",colors:["#c21c58","#ff7878","#ffce9e"]}
];
export const cleanHandle=value=>String(value||"").trim().toLowerCase().replace(/^@/,"");
export const validHandle=value=>!value||/^[a-z0-9_]{3,24}$/.test(cleanHandle(value));
export const credits=track=>String(track?.artist||"").split(/\s*(?:,|&| feat\.| ft\.|;|\/)\s*/i).map(s=>s.trim()).filter(Boolean);
export function recommendPeople(profiles,catalog,{uid=undefined,blocked=new Set(),genres=[],artists=[],trackIds=[]}={}){
 const wanted=new Set(artists.map(s=>s.toLowerCase())),selected=new Set(trackIds),byId=new Map(catalog.map(t=>[t.id,t]));
 return profiles.filter(p=>p.user_id&&p.user_id!==uid&&p.visible!==false&&!blocked.has(p.user_id)).map(p=>{
  const publicSongs=(p.top_track_ids||[]).map(id=>byId.get(id)).filter(Boolean);
  const shared=publicSongs.filter(t=>selected.has(t.id)||credits(t).some(a=>wanted.has(a.toLowerCase()))).length;
  const uploads=catalog.filter(t=>t.uploader_id===p.user_id);
  const genre=genres.find(g=>uploads.some(t=>t.genre===g));
  return {...p,score:shared*5+(genre?2:0),reason:shared?"Shares your favorites":genre?"Uploads "+genre:p.is_artist?"Artist on PUBLIC":"Listener on PUBLIC"};
 }).sort((a,b)=>b.score-a.score||String(a.display_name||"").localeCompare(b.display_name||"")).slice(0,12);
}
export const draftKey=uid=>"public:onboarding-draft:v2:"+uid;
export function readOnboardingDraft(uid){
 try{
  const raw=JSON.parse(localStorage.getItem(draftKey(uid))||"null");if(raw?.uid!==uid)return null;
  const clean={step:Math.max(0,Math.min(6,Math.floor(Number(raw.step)||0)))};
  for(const key of ["name","username","avatar","profileTrack"])if(typeof raw[key]==="string")clean[key]=raw[key].slice(0,key==="avatar"?2048:160);
  for(const [key,max] of [["genres",300],["artists",5],["trackIds",8]])if(Array.isArray(raw[key]))clean[key]=[...new Set(raw[key].filter(v=>typeof v==="string"&&v.length<=160))].slice(0,Number(max));
  if(["auto","custom","off"].includes(raw.mode))clean.mode=raw.mode;
  if(["flow","still"].includes(raw.motion))clean.motion=raw.motion;
  if(Number.isFinite(raw.speed)&&raw.speed>=.35&&raw.speed<=1.6)clean.speed=raw.speed;
  if(Array.isArray(raw.colors)&&raw.colors.length>=1&&raw.colors.length<=3&&raw.colors.every(c=>/^#[0-9a-f]{6}$/i.test(c)))clean.colors=raw.colors;
  for(const key of ["shareFavorites","sharingChanged"])if(typeof raw[key]==="boolean")clean[key]=raw[key];
  if(Array.isArray(raw.editedFields))clean.editedFields=raw.editedFields.filter(key=>["genres","trackIds","artists"].includes(key));
  else clean.editedFields=["genres","trackIds","artists"].filter(key=>Array.isArray(raw[key]));
  return clean;
 }catch{return null;}
}

export function onboardingComplete(user){
 if(!user?.id)return false;
 if(user.onboarding_completed===true)return true;
 try{return localStorage.getItem("public:onboarded:"+user.id)==="1";}catch{return false;}
}
export function normalizeOnboardingColors(colors){
 const valid=Array.isArray(colors)?colors.filter(c=>/^#[0-9a-f]{6}$/i.test(c)):[];
 return valid.length?valid.slice(0,3):["#000000","#45454b","#202025"];
}
export function mergeOnboardingTaste(draft,taste){
 const edited=new Set(draft.editedFields||[]),next={...draft};
 for(const [field,source] of [["genres","genres"],["trackIds","favorite_track_ids"],["artists","favorite_artists"]])if(!edited.has(field))next[field]=Array.isArray(taste?.[source])?[...taste[source]]:[];
 return next;
}
export function withOnboardingDeadline(promise,ms=15000){
 let timer;
 return Promise.race([promise,new Promise((_,reject)=>{timer=setTimeout(()=>reject(Error("Choices took too long to load. Please retry.")),ms);})]).finally(()=>clearTimeout(timer));
}

export function onboardingSearchMatch(value,query){
 const normalize=input=>String(input||"").normalize("NFKD").replace(/[\u0300-\u036f]/g,"").toLowerCase().trim().replace(/\s+/g," ");
 return normalize(value).includes(normalize(query));
}
