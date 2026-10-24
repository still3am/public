import {biographyLink,loadArtistBiography} from './artistBiography';
import {getMusicBrainz} from './songInfo';
const cache=new Map();
const norm=s=>String(s||'').normalize('NFKD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
export function selectArtist(artist,rows){
 const matches=rows.filter(row=>norm(row.name)===norm(artist.name)&&/^[a-f0-9-]{36}$/.test(row.id||''));
 if(matches.length===1)return matches[0];
 if(artist.musicbrainz_id)return matches.find(row=>row.id===artist.musicbrainz_id)||null;
 const local=norm(artist.location);
 const located=local?matches.filter(row=>[row.area?.name,row['begin-area']?.name].some(name=>name&&local.includes(norm(name)))):[];
 return located.length===1?located[0]:null;
}
export async function findArtistInfo(artist){
 const key=[artist.name,artist.location,artist.musicbrainz_id,!!artist.bio?.trim(),!!artist.history_text?.trim()].join('|'),old=cache.get(key);
 if(old&&Date.now()-old.time<600000)return old.value;
 const query='artist:"'+String(artist.name).replace(/[\\"]/g,' ').slice(0,180)+'"';
 const result=await getMusicBrainz('artist/?'+new URLSearchParams({query,fmt:'json',limit:'25'}));
 const match=selectArtist(artist,result.artists||[]);
 let value=null;
 if(match){
 const detail=await getMusicBrainz('artist/'+match.id+'?fmt=json&inc=genres+url-rels');
 const biography=!artist.bio?.trim()&&!artist.history_text?.trim()?await loadArtistBiography(biographyLink(detail.relations)).catch(()=>null):null;
 const lifespan=detail['life-span']||{};
 const website=(detail.relations||[]).find(row=>row.type==='official homepage'&&/^https?:\/\//.test(row.url?.resource||''))?.url?.resource;
 value={biography,id:detail.id,type:detail.type,area:detail.area?.name,origin:detail['begin-area']?.name,begin:lifespan.begin,end:lifespan.ended?lifespan.end:'',genres:(detail.genres||[]).sort((a,b)=>(b.count||0)-(a.count||0)).slice(0,4).map(g=>g.name).join(' · '),website};
 }
 cache.set(key,{time:Date.now(),value});if(cache.size>50)cache.delete(cache.keys().next().value);return value;
}
