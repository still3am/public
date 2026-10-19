import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { useAuth } from '@/lib/AuthContext';
import { useSafety } from '@/context/SafetyContext';
import { getPublishedTracks } from '@/lib/catalogCache';
import { useRecapHistory } from '@/hooks/useRecapHistory';
import { buildRecap } from '@/lib/recapModel';
import { recapSelection, recapMix } from '@/lib/recapPresentation';
import { PersonalMixContent } from '@/components/home/MadeForYou';
import '@/components/home/recap.css';
export default function RecapPlaylist() {
  const { period, value } = useParams(),{ user } = useAuth(),{ blocked } = useSafety(),nav = useNavigate();
  const history = useRecapHistory(user?.id),[catalog, setCatalog] = useState({ tracks: [], loading: true, error: false }),[revision, setRevision] = useState(0);
  const selection = recapSelection(period, value);
  useEffect(() => {
    let alive = true;
    setCatalog({ tracks: [], loading: true, error: false });
    getPublishedTracks(revision > 0).then((tracks) => {if (alive) setCatalog({ tracks, loading: false, error: false });}).catch(() => {if (alive) setCatalog({ tracks: [], loading: false, error: true });});
    return () => {alive = false;};
  }, [revision, user?.id]);
  useEffect(() => {const refresh = () => setRevision((n) => n + 1);window.addEventListener('catalog:invalidate', refresh);return () => window.removeEventListener('catalog:invalidate', refresh);}, []);
  const back = () => window.history.state?.idx > 0 ? nav(-1) : nav('/');
  if (!selection) return <div className="py-16 text-center"><h1 className="text-2xl font-bold">This recap could not be found</h1><Link to="/" className="block mt-4 underline">Back to Home</Link></div>;
  if (history.loading || catalog.loading) return <div className="py-20 grid place-items-center" role="status" aria-label="Loading your recap"><Loader2 className="animate-spin" /></div>;
  if (history.error || catalog.error) return <div className="py-16 text-center"><p>Your recap could not load.</p><button className="playlist-action mt-4" onClick={() => {history.retry();setRevision((n) => n + 1);}}>Retry</button><Link to="/" className="block mt-4 underline">Back to Home</Link></div>;
  const recap = buildRecap(history.sessions, history.events, catalog.tracks.filter((t) => !blocked.has(t.uploader_id)), period, selection.date),mix = recapMix(selection, recap);
  const controls = period === 'all' ? null : <label className="recap-period-control hidden">{period === 'month' ? 'Choose month' : 'Choose year'}<input aria-label={period === 'month' ? 'Recap month' : 'Recap year'} type={period === 'month' ? 'month' : 'number'} min={period === 'month' ? '2020-01' : '2020'} max={period === 'month' ? new Date().getFullYear() + '-' + String(new Date().getMonth() + 1).padStart(2, '0') : new Date().getFullYear()} value={value} onChange={(e) => {if (recapSelection(period, e.target.value)) nav('/recap/' + period + '/' + e.target.value, { replace: true });}} /></label>;
  return <PersonalMixContent key={user.id + period + (value || '')} uid={user.id} mix={mix} onBack={back} headerExtra={controls} />;
}