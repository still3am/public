import {useEffect,useRef,useState} from 'react';

const clamp=(n,min=0,max=1)=>Math.max(min,Math.min(max,n));
export function hsvToHex(h,s,v){
 const hue=((h%360)+360)%360,c=v*s,x=c*(1-Math.abs((hue/60)%2-1)),m=v-c;
 const channels=hue<60?[c,x,0]:hue<120?[x,c,0]:hue<180?[0,c,x]:hue<240?[0,x,c]:hue<300?[x,0,c]:[c,0,x];
 return '#'+channels.map(n=>Math.round(clamp(n+m)*255).toString(16).padStart(2,'0')).join('');
}
export function hexToHsv(hex){
 const [r,g,b]=[1,3,5].map(i=>parseInt(hex.slice(i,i+2),16)/255),max=Math.max(r,g,b),min=Math.min(r,g,b),d=max-min;
 let h=0;if(d)h=max===r?60*(((g-b)/d)%6):max===g?60*((b-r)/d+2):60*((r-g)/d+4);
 return {h:(h+360)%360,s:max?d/max:0,v:max};
}
export function wheelPoint(x,y,width,height){
 const radius=Math.min(width,height)/2,dx=x-width/2,dy=y-height/2;
 return {h:(Math.atan2(dx,-dy)*180/Math.PI+360)%360,s:clamp(Math.hypot(dx,dy)/radius)};
}
export default function ProfileColorWheel({value,onChange,disabled=false,colorNumber=1}){
 const [hsv,setHsv]=useState(()=>hexToHsv(value)),last=useRef(value),drag=useRef(null),current=useRef(hsv);
 current.current=hsv;
 useEffect(()=>{if(value!==last.current){last.current=value;const next=hexToHsv(value);current.current=next;setHsv(next);}},[value]);
 const change=patch=>{
  if(disabled)return;
  const next={...current.current,...patch};current.current=next;setHsv(next);
  const hex=hsvToHex(next.h,next.s,next.v);last.current=hex;onChange(hex);
 };
 const pick=event=>{const rect=event.currentTarget.getBoundingClientRect();change(wheelPoint(event.clientX-rect.left,event.clientY-rect.top,rect.width,rect.height));};
 const angle=hsv.h*Math.PI/180;
 return <div className="profile-spectrum-editor">
  <div className="profile-spectrum-title"><span>Color {colorNumber}</span><span>{value.toUpperCase()}</span></div>
  <div className="profile-spectrum-wheel" role="group" tabIndex={disabled?-1:0} aria-label={'Color '+colorNumber+' wheel. Left and right change hue; up and down change saturation.'} aria-disabled={disabled}
   style={{opacity:disabled?.45:1}}
   onPointerDown={event=>{if(disabled||!event.isPrimary||event.button!==0)return;event.preventDefault();event.currentTarget.focus({preventScroll:true});drag.current=event.pointerId;event.currentTarget.setPointerCapture(event.pointerId);pick(event);}}
   onPointerMove={event=>{if(drag.current===event.pointerId)pick(event);}}
   onPointerUp={event=>{if(drag.current===event.pointerId){drag.current=null;if(event.currentTarget.hasPointerCapture(event.pointerId))event.currentTarget.releasePointerCapture(event.pointerId);}}}
   onPointerCancel={()=>{drag.current=null;}} onLostPointerCapture={()=>{drag.current=null;}}
   onKeyDown={event=>{if(disabled)return;const step=event.shiftKey?10:2;if(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(event.key)){event.preventDefault();change(event.key==='ArrowLeft'?{h:(hsv.h-step+360)%360}:event.key==='ArrowRight'?{h:(hsv.h+step)%360}:event.key==='ArrowUp'?{s:clamp(hsv.s+step/100)}:{s:clamp(hsv.s-step/100)});}}}>
   <div className="profile-spectrum-darken" style={{opacity:1-hsv.v}}/>
   <span className="profile-spectrum-cursor" style={{left:(50+Math.sin(angle)*hsv.s*50)+'%',top:(50-Math.cos(angle)*hsv.s*50)+'%',backgroundColor:value}}/>
  </div>
  <p className="profile-color-hint">Drag around the wheel. Move inward for softer colors.</p>
  <label className="profile-spectrum-slider"><span>Brightness <span>{Math.round(hsv.v*100)}%</span></span><input type="range" min="0" max="100" value={Math.round(hsv.v*100)} disabled={disabled} aria-label={'Color '+colorNumber+' brightness'} style={{background:'linear-gradient(to right,#000,'+hsvToHex(hsv.h,hsv.s,1)+')'}} onChange={event=>change({v:Number(event.target.value)/100})}/></label>
  <details className="profile-spectrum-fine"><summary>Fine tune color</summary>
   <label className="profile-spectrum-slider"><span>Hue <span>{Math.round(hsv.h)}°</span></span><input type="range" min="0" max="359" value={Math.round(hsv.h)%360} disabled={disabled} aria-label={'Color '+colorNumber+' hue'} onChange={event=>change({h:Number(event.target.value)})}/></label>
   <label className="profile-spectrum-slider"><span>Saturation <span>{Math.round(hsv.s*100)}%</span></span><input type="range" min="0" max="100" value={Math.round(hsv.s*100)} disabled={disabled} aria-label={'Color '+colorNumber+' saturation'} onChange={event=>change({s:Number(event.target.value)/100})}/></label>
  </details>
 </div>;
}
