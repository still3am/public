import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

const GENRES = [
  "Pop",
  "Hip-Hop",
  "R&B",
  "Soul",
  "Funk",
  "Dance",
  "Electronic",
  "Techno",
  "House",
  "Trap",
  "Disco",
  "Rock",
  "Alternative",
  "Indie",
  "Punk",
  "Metal",
  "Country",
  "Folk",
  "Blues",
  "Jazz",
  "Classical",
  "Ambient",
  "Reggae",
  "Latin",
  "World",
  "K-Pop",
  "J-Pop",
  "Singer/Songwriter",
  "Soundtrack",
  "Easy Listening",
  "Holiday",
  "Christian & Gospel",
  "Children's Music",
  "Comedy",
  "Spoken Word",
  "Fitness & Workout",
  "Sexy Drill",
  "Drill",
  "New York Drill",
  "Brooklyn Drill",
  "UK Drill",
  "Chicago Drill",
  "Sample Drill",
  "Jersey Club",
  "Baltimore Club",
  "Philly Club",
  "Rap",
  "Boom Bap",
  "Alternative Hip-Hop",
  "Conscious Hip-Hop",
  "Cloud Rap",
  "Emo Rap",
  "PluggnB",
  "Rage",
  "Southern Hip-Hop",
  "West Coast Hip-Hop",
  "Memphis Rap",
  "Phonk",
  "Latin Trap",
  "UK Garage",
  "Grime",
  "Afrobeats",
  "Afrobeat",
  "Afropop",
  "Amapiano",
  "Afro House",
  "Gqom",
  "Highlife",
  "Dancehall",
  "Reggaeton",
  "Dembow",
  "Latin Pop",
  "Latin Rock",
  "Bachata",
  "Salsa",
  "Merengue",
  "Soca",
  "Kompa",
  "Zouk",
  "Reggae Fusion",
  "Dub",
  "Bossa Nova",
  "Samba",
  "Brazilian Funk",
  "Corridos",
  "Regional Mexican",
  "Neo-Soul",
  "Alternative R&B",
  "Contemporary R&B",
  "New Jack Swing",
  "Gospel",
  "Deep House",
  "Tech House",
  "Progressive House",
  "Minimal House",
  "Trance",
  "Drum & Bass",
  "Jungle",
  "Dubstep",
  "Bass",
  "Breakbeat",
  "Electro",
  "IDM",
  "Synthwave",
  "Downtempo",
  "Trip-Hop",
  "Lo-Fi",
  "Lo-Fi Hip-Hop",
  "Chillout",
  "Hardstyle",
  "Hyperpop",
  "Dance-Pop",
  "Indie Pop",
  "Synth-Pop",
  "Afro Swing",
  "Indie Rock",
  "Alternative Rock",
  "Hard Rock",
  "Pop Punk",
  "Post-Punk",
  "Emo",
  "Shoegaze",
  "Dream Pop",
  "Grunge",
  "Post-Rock",
  "Metalcore",
  "Death Metal",
  "Heavy Metal",
  "Acoustic",
  "Americana",
  "Bluegrass",
  "Contemporary Country",
  "Smooth Jazz",
  "Jazz Fusion",
  "Jazz Rap",
  "Bebop",
  "Experimental",
  "Instrumental",
  "Orchestral",
  "Opera",
  "New Age",
  "Meditation",
  "Bollywood",
  "Desi Hip-Hop",
  "Bhangra",
  "K-R&B",
  "K-Hip-Hop",
  "J-Rock",
  "Other"
];


