import {applyAlbumInfo,unknownAlbum} from './albumEnrichment.js';
import {artistKey,artistReleaseNames} from './artistReleaseModel.js';
export const albumKey=(artist,title)=>JSON.stringify([artistKey(artist),String(title||'').trim().replace(/\s+/g,' ').toLowerCase()]);
const clean=value=>typeof value==='string'?value.trim().replace(/\s+/g,' '):'';
const position=value=>{const n=parseInt(value,10);return n>0&&n<10000?n:0;};
export function groupAlbums(tracks,records=[]){
 const linked=new Map(records.map(a=>[a.id,a])),groups=new Map();
 for(const original of tracks){
  const track=applyAlbumInfo(original);
  if(track.is_published===false||(track.approval_status&&track.approval_status!=='approved'))continue;
  const record=linked.get(track.album_id),title=clean(track.album_name||track.album_title||track.album||record?.title);
  const artist=clean(track.album_artist||record?.artisan||artistReleaseNames(track.artist)[0]);
  if(!title||unknownAlbum(title)||!artist)continue;
  const key=albumKey(artist,title);
  if(!groups.has(key))groups.set(key,{key,title,artist,cover_art_url:record?.cover_art_url||'',year:0,tracks:[]});
  const group=groups.get(key);
  if(!group.tracks.some(t=>t.id===track.id))group.tracks.push(track);
  if(record?.cover_art_url)group.cover_art_url=record.cover_art_url;
  else if(!group.cover_art_url&&track.cover_art_url)group.cover_art_url=track.cover_art_url;
  const year=Number(track.release_year);if(year>=1900&&year<=2200)group.year=Math.max(group.year,year);
 }
 return [...groups.values()].map(group=>({...group,tracks:group.tracks.sort((a,b)=>(position(a.disc_number)||1)-(position(b.disc_number)||1)||(position(a.track_number)||10000)-(position(b.track_number)||10000)||String(a.title||'').localeCompare(String(b.title||''))),duration:group.tracks.reduce((n,t)=>n+Math.max(0,Number(t.duration_seconds)||0),0)})).sort((a,b)=>b.year-a.year||a.title.localeCompare(b.title));
}
export const albumUrl=album=>'/album/'+encodeURIComponent(album.key);
