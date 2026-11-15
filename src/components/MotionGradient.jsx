import "./motion-gradient.css";
import {useEffect,useRef,useState} from "react";

// Original, lightweight WebGL surface. No video download or audio graph.
const VERTEX=`
attribute vec2 a_position;
varying vec2 v_uv;
void main(){v_uv=a_position*.5+.5;gl_Position=vec4(a_position,0.,1.);}
`;
const FRAGMENT=`
precision mediump float;
varying vec2 v_uv;
uniform float u_time;
uniform float u_aspect;
uniform vec3 u_a;
uniform vec3 u_b;
uniform vec3 u_c;
uniform vec3 u_d;
uniform vec3 u_e;
uniform float u_count;
vec3 paletteStop(float index){
 if(index<.5)return u_a;
 if(index<1.5)return u_b;
 if(index<2.5)return u_c;
 if(index<3.5)return u_d;
 return u_e;
}
void main(){
 vec2 p=v_uv;
 float phase=mod(u_time,48.)*6.2831853/48.;
 vec2 q=(p-.5)*vec2(clamp(u_aspect,.7,1.6),1.);
 // Move the warp in a closed loop, keeping color movement continuous.
 vec2 drift=vec2(cos(phase),sin(phase))*.25;
 vec2 flow=q+drift;
 float broad=sin(flow.x*4.2+flow.y*2.6);
 float fold=cos(flow.y*4.5-flow.x*1.9+broad*.8);
 float ripple=sin(flow.x*6.0+flow.y*5.1+fold*.9);
 float field=dot(q,vec2(.83,.54))+.33*(broad*.48+fold*.36+ripple*.16);
 float path=fract(field+.55+.13*sin(phase-.6))*u_count;
 float index=floor(path);
 float blend=smoothstep(0.,1.,fract(path));
 vec3 color=mix(paletteStop(index),paletteStop(mod(index+1.,u_count)),blend);
 // A little fixed grain helps break up visible bands on dark displays.
 float grain=fract(sin(dot(mod(gl_FragCoord.xy,256.),vec2(12.9898,78.233)))*437.585)-.5;
 gl_FragColor=vec4(clamp(color+grain*.022,0.,1.),1.);
}
`;
const DEFAULT=["#334c78","#70528c","#246c75"];
function rgb(value){
 if(/^#[0-9a-f]{6}$/i.test(value||""))return [1,3,5].map(i=>parseInt(value.slice(i,i+2),16)/255);
 const m=/^rgb\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*\)$/.exec(value||"");
 return m?m.slice(1).map(n=>Math.min(255,Number(n))/255):null;
}
function paletteOf(colors){
 const values=[...new Set((colors||[]).filter(c=>rgb(c)))].slice(0,5);
 if(!values.length)return DEFAULT;
 const shade=(color,factor)=>"rgb("+rgb(color).map(v=>Math.round(Math.min(255,v*255*factor))).join(", ")+")";
 return [values[0],values[1]||shade(values[0],.62),values[2]||values[1]||shade(values[0],1.3),...values.slice(3)];
}
export default function MotionGradient({colors=DEFAULT,motion="flow",speed=1,active=true,pauseWhenCovered=false,className="",style={}}){
 const canvas=useRef(null),settings=useRef(null),wake=useRef(null),phase=useRef(4.6);
 const [ready,setReady]=useState(false),[version,setVersion]=useState(0);
 const palette=paletteOf(colors),key=palette.join("|");
 settings.current={palette,motion,speed:Math.max(.35,Math.min(1.6,Number(speed)||1)),active,pauseWhenCovered};
 useEffect(()=>{
  const element=canvas.current;
  let gl,program,buffer,vertex,fragment,raf=0,last=0,painted=0,visible=true,disposed=false,lost=false;
  const reduced=window.matchMedia("(prefers-reduced-motion: reduce)");
  const channels=palette=>Array.from({length:5},(_,i)=>rgb(palette[i]||palette[0]));
  let current=channels(settings.current.palette);
  setReady(false);
  const compile=(type,source)=>{
   const shader=gl.createShader(type);gl.shaderSource(shader,source);gl.compileShader(shader);
   if(!gl.getShaderParameter(shader,gl.COMPILE_STATUS)){gl.deleteShader(shader);throw Error("Shader unavailable");}
   return shader;
  };
  try{
   gl=element.getContext("webgl",{alpha:false,antialias:false,depth:false,stencil:false,powerPreference:"low-power",preserveDrawingBuffer:false});
   if(!gl)return;
   vertex=compile(gl.VERTEX_SHADER,VERTEX);fragment=compile(gl.FRAGMENT_SHADER,FRAGMENT);
   program=gl.createProgram();gl.attachShader(program,vertex);gl.attachShader(program,fragment);gl.linkProgram(program);
   if(!gl.getProgramParameter(program,gl.LINK_STATUS))throw Error("Gradient unavailable");
   gl.useProgram(program);buffer=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,buffer);
   gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,-1,1,1,-1,1,1]),gl.STATIC_DRAW);
   const position=gl.getAttribLocation(program,"a_position");gl.enableVertexAttribArray(position);gl.vertexAttribPointer(position,2,gl.FLOAT,false,0,0);
  }catch{if(buffer)gl?.deleteBuffer(buffer);if(program)gl?.deleteProgram(program);if(vertex)gl?.deleteShader(vertex);if(fragment)gl?.deleteShader(fragment);return;}
  const uniforms=Object.fromEntries(["time","aspect","count","a","b","c","d","e"].map(name=>[name,gl.getUniformLocation(program,"u_"+name)]));
  const stop=()=>{if(raf)cancelAnimationFrame(raf);raf=0;last=0;painted=0;};
  let bounds=element.getBoundingClientRect();
  const measure=()=>{bounds=element.getBoundingClientRect();};
  const draw=(dt,animate)=>{
   const {palette,speed}=settings.current;
   const target=channels(palette),blend=animate?1-Math.exp(-dt/1100):1;
   current=current.map((c,i)=>c.map((v,j)=>v+(target[i][j]-v)*blend));
   if(animate)phase.current+=dt*.001*speed;
   const rect=bounds,scale=Math.min(1.25,window.devicePixelRatio||1,1100/Math.max(1,rect.width,rect.height));
   const w=Math.max(1,Math.round(rect.width*scale)),h=Math.max(1,Math.round(rect.height*scale));
   if(element.width!==w||element.height!==h){element.width=w;element.height=h;}
   gl.viewport(0,0,w,h);gl.uniform1f(uniforms.time,phase.current);gl.uniform1f(uniforms.aspect,w/h);
   gl.uniform1f(uniforms.count,palette.length);
   ["a","b","c","d","e"].forEach((name,i)=>gl.uniform3fv(uniforms[name],current[i]));
   gl.drawArrays(gl.TRIANGLES,0,6);
  };
  const covered=()=>settings.current.pauseWhenCovered&&!element.closest("[role=dialog]")&&!!document.querySelector("[data-public-dialog], [role=dialog][aria-modal=true]");
  const tick=now=>{
   raf=0;
   if(disposed||lost||document.hidden||!visible||!settings.current.active||covered())return;
   const animate=settings.current.motion==="flow"&&!reduced.matches;
   // Limit GPU work to 30fps while preserving continuous time.
   if(animate&&painted&&now-painted<32){raf=requestAnimationFrame(tick);return;}
   const dt=last?Math.min(80,now-last):33;last=now;painted=now;
   draw(dt,animate);
   if(animate)raf=requestAnimationFrame(tick);
  };
  const resume=()=>{stop();measure();if(!disposed&&!lost&&!document.hidden&&visible&&settings.current.active&&!covered())raf=requestAnimationFrame(tick);};
  wake.current=resume;
  const onLost=event=>{event.preventDefault();lost=true;stop();setReady(false);};
  const onRestored=()=>{if(!disposed)setVersion(v=>v+1);};
  element.addEventListener("webglcontextlost",onLost);element.addEventListener("webglcontextrestored",onRestored);
  document.addEventListener("visibilitychange",resume);reduced.addEventListener("change",resume);
  const observer=typeof IntersectionObserver!=="undefined"?new IntersectionObserver(entries=>{visible=entries[0]?.isIntersecting??true;resume();}):null;
  observer?.observe(element);
  let wasCovered=covered();
  const dialogs=new MutationObserver(()=>{const next=covered();if(next!==wasCovered){wasCovered=next;resume();}});
  if(settings.current.pauseWhenCovered)dialogs.observe(document.body,{childList:true,subtree:true});
  const resize=typeof ResizeObserver!=="undefined"?new ResizeObserver(resume):null;resize?.observe(element);
  draw(0,false);setReady(true);resume();
  return()=>{
   disposed=true;stop();wake.current=null;observer?.disconnect();resize?.disconnect();dialogs.disconnect();
   element.removeEventListener("webglcontextlost",onLost);element.removeEventListener("webglcontextrestored",onRestored);
   document.removeEventListener("visibilitychange",resume);reduced.removeEventListener("change",resume);
   gl.deleteBuffer(buffer);gl.deleteProgram(program);gl.deleteShader(vertex);gl.deleteShader(fragment);
  };
 },[version]);
 useEffect(()=>{wake.current?.();},[key,motion,speed,active,pauseWhenCovered]);
 return <div aria-hidden="true" className={"public-motion-gradient "+className} style={{pointerEvents:"none",overflow:"hidden",...style}}>
  <div className="motion-gradient-fallback" style={{animationDuration:(24/Math.max(.35,Math.min(1.6,Number(speed)||1)))+"s",animationPlayState:!ready&&active&&motion==="flow"?"running":"paused",position:"absolute",inset:0,backgroundColor:palette[0],backgroundImage:palette.length>3?`linear-gradient(135deg, ${[...palette,palette[0]].join(", ")})`:`radial-gradient(ellipse at 15% 25%, ${palette[1]}, transparent 70%),radial-gradient(ellipse at 85% 80%, ${palette[2]}, transparent 75%)`}}/>
  <canvas ref={canvas} style={{position:"absolute",inset:0,width:"100%",height:"100%",display:"block",opacity:ready?1:0,transition:"opacity .5s ease"}}/>
 </div>;
}
