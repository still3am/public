import {Link} from 'react-router-dom';
import {ArrowUpRight} from 'lucide-react';
import {useAuth} from '@/lib/AuthContext';
import {useSafety} from '@/context/SafetyContext';
import {useRecapHistory} from '@/hooks/useRecapHistory';
import {buildRecap} from '@/lib/recapModel';
import {recapMix} from '@/lib/recapPresentation';
import ScrollShelf from '@/components/ScrollShelf';
import MotionGradient from '@/components/MotionGradient';
import Logo from '@/components/Logo';
import './recap.css';
export default function ListeningRecap({catalog=[]}) {
 const {user}=useAuth(),{blocked}=useSafety(),history=useRecapHistory(user?.id);
 if(!user)return null;
 const now=new Date(),month=now.getFullYear()+'-'+String(now.getMonth()+1).padStart(2,'0');
 const selections=[{period:'month',value:month,date:now},{period:'all',value:'',date:now},{period:'year',value:String(now.getFullYear()),date:now}];
 const available=catalog.filter(t=>!blocked.has(t.uploader_id));
 return <section className="home-section home-personal-section recap-section" aria-label="Your PUBLIC Recap">
  <div className="personal-section-heading"><h2>Recap: Your Top Music</h2></div>
  <ScrollShelf label="Your listening recaps" className="recap-shelf">{selections.map(selection=>{
   const mix=recapMix(selection,buildRecap(history.sessions,history.events,available,selection.period,selection.date));
   return <Link className={'recap-card recap-card-'+selection.period} key={selection.period} to={'/recap/'+selection.period+(selection.value?'/'+selection.value:'')} aria-label={'Open '+mix.title}>
    <MotionGradient colors={mix.palette} speed={.35} pauseWhenCovered className="recap-card-gradient"/>
    <span className="recap-card-brand"><Logo width="69px" className="personal-mix-logo"/><ArrowUpRight size={20}/></span>
    <span className="recap-card-kicker">Your music. Your recap.</span>
    <strong className="recap-card-title">{mix.cardTitle}</strong>
    <span className="recap-card-footer"><b>{mix.periodLabel}</b><span>{history.loading?'Gathering your top music…':history.error?'Open to retry your recap':mix.artists?mix.artists+' and more':'The songs that will tell your story.'}</span></span>
   </Link>;
  })}</ScrollShelf>
 </section>;
}
