import {useEffect,useState} from 'react';
export default function WeatherScene({scene='ambient'}){
 const [paused,setPaused]=useState(()=>document.hidden);
 useEffect(()=>{const update=()=>setPaused(document.hidden);document.addEventListener('visibilitychange',update);return()=>document.removeEventListener('visibilitychange',update);},[]);
 const night=['night','cloud-night','rain-night'].includes(scene),rain=['rain','rain-night','storm'].includes(scene),snow=scene==='snow';
 return <div className={'weather-sky weather-sky--'+scene+(paused?' weather-sky--paused':'')} aria-hidden="true">
  <div className="weather-sky-glow"/>
  {scene==='sun'&&<div className="weather-sky-sun"/>}
  {night&&<><div className="weather-sky-moon"/><div className="weather-sky-stars">{Array.from({length:28},(_,i)=><i key={i} style={{'--x':((i*37+11)%100)+'%','--y':((i*23+7)%76)+'%','--delay':-(i%9)+'s','--size':(i%3===0?2:1)+'px'}}/>)}</div></>}
  {scene!=='ambient'&&scene!=='sun'&&<div className="weather-sky-clouds"><i/><i/><i/></div>}
  {(rain||snow)&&<div className={'weather-sky-particles '+(snow?'is-snow':'is-rain')}>{Array.from({length:snow?24:32},(_,i)=><i key={i} style={{'--x':((i*31+3)%110)+'%','--delay':-(i%13)+'s','--speed':(snow?7+i%5:.8+(i%5)*.15)+'s','--opacity':.15+(i%5)*.12}}/>)}</div>}
  <div className="weather-sky-shade"/>
 </div>;
}
