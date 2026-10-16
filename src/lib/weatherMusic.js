export function weatherAtmosphere(weather){
 if(!weather)return {scene:'ambient',title:'Find your atmosphere',subtitle:'A place, a sky, a soundtrack.',genres:[]};
 const code=weather.code,night=!weather.isDay;
 if([95,96,99].includes(code))return {scene:'storm',title:'Storm sessions',subtitle:'A little more energy for a dramatic sky.',genres:['electronic','rock','hip-hop','hip hop','trap','dance']};
 if([71,73,75,77,85,86].includes(code))return {scene:'snow',title:'Slow the world',subtitle:'A softer soundtrack for falling snow.',genres:['ambient','indie','jazz','classical','r&b','soul']};
 if([51,53,55,56,57,61,63,65,66,67,80,81,82].includes(code))return {scene:night?'rain-night':'rain',title:'Rain on repeat',subtitle:'Settle into something warm while the rain moves.',genres:['r&b','soul','jazz','indie','alternative','ambient']};
 if([45,48].includes(code))return {scene:'fog',title:'Lost in the sound',subtitle:'Room to drift, one song at a time.',genres:['ambient','alternative','indie','r&b','jazz']};
 if(night)return {scene:code>=1?'cloud-night':'night',title:'After the daylight',subtitle:'Let the night find its rhythm.',genres:['r&b','soul','jazz','indie','alternative','hip-hop']};
 if([2,3].includes(code))return {scene:'cloud',title:'Under a softer sky',subtitle:'Easy listening for a little cloud cover.',genres:['indie','r&b','soul','alternative','pop','jazz']};
 return {scene:'sun',title:'Let the light in',subtitle:'A brighter soundtrack for right now.',genres:['pop','dance','afrobeats','latin','reggaeton','electronic','funk']};
}
const hash=text=>[...String(text)].reduce((n,c)=>(Math.imul(n,31)+c.charCodeAt(0))>>>0,0);
export function selectWeatherTracks(catalog,weather,cityId,limit=12){
 const atmosphere=weatherAtmosphere(weather),day=Math.floor(Date.now()/86400000),seen=new Set();
 return (Array.isArray(catalog)?catalog:[]).filter(track=>track?.id&&track.is_published===true&&(track.audio_url||track._private_audio)&&!seen.has(track.id)&&seen.add(track.id)).map(track=>{
  const genre=String(track.genre||'').toLowerCase();
  const match=atmosphere.genres.some(g=>genre.includes(g));
  return {track,match,order:hash(cityId+':'+day+':'+atmosphere.scene+':'+track.id)};
 }).sort((a,b)=>Number(b.match)-Number(a.match)||a.order-b.order).slice(0,limit).map(row=>row.track);
}
