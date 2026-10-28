// Design-only profiles. These are never User/PublicProfile records or social activity.
export const COMMUNITY_PREVIEWS=[
 {id:'nova',name:'NOVA FM',handle:'novafm',bio:'Late-night R&B. One more song before sleep.',avatar:'pink-blue',banner:'neon-rain',colors:['#4a184c','#c44a91','#ee9e7b'],genres:['R&B','Soul','Neo-Soul'],artists:['Snoh Aalegra','Jhené Aiko','Frank Ocean','SZA']},
 {id:'sol',name:'SOL AFTERHOURS',handle:'solafterhours',bio:'Warm nights, open windows, music all the way home.',avatar:'desert-palms',banner:'sunset-coast-drive',colors:['#b64720','#e9b449','#237b68'],genres:['Afrobeats','Latin','Reggaeton','Urbano'],artists:['Beéle','Wizkid','Tems','Bad Bunny']},
 {id:'juno',name:'JUNO VHS',handle:'junovhs',bio:'Old favorites. New obsessions. Always on rotation.',avatar:'chromakopia',banner:'pixel-boxing',colors:['#193a84','#c93d4f','#8356ab'],genres:['Hip-Hop','Rap','Alternative Hip-Hop'],artists:['Kanye West','Kendrick Lamar','Tyler, The Creator']},
 {id:'luna',name:'LUNA FREQUENCY',handle:'lunafrequency',bio:'A little dreamy. A little somewhere else.',avatar:'flame-princess',banner:'kirby-star-ride',colors:['#293c66','#7e70b9','#78b6ac'],genres:['Indie','Ambient','Alternative','Dream Pop'],artists:['Weston Estate','Florence + The Machine','kid apollo','svn4vr']},
 {id:'kai',name:'KAÏ CHROME',handle:'kaichrome',bio:'Basslines for the last train and the first light.',avatar:'blue-code',banner:'neon-code',colors:['#084842','#2aa38a','#4052a4'],genres:['House','Electronic','Techno','Drum & Bass','Dance'],artists:['3AM','BUNT.','La Roux']}
];
export function buildCommunityPreviews(catalog,{blocked=new Set(),showExplicit=true}={}){
 const allowed=catalog.filter(t=>t.id&&t.is_published===true&&t.approval_status==='approved'&&t.audio_url&&!blocked.has(t.uploader_id)&&(showExplicit||!t.explicit));
 const used=new Set();
 return COMMUNITY_PREVIEWS.map(profile=>{
  const score=t=>(profile.genres.includes(t.genre)?10:0)+(profile.artists.some(a=>String(t.artist||'').toLowerCase().includes(a.toLowerCase()))?20:0);
  const ranked=[...allowed].sort((a,b)=>score(b)-score(a)||(Number(b.play_count)||0)-(Number(a.play_count)||0)||String(a.id).localeCompare(String(b.id)));
  const seen=new Set(),songs=[];
  for(const track of ranked.filter(t=>!used.has(t.id)).concat(ranked)){
   if(seen.has(track.id))continue;seen.add(track.id);used.add(track.id);songs.push(track);if(songs.length===8)break;
  }
  return {...profile,songs,featured:songs[0]||null};
 });
}
