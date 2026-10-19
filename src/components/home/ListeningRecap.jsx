import { Link } from 'react-router-dom';
import { useAuth } from '@/lib/AuthContext';
import { useSafety } from '@/context/SafetyContext';
import { useRecapHistory } from '@/hooks/useRecapHistory';
import { buildRecap } from '@/lib/recapModel';
import { recapMix } from '@/lib/recapPresentation';
import ScrollShelf from '@/components/ScrollShelf';
import {MixArt} from './MadeForYou';
import './recap.css';
export default function ListeningRecap({ catalog = [] }) {
  const { user } = useAuth(),{ blocked } = useSafety(),history = useRecapHistory(user?.id);
  if (!user) return null;
  const now = new Date(),month = now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0');
  const selections = [{ period: 'month', value: month, date: now }, { period: 'all', value: '', date: now }, { period: 'year', value: String(now.getFullYear()), date: now }];
  const available = catalog.filter((t) => !blocked.has(t.uploader_id));
  return <section className="home-section home-personal-section recap-section" aria-label="Your PUBLIC Recap">
  <div className="personal-section-heading"><h2>Your PUBLIC Recap</h2><span>Your music, remembered</span></div>
  <ScrollShelf label="Your listening recaps" className="personal-mix-shelf">{selections.map((selection) => {
        const mix = recapMix(selection, buildRecap(history.sessions, history.events, available, selection.period, selection.date));
        return <Link className="personal-mix-card" key={selection.period} to={'/recap/' + selection.period + (selection.value ? '/' + selection.value : '')} aria-label={'Open ' + mix.title}>
    <MixArt className="recap-mix-art" mix={{...mix,artists:history.loading?'Gathering your top music…':history.error?'Open to retry your recap':mix.artists || 'The songs that will tell your story.'}}/>
   </Link>;
      })}</ScrollShelf>
 </section>;
}