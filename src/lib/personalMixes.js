const clean=value=>String(value||'').trim().toLowerCase();
const hash=value=>[...String(value)].reduce((n,c)=>(Math.imul(n,31)+c.charCodeAt(0))>>>0,0);
const genreMatch=(track,genres)=>genres.some(genre=>clean(track.genre).includes(genre));
export function buildPersonalMixes(catalog,{recent=[],savedIds=new Set(),genres=[],favoriteTrackIds=[],favoriteArtists=[],uid='',day=Math.floor(Date.now()/86400000)}={}){
 const seen=new Set(),tracks=(catalog||[]).filter(t=>t?.id&&t.is_published===true&&(t.audio_url||t._private_audio)&&!seen.has(t.id)&&seen.add(t.id));
 const byId=new Map(tracks.map(t=>[t.id,t])),played=recent.map(t=>byId.get(t.id)).filter(Boolean),heard=new Set(played.map(t=>t.id));
 const preferred=[...new Set([...genres.map(clean),...seeds.map(t=>clean(t.genre)),...played.map(t=>clean(t.genre)),...tracks.filter(t=>savedIds.has(t.id)).map(t=>clean(t.genre))].filter(Boolean))];
 const seeds=tracks.filter(t=>favoriteTrackIds.includes(t.id));
 const chosenArtists=favoriteArtists.map(clean);
 const artists=new Set([...seeds,...played,...tracks.filter(t=>savedIds.has(t.id))].map(t=>clean(t.artist)).filter(Boolean));
 const affinity=t=>(genreMatch(t,preferred)?4:0)+(artists.has(clean(t.artist))?3:0)+(chosenArtists.some(name=>clean(t.artist).includes(name))?5:0)+(favoriteTrackIds.includes(t.id)?6:0);
 const stable=(list,key)=>[...list].sort((a,b)=>affinity(b)-affinity(a)||hash(uid+day+key+a.id)-hash(uid+day+key+b.id));
 const diverse=list=>{const result=[],counts=new Map();for(const t of list){const artist=clean(t.artist)||t.id;if((counts.get(artist)||0)>=3)continue;counts.set(artist,(counts.get(artist)||0)+1);result.push(t);if(result.length===24)break;}return result;};
 const mixes=[];
 const add=(id,title,subtitle,palette,list)=>{const chosen=diverse(list);if(chosen.length)mixes.push({id,title,subtitle,palette,tracks:chosen,artists:[...new Set(chosen.map(t=>t.artist||t.uploader_name).filter(Boolean))].slice(0,4).join(', ')});};
 add('fresh',preferred.length?'New Finds':'Fresh on PUBLIC',preferred.length?'New discoveries shaped by your listening and genre picks.':'Start exploring. Your mixes grow with your listening.',['#ff326b','#b4ff46','#3e18ba'],stable(tracks.filter(t=>!heard.has(t.id)&&!savedIds.has(t.id)),'fresh'));
 add('rotation','Back in the Mix','Recent plays and songs you saved.',['#ff1800','#ff7900','#edff00'],[...new Map([...played,...stable(tracks.filter(t=>savedIds.has(t.id)),'rotation')].map(t=>[t.id,t])).values()]);
 const essentials=tracks.filter(t=>savedIds.has(t.id));
 add('essentials','Your Essentials','A selection from your saved music.',['#5030ff','#40f5dc','#ed71ff'],stable(essentials,'essentials'));
 const energetic=['dance','electronic','afrobeats','reggaeton','latin','trap','hip-hop','hip hop','funk'];
 add('energy','Turn It Up','An upbeat selection, with your tastes first.',['#eaff36','#00d999','#064c75'],stable(tracks.filter(t=>genreMatch(t,energetic)),'energy'));
 const mellow=['ambient','jazz','classical','r&b','soul','indie','lo-fi','lofi','acoustic'];
 add('chill','Slow Down','Softer genres for a change of pace.',['#000000','#ffffff','#303030'],stable(tracks.filter(t=>genreMatch(t,mellow)),'chill'));
 return mixes;
}
