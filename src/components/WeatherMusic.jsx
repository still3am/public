import { useEffect, useMemo, useRef, useState } from 'react';
import { ChevronLeft, MapPin, RefreshCw, Play, Pause, Shuffle, Music2, Loader2 } from 'lucide-react';
import { DialogClose, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { usePlayer } from '@/context/PlayerContext';
import { getPublishedTracks } from '@/lib/catalogCache';
import { weatherAtmosphere, selectWeatherTracks } from '@/lib/weatherMusic';
import { weatherCondition, weatherTemperature } from '@/lib/weather';
import { useCoverUrl } from '@/hooks/useCoverUrl';
import TrackRow from '@/components/TrackRow';
import WeatherScene from '@/components/WeatherScene';
import { reportActionError } from '@/lib/actionError';
import './weather-music.css';
export default function WeatherMusic({ weather, city, unit, loading, error, onRefresh, onUnitChange, children }) {
  const player = usePlayer(),[catalog, setCatalog] = useState([]),[musicLoading, setMusicLoading] = useState(false),[musicError, setMusicError] = useState(false),[retry, setRetry] = useState(0),[configuring, setConfiguring] = useState(!city);
  const [starting, setStarting] = useState(false),[artFailed, setArtFailed] = useState(false),lock = useRef(false),scroll = useRef(null);
  const atmosphere = weatherAtmosphere(weather);
  useEffect(() => {setConfiguring(!city);}, [city?.id]);
  useEffect(() => {if (configuring) scroll.current?.scrollTo({ top: 0, behavior: 'instant' });}, [configuring]);
  useEffect(() => {
    if (!city || !weather) return;
    let active = true;setMusicLoading(true);setMusicError(false);
    getPublishedTracks().then((rows) => {if (active) setCatalog(rows);}).catch(() => {if (active) setMusicError(true);}).finally(() => {if (active) setMusicLoading(false);});
    const changed = () => setRetry((value) => value + 1);window.addEventListener('catalog:invalidate', changed);
    return () => {active = false;window.removeEventListener('catalog:invalidate', changed);};
  }, [city?.id, !!weather, retry]);
  const tracks = useMemo(() => weather && city ? selectWeatherTracks(catalog, weather, city.id) : [], [catalog, weather, city]);
  const featured = tracks[0],cover = useCoverUrl(featured?.cover_art_url),condition = weather ? weatherCondition(weather.code, weather.isDay) : null;
  useEffect(() => setArtFailed(false), [cover]);
  const playing = player.isPlaying && tracks.some((track) => track.id === player.currentTrack?.id);
  const toggleSettings = () => setConfiguring((value) => city ? !value : true);
  async function play(shuffle = false) {
    if (lock.current || !tracks.length) return;lock.current = true;setStarting(true);
    try {
      if (!shuffle && playing) {player.togglePlay();return;}
      if (!shuffle && tracks.some((track) => track.id === player.currentTrack?.id)) {player.togglePlay();return;}
      const queue = [...tracks];if (shuffle) for (let i = queue.length - 1; i > 0; i--) {const j = Math.floor(Math.random() * (i + 1));[queue[i], queue[j]] = [queue[j], queue[i]];}
      player.setShuffle(false);await player.playTrackAt(queue, 0);
    } catch (e) {reportActionError(e, 'This atmosphere could not start. Please retry.');} finally
    {lock.current = false;setStarting(false);}
  }
  async function playFeatured() {
    if (lock.current || !featured) return;lock.current = true;setStarting(true);
    try {if (player.currentTrack?.id === featured.id) player.togglePlay();else {player.setShuffle(false);await player.playTrackAt(tracks, 0);}}
    catch (e) {reportActionError(e, 'This song could not start. Please retry.');} finally
    {lock.current = false;setStarting(false);}
  }
  return <div className="atmos-shell">
  <WeatherScene scene={atmosphere.scene} brand={configuring || !city} />
  <header className="atmos-bar">
   <DialogClose asChild><button type="button" className="atmos-bar-button" data-navigation-circle="" aria-label={configuring && city ? 'Back to music' : 'Back to Home'} onClick={event => {if (configuring && city) {event.preventDefault();setConfiguring(false);}}}><ChevronLeft size={22} /></button></DialogClose>
   <div className="atmos-bar-title"><DialogTitle>{configuring ? 'YOUR ATMOSPHERE' : 'PUBLIC ATMOSPHERES'}</DialogTitle></div>
   <button type="button" className="atmos-bar-button" aria-label="Change weather city" aria-expanded={configuring} onClick={toggleSettings}><MapPin size={18} /></button>
   <DialogDescription className="sr-only">A flowing gradient and a soundtrack for your chosen city.</DialogDescription>
  </header>

  <div className="atmos-scroll" ref={scroll}>
   {configuring ?
   <section className="atmos-settings">{children}
    <div className="weather-music-preferences"><span>Temperature</span><div role="group" aria-label="Temperature units">{['F', 'C'].map((value) => <button key={value} type="button" aria-pressed={unit === value} onClick={() => onUnitChange(value)}>°{value}</button>)}</div></div>
    {city && <button type="button" className="weather-music-done" onClick={() => setConfiguring(false)}>Back to the music</button>}
   </section> :
   <>
   <div className="atmos-grid">
    <div className="atmos-weather" aria-busy={loading}>
     <button type="button" className="atmos-city" onClick={toggleSettings}><MapPin size={12} />{city ? city.label.split(',')[0] : 'Your city'}</button>
     {weather ?
      <div className="atmos-read"><strong className="atmos-temp">{weatherTemperature(weather.temperature, unit).replace(/[FC]$/, '')}<sup>°{unit}</sup></strong><span className="atmos-condition">{condition.label}</span></div> :
      <p className="atmos-unset">{loading ? 'Finding the atmosphere…' : 'Choose a city. Find your soundtrack.'}</p>}
    </div>

    <div className="atmos-title"><p>THE SOUND OF RIGHT NOW</p><h2>{atmosphere.title}</h2><span>{atmosphere.subtitle}</span></div>

    {featured && <>
     <div className="atmos-art">{cover && !artFailed ? <img src={cover} alt={featured.title + ' artwork'} onError={() => setArtFailed(true)} /> : <div className="atmos-art-placeholder"><Music2 size={64} /></div>}<div className="atmos-art-shade" /><div className="atmos-featured"><div><p>IN THIS ATMOSPHERE</p><h3>{featured.title}</h3><span>{featured.artist || featured.uploader_name}</span></div><button type="button" disabled={starting} onClick={playFeatured} aria-label={player.currentTrack?.id === featured.id && player.isPlaying ? 'Pause ' + featured.title : 'Play ' + featured.title}>{player.currentTrack?.id === featured.id && player.isPlaying ? <Pause size={24} fill="currentColor" /> : <Play size={24} fill="currentColor" />}</button></div></div>
     <div className="atmos-transport"><button type="button" className="atmos-play" disabled={starting} onClick={() => play()}>{starting ? <Loader2 size={18} className="animate-spin" /> : playing ? <Pause size={18} fill="currentColor" /> : <Play size={18} fill="currentColor" />}{playing ? 'Pause atmosphere' : 'Play atmosphere'}</button><button type="button" className="atmos-shuffle" aria-label="Shuffle this atmosphere" disabled={starting} onClick={() => play(true)}><Shuffle size={20} /></button></div>
    </>}

    <div className="atmos-list">
     {musicLoading && !tracks.length ?
      <div className="weather-music-loading"><Loader2 size={24} className="animate-spin" /><p>Finding the music…</p></div> :
      featured ? <><h3>Soundtrack<span>{tracks.length} {tracks.length === 1 ? 'song' : 'songs'}</span></h3>{tracks.map((track, index) => <TrackRow key={track.id} track={track} index={index} queue={tracks} queueIndex={index} />)}</> :
      !musicError && <div className="weather-music-notice">No playable songs are available for this atmosphere yet.</div>}
     {musicError && <div className="weather-music-notice" role="alert">Music could not refresh. <button onClick={() => setRetry((value) => value + 1)}>Retry music</button></div>}
    </div>
   </div>

   {error && <div className="weather-music-notice" role="alert">{error} <button disabled={loading} onClick={onRefresh}>Retry weather</button></div>}

   <footer className="weather-music-status">{weather && <span>{error ? 'Last update' : 'Weather updated'} {new Date(weather.observedAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}</span>}{city && <button type="button" disabled={loading} onClick={onRefresh}><RefreshCw size={12} className={loading ? 'animate-spin' : ''} />Refresh weather</button>}</footer>
   </>}
  </div>
 </div>;
}