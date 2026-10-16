import WeatherMusic from '@/components/WeatherMusic';
import {useCallback,useEffect,useRef,useState} from 'react';
import {Sun,Moon,CloudSun,CloudMoon,Cloud,CloudFog,CloudDrizzle,CloudRain,CloudSnow,CloudLightning,MapPin,Search,Loader2} from 'lucide-react';
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
  <DialogTrigger asChild><button type="button" className="home-weather-chip" aria-label={label} title={label}>{loading&&!weather?<Loader2 size={20} className="animate-spin"/>:<Icon size={21} strokeWidth={1.6}/>}<span>{weather?weatherTemperature(weather.temperature,unit):'Weather'}</span></button></DialogTrigger>
  {open&&<DialogContent className="home-weather-dialog weather-experience" data-public-dialog>
   <WeatherMusic weather={weather} city={city} unit={unit} loading={loading} error={error} onRefresh={()=>refresh(true)} onUnitChange={value=>setPreferences(previous=>({...previous,unit:value}))}>
   <section className="space-y-3"><h3 className="text-sm font-semibold">{city?'Change city':'Choose your city'}</h3><p className="text-xs text-muted-foreground leading-relaxed">City searches and weather are provided by Open-Meteo. Your chosen city stays on this device and isn’t added to your PUBLIC profile.</p>
    <form onSubmit={search} className="home-weather-search"><input aria-label="Search weather cities" value={query} maxLength={100} placeholder="City or postal code" onChange={event=>{searchRequest.current++;searchController.current?.abort();setSearching(false);setQuery(event.target.value);setResults(null);setSearchError('');}}/><button type="submit" aria-label="Search cities" disabled={searching||query.trim().length<2}>{searching?<Loader2 size={18} className="animate-spin"/>:<Search size={18}/>}</button></form>
    {searchError&&<p role="alert" className="text-sm text-destructive">{searchError}</p>}
    {results&&<div className="home-weather-results">{results.length?results.map(place=><button type="button" key={place.id} onClick={()=>{setWeather(null);setPreferences(previous=>({...previous,city:place}));}}><MapPin size={16}/><span>{place.label}</span></button>):<p className="text-sm text-muted-foreground p-3">No cities found. Try adding a state or country.</p>}</div>}
   </section>
   <footer className="home-weather-footer"><a href="https://open-meteo.com/" target="_blank" rel="noreferrer">Weather by Open-Meteo</a><a href="https://www.geonames.org/" target="_blank" rel="noreferrer">City data: GeoNames</a>{city&&<button type="button" onClick={clearCity}>Remove city</button>}</footer>
   </WeatherMusic>
  </DialogContent>}
 </Dialog>;
}
export default function HomeWeather(){const {user}=useAuth();const owner=user?.id||'guest';return <WeatherIndicator key={owner} owner={owner}/>;}
