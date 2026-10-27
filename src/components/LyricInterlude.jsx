import {useEffect,useRef} from 'react';
import {usePlayer} from '@/context/PlayerContext';
import {updateInterludeWave} from '@/lib/interludeWave';
import './lyric-interlude.css';
export default function LyricInterlude({active=false}) {
 const player=usePlayer(),latest=useRef(player),canvasRef=useRef(null);latest.current=player;
 useEffect(()=>{
  const canvas=canvasRef.current,ctx=canvas?.getContext('2d');if(!ctx)return;
  let frame=0,last=0,phase=0,values=null,visible=true,width=200,height=64,ink='white';const wave=new Float32Array(72);
  const reduced=window.matchMedia('(prefers-reduced-motion: reduce)');
  const measure=()=>{const rect=canvas.getBoundingClientRect(),dpr=Math.min(2,window.devicePixelRatio||1);width=rect.width||200;height=rect.height||64;canvas.width=Math.round(width*dpr);canvas.height=Math.round(height*dpr);ctx.setTransform(dpr,0,0,dpr,0,0);ink=getComputedStyle(canvas).color;};
  if(active&&latest.current?.isPlaying)latest.current?.enableAnalyser?.();
  measure();
  const draw=now=>{
   frame=0;if(document.hidden||!visible)return;
   const dt=last?Math.min(80,now-last):16;last=now;
   const p=latest.current,playing=active&&p?.isPlaying&&!reduced.matches,analyser=p?.getAnalyser?.();
   if(analyser&&playing){if(!values||values.length!==analyser.fftSize)values=new Uint8Array(analyser.fftSize);analyser.getByteTimeDomainData(values);}
   if(playing)phase+=dt*.00085;
   updateInterludeWave(analyser?values:null,wave,!!playing,phase,dt);
   ctx.clearRect(0,0,width,height);ctx.strokeStyle=ink;ctx.lineCap='round';ctx.lineJoin='round';
   for(const [spread,alpha,weight] of [[1.5,.08,9],[1.15,.2,3],[1,.95,2]]){
    ctx.beginPath();ctx.globalAlpha=alpha;ctx.lineWidth=weight;
    const points=Array.from(wave,(value,i)=>{const x=i/(wave.length-1);return [8+x*(width-16),height/2+value*height*.43*Math.sin(x*Math.PI)*spread];});
    ctx.moveTo(...points[0]);
    for(let i=1;i<points.length-1;i++){const next=points[i+1];ctx.quadraticCurveTo(...points[i],(points[i][0]+next[0])/2,(points[i][1]+next[1])/2);}
    ctx.lineTo(...points[points.length-1]);
    ctx.stroke();
   }
   ctx.globalAlpha=1;
   if(playing)frame=requestAnimationFrame(draw);
  };
  const wake=()=>{cancelAnimationFrame(frame);last=0;frame=requestAnimationFrame(draw);};
  const resize=()=>{measure();wake();};
  const observer=typeof IntersectionObserver!=='undefined'?new IntersectionObserver(entries=>{visible=entries[0]?.isIntersecting??true;wake();}):null;observer?.observe(canvas);
  const sizes=typeof ResizeObserver!=='undefined'?new ResizeObserver(resize):null;sizes?.observe(canvas);
  window.addEventListener('resize',resize);document.addEventListener('visibilitychange',wake);reduced.addEventListener('change',wake);wake();
  return()=>{cancelAnimationFrame(frame);observer?.disconnect();sizes?.disconnect();window.removeEventListener('resize',resize);document.removeEventListener('visibilitychange',wake);reduced.removeEventListener('change',wake);};
 },[active,player?.isPlaying,player?.currentTrack?.id]);
 return <span className="lyric-interlude" data-active={active?'true':'false'} role="img" aria-label="Instrumental passage"><canvas ref={canvasRef} aria-hidden="true"/></span>;
}