// Catalog metadata replaces text-generating AI. Unknown matches never overwrite a genre.
const genreCache=new Map();let catalogQueue=Promise.resolve(),lastCatalogRequest=0;
const normalize=value=>String(value||'').normalize('NFKD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]/g,'');
const cleanTitle=value=>String(value||'').replace(/\s*[([](?:feat\.?|ft\.?|featuring)\s+[^)\]]*[)\]]/gi,'').trim();
const artistNames=value=>String(value||'').split(/\s*(?:,|&|;)\s*|\s+(?:feat\.?|ft\.?|featuring|with|and)\s+/i).map(normalize).filter(Boolean);
const uuid=value=>/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(value||'');
const genreAliases={hiphoprap:'Hip-Hop',contemporaryrb:'R&B',rnb:'R&B',alternativerock:'Alternative',singersongwriter:'Singer/Songwriter',electronicadance:'Electronic',childrens:'Children\'s Music'};
export function catalogGenre(genres){
 for(const genre of [...(genres||[])].sort((a,b)=>(Number(b.count)||0)-(Number(a.count)||0))){
  const key=normalize(genre.name),mapped=GENRES.find(g=>normalize(g)===key)||genreAliases[key];
  if(mapped&&mapped!=='Other'&&GENRES.includes(mapped))return mapped;
 }
 return null;
}
export function selectGenreRecording(track,recordings){
 const expected=normalize(cleanTitle(track.title)),artists=artistNames(track.artist),duration=Number(track.duration_seconds);
 if(!expected||!artists.length)return null;
 const matches=(recordings||[]).filter(row=>{
  if(!uuid(row.id)||(Number(row.score)||0)<95||normalize(cleanTitle(row.title))!==expected)return false;
  const names=(row['artist-credit']||[]).map(a=>normalize(a.artist?.name||a.name));
  if(!artists.every(a=>names.includes(a)))return false;
  const version=String(row.disambiguation||'');
  if(/\b(live|remix|acoustic|demo|karaoke|instrumental)\b/i.test(version)&&!normalize(track.title).includes(normalize(version)))return false;
  return !duration||(Number(row.length)>0&&Math.abs(row.length/1000-duration)<=4);
 }).sort((a,b)=>Number(b.score)-Number(a.score)||Math.abs(Number(a.length||0)/1000-duration)-Math.abs(Number(b.length||0)/1000-duration));
 if(!duration&&matches.length>1){const lengths=matches.map(r=>Number(r.length)).filter(n=>n>0);if(lengths.length!==matches.length||Math.max(...lengths)-Math.min(...lengths)>4000)return null;}
 return matches[0]||null;
}

export function selectAppleGenre(track,results){
 const expected=normalize(cleanTitle(track.title)),artists=artistNames(track.artist),duration=Number(track.duration_seconds);
 const matches=(results||[]).filter(row=>row.kind==='song'&&Number.isSafeInteger(row.trackId)&&row.trackId>0&&normalize(cleanTitle(row.trackName))===expected&&artists.length&&artists.every(a=>artistNames(row.artistName).includes(a))&&(!duration||(Number(row.trackTimeMillis)>0&&Math.abs(row.trackTimeMillis/1000-duration)<=4)));
 if(!duration&&matches.length>1){const lengths=matches.map(r=>Number(r.trackTimeMillis));if(lengths.some(n=>!n)||Math.max(...lengths)-Math.min(...lengths)>4000)return null;}
 const genres=[...new Set(matches.map(r=>catalogGenre([{name:r.primaryGenreName,count:1}])).filter(Boolean))];
 return genres.length===1?genres[0]:null;
}

async function catalogJson(path,deadline,provider='musicbrainz'){
 const task=catalogQueue.catch(()=>{}).then(async()=>{
  const wait=Math.max(0,(provider==='itunes'?3200:1100)-(Date.now()-lastCatalogRequest));
  if(Date.now()+wait>=deadline)throw Error('Catalog lookup timed out. Retry shortly.');
  if(wait)await new Promise(resolve=>setTimeout(resolve,wait));lastCatalogRequest=Date.now();
  const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),Math.max(1,Math.min(7000,deadline-Date.now())));
  try{
   const response=await fetch((provider==='itunes'?'https://itunes.apple.com/':'https://musicbrainz.org/ws/2/')+path,{signal:controller.signal,headers:{Accept:'application/json','User-Agent':'PUBLIC/1.0 (https://publicmusic.base44.app)'}});
   if(!response.ok)throw Error('Music catalog is temporarily unavailable. Retry shortly.');
   return await response.json();
  }finally{clearTimeout(timer);}
 });catalogQueue=task.then(()=>{},()=>{});return task;
}

