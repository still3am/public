// Open-Meteo open-access is for non-commercial use. A commercial launch needs
// an appropriately licensed endpoint/provider. No device geolocation is accessed.
const cache=new Map();
export const WEATHER_TTL=15*60*1000;
export function normalizeWeatherCity(value){
 if(!value||typeof value.id!=='number'||!Number.isFinite(value.id)||typeof value.latitude!=='number'||typeof value.longitude!=='number'||!Number.isFinite(value.latitude)||!Number.isFinite(value.longitude)||Math.abs(value.latitude)>90||Math.abs(value.longitude)>180||typeof value.label!=='string')return null;
 return {id:value.id,latitude:Math.round(value.latitude*100)/100,longitude:Math.round(value.longitude*100)/100,label:value.label.slice(0,120)};
}
async function json(url,signal){
 const controller=new AbortController(),abort=()=>controller.abort();
 if(signal?.aborted)controller.abort();else signal?.addEventListener('abort',abort,{once:true});
 const timer=setTimeout(abort,12000);
 try{const response=await fetch(url,{signal:controller.signal,credentials:'omit',referrerPolicy:'no-referrer'});if(!response.ok)throw Error('Weather is unavailable right now. Please retry.');const data=await response.json();if(data?.error)throw Error('Weather is unavailable right now. Please retry.');return data;}
 catch(error){if(error?.name==='AbortError'&&!signal?.aborted)throw Error('Weather took too long to respond. Please retry.');throw error;}
 finally{clearTimeout(timer);signal?.removeEventListener('abort',abort);}
}
export async function fetchWeather(city,{signal,fresh=false}={}){
 const point=normalizeWeatherCity(city);if(!point)throw Error('Choose a city to see its weather.');
 const key=point.id,previous=cache.get(key);
 if(!fresh&&previous&&Date.now()-previous.fetchedAt<WEATHER_TTL)return previous;
 const params=new URLSearchParams({latitude:String(point.latitude),longitude:String(point.longitude),current:'temperature_2m,apparent_temperature,weather_code,is_day',timezone:'auto',timeformat:'unixtime',forecast_days:'1'});
 const data=await json('https://api.open-meteo.com/v1/forecast?'+params,signal),current=data?.current;
 if(!current||!Number.isFinite(current.temperature_2m)||!Number.isFinite(current.weather_code)||!Number.isFinite(current.time)||![0,1].includes(current.is_day))throw Error('Weather data could not be read. Please retry.');
 const weather={temperature:current.temperature_2m,feelsLike:Number.isFinite(current.apparent_temperature)?current.apparent_temperature:null,code:current.weather_code,isDay:current.is_day===1,observedAt:current.time*1000,fetchedAt:Date.now()};
 if(Math.abs(Date.now()-weather.observedAt)>3*60*60*1000)throw Error('Fresh weather is unavailable. Please retry later.');
 if(signal?.aborted)throw new DOMException('Aborted','AbortError');
 cache.set(key,weather);if(cache.size>30)cache.delete(cache.keys().next().value);return weather;
}
export async function searchWeatherCities(query,signal){
 const name=query.trim();if(name.length<2)return [];
 const params=new URLSearchParams({name:name.slice(0,100),count:'6',language:'en',format:'json'});
 const data=await json('https://geocoding-api.open-meteo.com/v1/search?'+params,signal);
 if(data.results!==undefined&&!Array.isArray(data.results))throw Error('Cities could not load. Please retry.');
 return (data.results||[]).map(city=>normalizeWeatherCity({id:city.id,latitude:city.latitude,longitude:city.longitude,label:[city.name,city.admin1,city.country].filter(Boolean).filter((v,i,a)=>a.indexOf(v)===i).join(', ')})).filter(Boolean);
}
export function weatherCondition(code,isDay=true){
 if(code===0)return {label:isDay?'Clear skies':'Clear night',icon:isDay?'sun':'moon'};
 if(code===1||code===2)return {label:'Partly cloudy',icon:isDay?'partly':'night-cloud'};
 if(code===3)return {label:'Cloudy',icon:'cloud'};
 if(code===45||code===48)return {label:'Foggy',icon:'fog'};
 if([51,53,55,56,57].includes(code))return {label:'Drizzle',icon:'drizzle'};
 if([61,63,65,66,67,80,81,82].includes(code))return {label:'Rain',icon:'rain'};
 if([71,73,75,77,85,86].includes(code))return {label:'Snow',icon:'snow'};
 if([95,96,99].includes(code))return {label:'Thunderstorms',icon:'storm'};
 return {label:'Current conditions',icon:'cloud'};
}
export function weatherTemperature(value,unit='F'){return Number.isFinite(value)?Math.round(unit==='F'?value*9/5+32:value)+'°'+unit:'—';}
