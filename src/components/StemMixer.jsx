import {EQ_PRESETS} from '@/lib/equalizer';
import {useEffect,useState} from 'react';
import {usePlayer} from '@/context/PlayerContext';
import {Power,RotateCcw} from 'lucide-react';
import {Dialog,DialogContent,DialogHeader,DialogTitle,DialogDescription} from '@/components/ui/dialog';
import './stem-equalizer.css';
const BANDS=[{key:'bass',label:'Bass',frequency:'120 Hz',axis:'left'},{key:'beat',label:'Low mids',frequency:'400 Hz',axis:'bottom'},{key:'vocals',label:'Presence',frequency:'2 kHz',axis:'top'},{key:'treble',label:'Treble',frequency:'8 kHz',axis:'right'}];
export default function StemMixer({onClose}) {
 const p=usePlayer(),{mixer}=p,[ready,setReady]=useState(true);
 useEffect(()=>{setReady(p.enableMixer?.()!==false);},[p.enableMixer]);
 const chosen=EQ_PRESETS.find(row=>Object.entries(row.values).every(([key,value])=>mixer[key]===value))?.label||'Custom';
 return <Dialog open onOpenChange={open=>{if(!open)onClose?.();}}><DialogContent className="stem-equalizer" data-public-dialog>
  <DialogHeader><DialogTitle>Equalizer</DialogTitle><DialogDescription>Four touch strips. Your sound.</DialogDescription></DialogHeader>
  <div className={'eq-puck'+(!mixer.enabled?' is-bypassed':'')} role="group" aria-label="Four band touch equalizer">
   {BANDS.map(band=><div key={band.key} className="eq-arm" data-axis={band.axis}><div className="eq-leds" aria-hidden="true">{Array.from({length:13},(_,index)=><i key={index} data-lit={index<=Math.round((mixer[band.key]+12)/24*12)?'true':'false'} data-neutral={index===6?'true':undefined}/>)}</div><input type="range" min={-12} max={12} step={1} value={mixer[band.key]} aria-label={band.label} aria-valuetext={mixer[band.key]+' decibels'} disabled={!mixer.enabled||!ready} onChange={event=>p.setMixerValue(band.key,Number(event.target.value))}/></div>)}
   <button type="button" className="eq-power" aria-label={mixer.enabled?'Bypass equalizer':'Enable equalizer'} aria-pressed={mixer.enabled} onClick={()=>p.setMixerValue('enabled',!mixer.enabled)}><Power size={21}/><span>{mixer.enabled?'ON':'OFF'}</span></button>
   <span className="eq-puck-label eq-label-top">PRESENCE</span><span className="eq-puck-label eq-label-bottom">LOW MIDS</span><span className="eq-puck-label eq-label-left">BASS</span><span className="eq-puck-label eq-label-right">TREBLE</span>
  </div>
  <div className="eq-readouts">{BANDS.map(band=><button type="button" key={band.key} disabled={!ready} aria-label={'Reset '+band.label+' to zero'} onClick={()=>p.setMixerValue(band.key,0)}><span>{band.label}</span><strong>{mixer[band.key]>0?'+':''}{mixer[band.key]}<small> dB</small></strong><small>{band.frequency}</small></button>)}</div>
  <div className="eq-preset-row"><label>Sound<select aria-label="Equalizer preset" value={chosen} onChange={event=>{const row=EQ_PRESETS.find(item=>item.label===event.target.value);if(row)p.setMixerValues({...row.values,boost:1,enabled:true});}}>{chosen==='Custom'&&<option>Custom</option>}{EQ_PRESETS.map(row=><option key={row.label}>{row.label}</option>)}</select></label><button type="button" onClick={()=>p.resetMixer()}><RotateCcw size={14}/>Reset</button></div>
  <label className="eq-output">Output <strong>{Math.round(mixer.boost*100)}%</strong><input type="range" min={.5} max={1.5} step={.05} value={mixer.boost} disabled={!ready||!mixer.enabled} aria-label="Equalizer output level" aria-valuetext={Math.round(mixer.boost*100)+' percent'} onChange={event=>p.setMixerValue('boost',Number(event.target.value))}/></label>
  {!ready&&<p role="alert" className="eq-help">Audio processing couldn’t start. <button type="button" onClick={()=>setReady(p.enableMixer?.()!==false)}>Retry</button></p>}
  <p className="eq-help">Drag a strip to shape the full mix. Tap a band value to reset it. These are frequency controls, not isolated stems.</p>
 </DialogContent></Dialog>;
}
