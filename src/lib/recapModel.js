export function recapBounds(period,value){
 const date=new Date(value||Date.now()),year=date.getFullYear(),month=date.getMonth();
 return {start:new Date(year,period==="year"?0:month,1),end:new Date(period==="year"?year+1:year,period==="year"?0:month+1,1)};
}
export function buildRecap(sessions,events,catalog,period,value){
 const {start,end}=recapBounds(period,value),tracks=new Map(catalog.map(t=>[t.id,t]));
 const inPeriod=value=>{const d=new Date(value);return d>=start&&d<end;};
 const seen=new Set(),valid=sessions.filter(s=>{if(seen.has(s.session_key))return false;seen.add(s.session_key);return inPeriod(s.started_at)&&s.listened_seconds>=5;});
 const plays=valid.map(s=>({track_id:s.track_id,date:s.started_at,seconds:s.listened_seconds}));
 for(const event of events)if(inPeriod(event.created_date)&&!valid.some(s=>s.track_id===event.track_id&&Math.abs(new Date(s.started_at)-new Date(event.created_date))<120000))plays.push({track_id:event.track_id,date:event.created_date,seconds:0});
 const counts=new Map(),artists=new Map(),genres=new Map();
 for(const play of plays){const t=tracks.get(play.track_id);if(!t)continue;counts.set(t.id,(counts.get(t.id)||0)+1);const a=t.artist||t.uploader_name||"Unknown";artists.set(a,(artists.get(a)||0)+1);if(t.genre)genres.set(t.genre,(genres.get(t.genre)||0)+1);}
 const ranked=[...counts].sort((a,b)=>b[1]-a[1]).map(([id,count])=>({...tracks.get(id),recap_plays:count}));
 return {seconds:plays.filter(p=>tracks.has(p.track_id)).reduce((n,p)=>n+(Number.isFinite(p.seconds)?Math.max(0,p.seconds):0),0),tracks:ranked,plays:ranked.reduce((n,t)=>n+t.recap_plays,0),artist:[...artists].sort((a,b)=>b[1]-a[1])[0]?.[0]||"",genre:[...genres].sort((a,b)=>b[1]-a[1])[0]?.[0]||"",unique:ranked.length};
}
