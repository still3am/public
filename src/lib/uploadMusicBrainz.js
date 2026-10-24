import {getMusicBrainz} from './songInfo';
const valid=id=>/^[a-f0-9-]{36}$/.test(id||'');
export function recordingChoices(data){
 return (data.recordings||[]).filter(r=>valid(r.id)).flatMap(record=>{
  const artist=(record['artist-credit']||[]).map(a=>(a.name||a.artist?.name||'')+(a.joinphrase||'')).join('');
  const releases=(record.releases||[]).filter(r=>r.title&&r.status!=='Bootleg').slice(0,4);
  return (releases.length?releases:[null]).map(release=>({id:record.id+':'+(release?.id||''),recordingId:record.id,title:record.title,artist,album:release?.title||'',date:release?.date||record['first-release-date']||'',duration:record.length?record.length/1000:0,version:record.disambiguation||''}));
 }).slice(0,40);
}
export async function searchUploadMetadata(query){
 const text=String(query||'').trim().slice(0,200);if(text.length<2)return [];
 return recordingChoices(await getMusicBrainz('recording/?'+new URLSearchParams({query:text,fmt:'json',limit:'15'})));
}
export function uploadMusicBrainzMetadata(row){
 const fields={title:String(row.title||'').slice(0,200),artist:String(row.artist||'').slice(0,200)};
 if(row.album)fields['album_name']=String(row.album).slice(0,300);
 if(/^\d{4}/.test(row.date||''))fields['release_year']=Number(row.date.slice(0,4));
 return fields;
}
