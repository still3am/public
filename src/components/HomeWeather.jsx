import WeatherMusic from '@/components/WeatherMusic';
import {useCallback,useEffect,useRef,useState} from 'react';
import {Sun,Moon,CloudSun,CloudMoon,Cloud,CloudFog,CloudDrizzle,CloudRain,CloudSnow,CloudLightning,MapPin,Search,Loader2,Check,X} from 'lucide-react';
import {Dialog,DialogTrigger,DialogContent} from '@/components/ui/dialog';
import {useAuth} from '@/lib/AuthContext';
import {fetchWeather,searchWeatherCities,normalizeWeatherCity,weatherCondition,weatherTemperature,WEATHER_TTL} from '@/lib/weather';
const icons={sun:Sun,moon:Moon,partly:CloudSun,'night-cloud':CloudMoon,cloud:Cloud,fog:CloudFog,drizzle:CloudDrizzle,rain:CloudRain,snow:CloudSnow,storm:CloudLightning};
function defaults(){return {city:null,unit:typeof navigator!=='undefined'&&/-(US|BS|BZ|KY|PW|FM|MH)$/i.test(navigator.language||'')?'F':'C'};}
function readPreferences(key){try{const value=JSON.parse(localStorage.getItem(key)||'null');return {city:normalizeWeatherCity(value?.city),unit:['F','C'].includes(value?.unit)?value.unit:defaults().unit};}catch{return defaults();}}
function WeatherIndicator({owner}){
 const storageKey='public:weather:'+owner;
 const [preferences,setPreferences]=useState(()=>readPreferences(storageKey));
 const city=preferences.city,unit=preferences.unit;
 const [open,setOpen]=useState(false),[weather,setWeather]=useState(null),[loading,setLoading]=useState(false),[error,setError]=useState('');
 const [query,setQuery]=useState(''),[results,setResults]=useState(null),[searching,setSearching]=useState(false),[searchError,setSearchError]=useState('');
 const request=useRef(0),controller=useRef(null),searchRequest=useRef(0),searchController=useRef(null);
 useEffect(()=>{try{localStorage.setItem(storageKey,JSON.stringify(preferences));}catch{}},[storageKey,preferences]);
 const refresh=useCallback(async(fresh=false)=>{
  if(!city)return;
  const version=++request.current;controller.current?.abort();const abort=new AbortController();controller.current=abort;
  setLoading(true);setError('');
  try{const next=await fetchWeather(city,{signal:abort.signal,fresh});if(version===request.current)setWeather(next);}
  catch(e){if(!abort.signal.aborted&&version===request.current)setError(e.message||'Weather could not refresh. Please retry.');}
  finally{if(version===request.current)setLoading(false);}
 },[city]);
 useEffect(()=>{
  setWeather(null);setError('');
  if(!city){setLoading(false);return;}
  refresh();
  const update=()=>{if(!document.hidden)refresh();};
  const timer=setInterval(update,WEATHER_TTL);window.addEventListener('focus',update);document.addEventListener('visibilitychange',update);
  return()=>{request.current++;controller.current?.abort();clearInterval(timer);window.removeEventListener('focus',update);document.removeEventListener('visibilitychange',update);};
 },[city,refresh]);
 useEffect(()=>()=>{request.current++;controller.current?.abort();searchRequest.current++;searchController.current?.abort();},[]);
 useEffect(()=>{
  const clear=()=>{request.current++;controller.current?.abort();searchRequest.current++;searchController.current?.abort();setPreferences(defaults());setWeather(null);setError('');setQuery('');setResults(null);setOpen(false);};
  window.addEventListener('account:cleared',clear);return()=>window.removeEventListener('account:cleared',clear);
 },[]);
 async function search(event){
  event.preventDefault();if(query.trim().length<2){setSearchError('Enter at least two letters of a city name.');return;}
  const version=++searchRequest.current;searchController.current?.abort();const abort=new AbortController();searchController.current=abort;
  setSearching(true);setSearchError('');setResults(null);
  try{const places=await searchWeatherCities(query,abort.signal);if(version===searchRequest.current)setResults(places);}
  catch(e){if(!abort.signal.aborted&&version===searchRequest.current)setSearchError(e.message||'Cities could not load. Please retry.');}
  finally{if(version===searchRequest.current)setSearching(false);}
 }
 const condition=weather?weatherCondition(weather.code,weather.isDay):null,Icon=condition?icons[condition.icon]:CloudSun;
 const label=weather?`${city?.label}: ${condition.label}, ${weatherTemperature(weather.temperature,unit)}${error?', last update':''}`:city?(loading?'Loading weather for '+city.label:'Weather unavailable for '+city.label):'Choose a city for local weather';
 function clearCity(){request.current++;controller.current?.abort();setPreferences(previous=>({...previous,city:null}));setWeather(null);setLoading(false);setError('');}
 return <Dialog open={open} onOpenChange={setOpen}>
  <DialogTrigger asChild><button type="button" className="home-weather-chip" aria-label={label} title={label}>{loading&&!weather?<Loader2 size={20} className="animate-spin"/>:<Icon size={21} strokeWidth={1.6}/>}<span className={weather?'home-weather-reading':'home-weather-placeholder'}>{weather?weatherTemperature(weather.temperature,unit):'Weather'}</span></button></DialogTrigger>
  {open&&<DialogContent className="home-weather-dialog weather-experience" data-public-dialog>
   <WeatherMusic weather={weather} city={city} unit={unit} loading={loading} error={error} onRefresh={()=>refresh(true)} onUnitChange={value=>setPreferences(previous=>({...previous,unit:value}))}>
   <section className="atmosphere-city-picker">
    <div className="atmosphere-picker-heading"><h3>{city?'Find another city':'Find your city'}</h3><p>A local soundtrack starts with a place.</p></div>
    {city && <div className="atmosphere-selected-city"><MapPin size={19}/><div><span>CURRENT CITY</span><strong>{city.label.split(',')[0]}</strong><small>{city.label.split(',').slice(1).join(',').trim()}</small></div><Check size={18}/></div>}
    <form onSubmit={search} className="home-weather-search atmosphere-city-search"><Search size={18} aria-hidden="true"/><input aria-label="Search weather cities" value={query} maxLength={100} placeholder="City or postal code" enterKeyHint="search" autoComplete="off" onChange={event=>{searchRequest.current++;searchController.current?.abort();setSearching(false);setQuery(event.target.value);setResults(null);setSearchError('');}}/>{query&&<button type="button" className="atmosphere-search-clear" aria-label="Clear city search" onClick={()=>{searchRequest.current++;searchController.current?.abort();setQuery('');setResults(null);setSearching(false);setSearchError('');}}><X size={16}/></button>}<button type="submit" aria-label="Search cities" disabled={searching||query.trim().length<2}>{searching?<Loader2 size={18} className="animate-spin"/>:<span>Find</span>}</button></form>
    {searching&&<p className="atmosphere-city-feedback" role="status">Finding cities…</p>}
    {searchError&&<p role="alert" className="atmosphere-city-feedback">{searchError}</p>}
    {results&&<div className="atmosphere-city-results"><p className="atmosphere-results-label">{results.length?'CHOOSE A CITY':'NO CITIES FOUND'}</p>{results.length?results.map(place=><button type="button" key={place.id} aria-pressed={city?.id===place.id} onClick={()=>{searchRequest.current++;searchController.current?.abort();if(city?.id!==place.id){setWeather(null);setPreferences(previous=>({...previous,city:place}));}setQuery('');setResults(null);setSearchError('');}}><span className="atmosphere-result-icon"><MapPin size={18}/></span><span><strong>{place.label.split(',')[0]}</strong><small>{place.label.split(',').slice(1).join(',').trim()}</small></span>{city?.id===place.id&&<Check size={18}/>}</button>):<p className="atmosphere-city-feedback">Try a city name with a state or country.</p>}</div>}
    <div className="atmosphere-location-note">Saved on this device. Never shown on your profile.</div>
    <details className="atmosphere-data-details"><summary>Weather &amp; city data</summary><p>Searches and weather are provided by <a href="https://open-meteo.com/" target="_blank" rel="noreferrer">Open-Meteo</a>. City data by <a href="https://www.geonames.org/" target="_blank" rel="noreferrer">GeoNames</a>.</p></details>
    {city&&<button type="button" className="atmosphere-remove-city" onClick={()=>{searchRequest.current++;searchController.current?.abort();setQuery('');setResults(null);setSearching(false);setSearchError('');clearCity();}}>Remove saved city</button>}
   </section>
   </WeatherMusic>
  </DialogContent>}
 </Dialog>;
}
export default function HomeWeather(){const {user}=useAuth();const owner=user?.id||'guest';return <WeatherIndicator key={owner} owner={owner}/>;}