export async function lookupCatalogGenre(track,deadline=Date.now()+20000){
 const key=JSON.stringify([track.title,track.artist,track.duration_seconds]),cached=genreCache.get(key);
 if(cached&&cached.until>Date.now())return cached.value;
 if(!track.title||!track.artist)return null;
 let value=null,available=false,hadFailure=false;
 try{
  const apple=await catalogJson('search?'+new URLSearchParams({term:(cleanTitle(track.title)+' '+track.artist).slice(0,350),entity:'song',media:'music',country:'US',limit:'25'}),deadline,'itunes');
  available=true;value=selectAppleGenre(track,apple.results);
 }catch{hadFailure=true;}
 if(!value){
  try{
   const quote=value=>'"'+String(value).replace(/[\\"]/g,' ').slice(0,180)+'"';
   const primary=String(track.artist).split(/\s*(?:,|&|;)\s*|\s+(?:feat\.?|ft\.?|featuring|with|and)\s+/i)[0];
   const query='recording:'+quote(cleanTitle(track.title))+' AND artist:'+quote(primary);
   const result=await catalogJson('recording/?'+new URLSearchParams({query,fmt:'json',limit:'15'}),deadline);
   available=true;const selected=selectGenreRecording(track,result.recordings);
   if(selected){const recording=await catalogJson('recording/'+selected.id+'?fmt=json&inc=genres',deadline);value=catalogGenre(recording.genres);}
  }catch{hadFailure=true;}
 }
 if(!available)throw Error('Music catalogs are temporarily unavailable.');
 genreCache.set(key,{value,until:Date.now()+(value?86400000:hadFailure?60000:3600000)});if(genreCache.size>500)genreCache.delete(genreCache.keys().next().value);
 return value;
}

export default async function handleRequest(req){
 try{
  const client=createClientFromRequest(req),user=await client.auth.me();
  if(!user)return Response.json({error:'Unauthorized'},{status:401});
  if(user.is_blocked||user.disabled||user.role!=='admin')return Response.json({error:'Administrator access required'},{status:403});
  const body=await req.json().catch(()=>({})),force=body.force===true;
  let skip=Number.isInteger(body.skip)?Math.max(0,body.skip):0,processed=0,unmatched=0,scanned=0,lookups=0;
  const page=await client.asServiceRole.entities.Track.filter({},'-created_date',60,skip);
  const tracks=Array.isArray(page)?page:page?.items;
  if(!Array.isArray(tracks))throw Error('Invalid track page');
  const deadline=Date.now()+42000;
  for(const track of tracks){
   if(!force&&track.genre&&track.genre!=='Other'){skip++;scanned++;continue;}
   if(lookups>=6||Date.now()>deadline-1500)return Response.json({processed,unmatched,scanned,skip,has_more:true});
   let genre;
   try{lookups++;genre=await lookupCatalogGenre(track,deadline);}catch{return Response.json({processed,unmatched,scanned,skip,has_more:true,retry_required:true,error:'Catalog lookup paused. Retry shortly; existing genres were kept.'});}
   if(genre){await client.asServiceRole.entities.Track.update(track.id,{genre});processed++;}else unmatched++;
   skip++;scanned++;
  }
  return Response.json({processed,unmatched,scanned,skip,has_more:tracks.length===60});
 }catch{return Response.json({error:'Catalog genre matching could not finish. Please retry.'},{status:503});}
}
if(typeof Deno!=='undefined')Deno.serve(handleRequest);
