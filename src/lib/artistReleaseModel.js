export const artistKey=value=>String(value||"").normalize("NFKD").replace(/[\u0300-\u036f]/g,"").trim().replace(/\s+/g," ").toLowerCase();
export function artistReleaseNames(value){
 const credit=String(value||""),featured=/\b(?:feat(?:uring)?\.?|ft\.?)\s+/i.test(credit);
 const normalized=credit.replace(/\s*[\[(]?\b(?:feat(?:uring)?\.?|ft\.?)\s+/gi,", ");
 const names=normalized.split(/\s*(?:,|&|;|\/| x )\s*/i).map(name=>name.trim().replace(/\s+/g," ")).map(name=>featured?name.replace(/[)\]]\s*$/,"").trim():name).filter(Boolean);
 return [...new Map(names.map(name=>[artistKey(name),name])).values()];
}
export function releaseNotifications(subscriptions,tracks){
 const result=[],seen=new Set();
 for(const s of subscriptions)for(const t of tracks){
  const released=t.published_at||t.created_date;
  const credits=artistReleaseNames(t.artist).map(artistKey);
  if(!t.is_published||t.approval_status!=="approved"||!credits.includes(s.artist_key)||!released||new Date(released)<=new Date(s.created_date))continue;
  const key=s.id+":"+t.id;if(seen.has(key))continue;seen.add(key);
  result.push({id:"release:"+key,subscription_id:s.id,user_id:s.created_by_id,type:"new_upload_from_followed",actor_id:t.uploader_id,actor_name:s.artist_name,actor:{id:t.uploader_id,display_name:s.artist_name},track_id:t.id,track:t,read:(s.read_track_ids||[]).includes(t.id),created_date:released});
 }
 return result.sort((a,b)=>new Date(b.created_date).getTime()-new Date(a.created_date).getTime());
}
