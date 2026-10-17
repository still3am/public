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
export function recommendPeople(profiles,catalog,{uid,blocked=new Set(),genres=[],artists=[],trackIds=[]}={}){
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
 try{const raw=JSON.parse(localStorage.getItem(draftKey(uid))||"null");if(raw?.uid===uid)return raw;}catch{}
 return null;
}
