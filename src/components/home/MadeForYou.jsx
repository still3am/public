import ScrollShelf from '@/components/ScrollShelf';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Play, Pause, Shuffle, Plus, Check, Loader2, ChevronLeft } from 'lucide-react';
import { useAuth } from '@/lib/AuthContext';
import { useLibrary } from '@/context/LibraryContext';
import { usePlayer } from '@/context/PlayerContext';
import { useSafety } from '@/context/SafetyContext';
import { base44 } from '@/api/base44Client';
import { getRecentPlays } from '@/lib/recentPlays';
import { buildPersonalMixes } from '@/lib/personalMixes';
import { reportActionError } from '@/lib/actionError';
import MotionGradient from '@/components/MotionGradient';
import TrackRow from '@/components/TrackRow';
import Logo from '@/components/Logo';
import './home-personal.css';

export function MixArt({ mix, className = '', children = null }) {
  return <div className={'personal-mix-art ' + className}><MotionGradient colors={mix.palette} speed={.9} pauseWhenCovered className="personal-mix-gradient" /><span className="personal-mix-brand"><Logo width="72px" className="personal-mix-logo" /></span><strong>{mix.artTitle || mix.title}</strong><span className="personal-mix-artists">{mix.artists}</span>{children}</div>;
}
export function PersonalMixContent({ mix, uid, onBack, headerExtra = null }) {
  const p = usePlayer(),{ blocked } = useSafety(),[busy, setBusy] = useState(false),[saving, setSaving] = useState(false),[saved, setSaved] = useState(null),[saveError, setSaveError] = useState('');
  const lock = useRef(false),saveLock = useRef(false),alive = useRef(true);
  useEffect(() => {alive.current = true;return () => {alive.current = false;};}, []);
  const tracks = mix.tracks.filter((t) => !blocked.has(t.uploader_id));
  const playing = p.isPlaying && tracks.some((t) => t.id === p.currentTrack?.id);
  async function play(shuffle = false) {
    if (lock.current || !tracks.length) return;lock.current = true;setBusy(true);
    try {if (!shuffle && tracks.some((t) => t.id === p.currentTrack?.id)) {p.togglePlay();return;}const queue = [...tracks];if (shuffle) for (let i = queue.length - 1; i > 0; i--) {const j = Math.floor(Math.random() * (i + 1));[queue[i], queue[j]] = [queue[j], queue[i]];}p.setShuffle(false);await p.playTrackAt(queue, 0);}
    catch (e) {reportActionError(e, 'This mix could not start. Please retry.');} finally {lock.current = false;if (alive.current) setBusy(false);}
  }
  async function save() {
    if (!uid || saveLock.current || saved || !tracks.length) return;saveLock.current = true;setSaving(true);setSaveError('');
    try {const playlist = await base44.entities.Playlist.create({ name: mix.title, description: mix.subtitle + (mix.kind === 'recap' ? ' Saved from your PUBLIC Recap.' : ' Saved from Made for You on PUBLIC.'), creator_id: uid, is_public: false, track_ids: tracks.map((t) => t.id), cover_art_url: '' });if (!playlist?.id) throw Error('Save not confirmed');window.dispatchEvent(new Event('playlists:changed'));if (alive.current) setSaved(playlist.id);}
    catch {if (alive.current) setSaveError('This mix could not save. Please retry.');} finally {saveLock.current = false;if (alive.current) setSaving(false);}
  }
  return <div className="release-page personal-mix-page personal-mix-immersive rounded-lg" style={{ '--mix-tint': mix.palette[2] }}>
  <div className="personal-mix-atmosphere" aria-hidden="true"><MotionGradient colors={mix.palette} speed={1.05} pauseWhenCovered className="personal-mix-page-gradient" /></div>
  <div className="release-toolbar"><button type="button" className="release-round" aria-label="Back to Home" onClick={onBack}><ChevronLeft size={22} /></button><span className="personal-mix-toolbar-brand"><Logo width="72px" className="personal-mix-logo" /></span></div>
  <section className="release-header release-header-full">
   <div className="personal-mix-open-art" aria-hidden="true" />
   <h1>{mix.title}</h1><p className="release-artist personal-mix-curator">{mix.kind === 'recap' ? 'Your music tells a story.' : 'A little more you.'}</p>
   {headerExtra}
   <div className="release-play-controls"><button type="button" className="release-play-button" disabled={busy || !tracks.length} onClick={() => play()}>{busy ? <Loader2 size={21} className="animate-spin" /> : playing ? <Pause size={21} fill="currentColor" /> : <Play size={21} fill="currentColor" />}{playing ? 'Pause' : 'Play'}</button><button type="button" className="release-add-button" aria-label="Shuffle mix" disabled={busy || !tracks.length} onClick={() => play(true)}><Shuffle size={22} /></button>{uid && <button type="button" className="release-add-button" disabled={saving || !!saved || !tracks.length} aria-label={saved ? 'Playlist saved' : 'Save playlist'} title={saved ? 'Playlist saved' : 'Save playlist'} onClick={save}>{saving ? <Loader2 size={22} className="animate-spin" /> : saved ? <Check size={24} /> : <Plus size={24} />}</button>}</div>
  </section>
  <div className="personal-mix-page-body">
   <p className="personal-mix-page-description text-left">{mix.subtitle}</p>
   {mix.recap && <div className="recap-summary"><div><strong>{mix.recap.plays.toLocaleString()}</strong><span>plays</span></div><div><strong>{mix.recap.unique.toLocaleString()}</strong><span>different songs</span></div><div><strong>{Math.floor(mix.recap.seconds / 60).toLocaleString()}</strong><span>recorded minutes</span></div></div>}
   {saveError && <p role="alert" className="personal-mix-note">{saveError}</p>}
   {saved && <Link className="personal-mix-saved-link" to={'/playlist/' + encodeURIComponent(saved)}>Open saved playlist</Link>}
   <section className="release-song-list" aria-label="Songs in this mix">{tracks.map((track, index) => <TrackRow key={track.id} track={track} index={index} queue={tracks} queueIndex={index} />)}</section>
   <p className="release-credits">{mix.kind === 'recap' ? 'Ranked by your listening on PUBLIC. Older plays may not include listening time. Saving keeps a private copy of this song selection.' : 'Mixes refresh with your tastes. Saving keeps a private copy of this song selection.'}</p>
  </div>
 </div>;
}
export default function MadeForYou({ catalog, genres, taste }) {
  const { user } = useAuth(),{ ids } = useLibrary(),{ blocked } = useSafety(),[recent, setRecent] = useState(() => getRecentPlays());
  useEffect(() => {const update = () => setRecent(getRecentPlays());window.addEventListener('recentplays:change', update);return () => window.removeEventListener('recentplays:change', update);}, []);
  const mixes = useMemo(() => buildPersonalMixes(catalog.filter((t) => !blocked.has(t.uploader_id)), { recent, savedIds: ids, genres, favoriteTrackIds: taste?.favorite_track_ids || [], favoriteArtists: taste?.favorite_artists || [], uid: user?.id || '' }), [catalog, recent, ids, genres, taste, user?.id, blocked]);
  if (!user?.id) return null;
  return <section className="home-section home-personal-section"><div className="personal-section-heading"><h2>Made for You</h2><span>Your music, remixed</span></div>{mixes.length ? <ScrollShelf label="Made for you" className="personal-mix-shelf">{mixes.map((mix) => <Link key={mix.id} className="personal-mix-card" to={'/mix/' + mix.id} state={{ owner: user.id, mixId: mix.id, trackIds: mix.tracks.map((t) => t.id) }} aria-label={'Open ' + mix.title + ' mix'}><MixArt mix={mix} /></Link>)}</ScrollShelf> : <p className="personal-mix-note">Save a few songs or choose genres to start shaping your mixes.</p>}</section>;
}