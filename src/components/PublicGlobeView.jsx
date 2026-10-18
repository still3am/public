import {useEffect,useRef,useState} from "react";
import {COUNTRIES,LAND_DOTS} from "@/lib/globeWorld";
export default function PublicGlobeView({shares,country,onCountry}){
 const canvas=useRef(null),angle=useRef(0),drag=useRef(null),pins=useRef([]),[spinning,setSpinning]=useState(true);
 useEffect(()=>{const place=COUNTRIES.find(c=>c.code===country);if(place)angle.current=-place.lon;},[country]);
 useEffect(()=>{
  const ctx=canvas.current.getContext("2d");let frame,last=0;
  const reduced=window.matchMedia("(prefers-reduced-motion: reduce)");
  const counts=new Map();shares.forEach(s=>counts.set(s.country,(counts.get(s.country)||0)+1));
  function draw(time){
   frame=requestAnimationFrame(draw);if(time-last<33||document.hidden)return;
   const step=last?Math.min(time-last,60):0;last=time;
   if(spinning&&!reduced.matches&&!drag.current)angle.current+=step*.0025;
   ctx.clearRect(0,0,600,600);
   const a=angle.current*Math.PI/180;
   const project=(lon,lat)=>{const l=lon*Math.PI/180+a,p=lat*Math.PI/180;return [300+238*Math.cos(p)*Math.sin(l),300-238*Math.sin(p),Math.cos(p)*Math.cos(l)];};
   const glow=ctx.createRadialGradient(300,300,180,300,300,285);glow.addColorStop(0,"#32d7e322");glow.addColorStop(1,"#32d7e300");ctx.fillStyle=glow;ctx.fillRect(0,0,600,600);
   const ocean=ctx.createRadialGradient(235,205,20,310,320,260);ocean.addColorStop(0,"#173653");ocean.addColorStop(1,"#060e25");
   ctx.beginPath();ctx.arc(300,300,238,0,Math.PI*2);ctx.fillStyle=ocean;ctx.fill();ctx.strokeStyle="#66dcea55";ctx.stroke();
   ctx.save();ctx.beginPath();ctx.arc(300,300,238,0,Math.PI*2);ctx.clip();
   for(let lat=-60;lat<=60;lat+=30){ctx.beginPath();let started=false;for(let lon=-180;lon<=180;lon+=2){const [x,y,z]=project(lon,lat);if(z>=0){if(started)ctx.lineTo(x,y);else ctx.moveTo(x,y);started=true;}else started=false;}ctx.strokeStyle="#b7ccff12";ctx.stroke();}
   for(const [lon,lat] of LAND_DOTS){const [x,y,z]=project(lon,lat);if(z<0)continue;ctx.fillStyle="rgba(148,213,231,"+(.25+z*.55)+")";ctx.fillRect(x,y,1.7,1.7);}
   pins.current=[];
   for(const place of COUNTRIES){if(!counts.has(place.code)&&place.code!==country)continue;const [x,y,z]=project(place.lon,place.lat);if(z<0)continue;
    const selected=place.code===country;ctx.beginPath();ctx.arc(x,y,selected?9:6,0,Math.PI*2);ctx.fillStyle=selected?"#e9ff74":"#71f4cc";ctx.shadowColor=ctx.fillStyle;ctx.shadowBlur=14;ctx.fill();ctx.shadowBlur=0;
    pins.current.push({x,y,code:place.code});
   }
   ctx.restore();
  }
  frame=requestAnimationFrame(draw);return()=>cancelAnimationFrame(frame);
 },[shares,country,spinning]);
 function release(event){
  const start=drag.current;drag.current=null;
  if(!start||Math.abs(event.clientX-start.start)>5)return;
  const bounds=canvas.current.getBoundingClientRect(),x=(event.clientX-bounds.left)*600/bounds.width,y=(event.clientY-bounds.top)*600/bounds.height;
  const pin=pins.current.find(p=>Math.hypot(p.x-x,p.y-y)<20);if(pin)onCountry(pin.code);
 }
 return <div className="globe-visual"><canvas ref={canvas} width={600} height={600} role="img" aria-label="Interactive world globe. Drag to rotate or use the rotate buttons. Browse countries with the country menu." onPointerDown={event=>{drag.current={x:event.clientX,start:event.clientX};event.currentTarget.setPointerCapture(event.pointerId);}} onPointerMove={event=>{if(drag.current){angle.current+=(event.clientX-drag.current.x)*.4;drag.current.x=event.clientX;}}} onPointerUp={release} onPointerCancel={()=>{drag.current=null;}}/><div className="globe-controls"><button aria-label="Rotate globe left" onClick={()=>{angle.current-=30;}}>←</button><button onClick={()=>setSpinning(!spinning)} aria-pressed={spinning}>{spinning?"Pause rotation":"Rotate globe"}</button><button aria-label="Rotate globe right" onClick={()=>{angle.current+=30;}}>→</button></div><p>Drag to explore · Tap a light to discover</p></div>;
}
