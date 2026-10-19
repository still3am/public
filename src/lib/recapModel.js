export function recapBounds(period,value){
 if(period==="all")return {start:new Date(0),end:new Date(8640000000000000)};
 const date=new Date(value||Date.now()),year=date.getFullYear(),month=date.getMonth();
 return {start:new Date(year,period==="year"?0:month,1),end:new Date(period==="year"?year+1:year,period==="year"?0:month+1,1)};
}
export function buildRecap(sessions,events,catalog,period,value){
 const {start,end}=recapBounds(period,value),tracks=new Map(catalog.map(t=>[t.id,t]));
 const inPeriod=value=>{const d=new Date(value);return d>=start&&d<end;};
 const deduped=new Map();
 for(const s of sessions){if(!s.session_key)continue;const old=deduped.get(s.session_key);if(!old||s.listened_seconds>old.listened_seconds)deduped.set(s.session_key,s);}
 const valid=[...deduped.values()].filter(s=>inPeriod(s.started_at)&&s.listened_seconds>=5);
 const plays=valid.map(s=>({track_id:s.track_id,date:s.started_at,seconds:s.listened_seconds}));
 const sessionTimes=new Map();
 for(const s of valid){if(!sessionTimes.has(s.track_id))sessionTimes.set(s.track_id,[]);sessionTimes.get(s.track_id).push(new Date(s.started_at).getTime());}
 for(const times of sessionTimes.values())times.sort((a,b)=>a-b);
 for(const event of events){
  if(!inPeriod(event.created_date))continue;
  const time=new Date(event.created_date).getTime(),times=sessionTimes.get(event.track_id)||[];
  let lo=0,hi=times.length;
  while(lo<hi){const mid=(lo+hi)>>>1;if(times[mid]<=time-120000)lo=mid+1;else hi=mid;}
  if(lo===times.length||times[lo]>=time+120000)plays.push({track_id:event.track_id,date:event.created_date,seconds:0});
 }
 const counts=new Map(),artists=new Map(),genres=new Map();
 for(const play of plays){const t=tracks.get(play.track_id);if(!t)continue;counts.set(t.id,(counts.get(t.id)||0)+1);const a=t.artist||t.uploader_name||"Unknown";artists.set(a,(artists.get(a)||0)+1);if(t.genre)genres.set(t.genre,(genres.get(t.genre)||0)+1);}
 const ranked=[...counts].sort((a,b)=>b[1]-a[1]).map(([id,count])=>({...tracks.get(id),recap_plays:count}));
 return {seconds:plays.filter(p=>tracks.has(p.track_id)).reduce((n,p)=>n+(Number.isFinite(p.seconds)?Math.max(0,p.seconds):0),0),tracks:ranked,plays:ranked.reduce((n,t)=>n+t.recap_plays,0),artist:[...artists].sort((a,b)=>b[1]-a[1])[0]?.[0]||"",genre:[...genres].sort((a,b)=>b[1]-a[1])[0]?.[0]||"",unique:ranked.length};
}
