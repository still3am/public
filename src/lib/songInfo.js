const cache=new Map();let queue=Promise.resolve(),last=0;
const norm=s=>String(s||'').normalize('NFKD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
const title=s=>norm(String(s||'').replace(/\s*[([](?:feat\.?|ft\.?).*?[)\]]/gi,''));
const primary=s=>norm(String(s||'').split(/\s+(?:feat\.?|ft\.?|featuring|with|&)\s+|,/i)[0]);
const uuid=s=>/^[a-f0-9-]{36}$/.test(s||'');
export function selectRecording(track,rows){
 const duration=Number(track.duration_seconds);
 const matches=rows.filter(r=>uuid(r.id)&&(!/\b(live|remix|acoustic|demo|karaoke|instrumental)\b/i.test(r.disambiguation||'')||norm(track.title).includes(norm(r.disambiguation)))&&title(r.title)===title(track.title)&&(r['artist-credit']||[]).some(a=>norm(a.name||a.artist?.name)===primary(track.artist))&&(!duration||Number(r.length)>0&&Math.abs(r.length/1000-duration)<=4));
 const ranked=matches.sort((a,b)=>(Number(b.score)||0)-(Number(a.score)||0)||String(a['first-release-date']||'9999').localeCompare(String(b['first-release-date']||'9999'))||Math.abs(a.length/1000-duration)-Math.abs(b.length/1000-duration));
 if(!duration&&new Set(matches.map(r=>Math.round((r.length||0)/10000))).size>1)return null;
 return ranked[0]||null;
}
export async function getMusicBrainz(path){
 const task=queue.catch(()=>{}).then(async()=>{
  await new Promise(resolve=>setTimeout(resolve,Math.max(0,1100-(Date.now()-last))));last=Date.now();
  const controller=new AbortController(),timeout=setTimeout(()=>controller.abort(),12000);
  try{const r=await fetch('https://musicbrainz.org/ws/2/'+path,{signal:controller.signal,headers:{'User-Agent':'PUBLIC/1.0 (https://publicnet.base44.app)'}});if(!r.ok)throw Error('Song details are temporarily unavailable.');return await r.json();}finally{clearTimeout(timeout);}
 });queue=task.then(()=>{},()=>{});return task;
}
/** @param {any} track */
export async function findSongInfo(track){
 if(!track.title||!track.artist)return null;
 const key=[track.title,track.artist,track.duration_seconds,track.album_name||track.album_title||track.album].join('|'),old=cache.get(key);
 if(old&&Date.now()-old.time<600000)return old.value;
 const quote=s=>'"'+String(s).replace(/[\\"]/g,' ').slice(0,180)+'"';
 const query='recording:'+quote(track.title)+' AND artist:'+quote(String(track.artist).split(/,| feat\.? | ft\.? /i)[0]);
 const found=await getMusicBrainz('recording/?'+new URLSearchParams({query,fmt:'json',limit:'20'}));
 const match=selectRecording(track,found.recordings||[]);
 let value=null;
 if(match){
  const record=await getMusicBrainz('recording/'+match.id+'?fmt=json&inc=artist-credits+releases+artist-rels+release-groups+genres');
  const releases=(record.releases||[]).filter(r=>r.status==='Official'&&r.title);
  const albumName=track.album_name||track.album_title||track.album;
  const preferred=releases.filter(r=>!(r['release-group']?.['secondary-types']||[]).some(t=>['Compilation','Live','DJ-mix'].includes(t))).sort((a,b)=>String(a.date||'9999').localeCompare(String(b.date||'9999')));
  const release=releases.find(r=>norm(r.title)===norm(albumName))||preferred.find(r=>r['release-group']?.['primary-type']==='Album')||preferred[0];
  const people=type=>[...new Set((record.relations||[]).filter(r=>r.type===type&&r.artist?.name).map(r=>r.artist.name))].join(', ');
  value={id:match.id,title:record.title,genres:(record.genres||[]).sort((a,b)=>(b.count||0)-(a.count||0)).map(g=>g.name),artists:(record['artist-credit']||[]).map(a=>(a.name||a.artist?.name||'')+(a.joinphrase||'')).join(''),album:release?.title||'',albumArtist:(release?.['artist-credit']||record['artist-credit']||[]).map(a=>(a.name||a.artist?.name||'')+(a.joinphrase||'')).join(''),releaseDate:release?.date||'',producer:people('producer'),mixer:people('mix'),engineer:people('engineer')};
 }
 cache.set(key,{time:Date.now(),value});if(cache.size>50)cache.delete(cache.keys().next().value);return value;
}
