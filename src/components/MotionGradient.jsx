import {useEffect,useRef,useState} from "react";

// PUBLIC Flow: a shared ribbon field. Only this background canvas moves;
// surrounding text, artwork and controls never inherit its animation.
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
void main(){
 // A gently turning field carries two interwoven ribbons through the frame.
 // Aspect correction keeps the folds broad on both portrait and desktop surfaces.
 float t=u_time;
 vec2 p=(v_uv-.5)*vec2(clamp(u_aspect,.62,1.8),1.);
 float angle=.24*sin(t*.16);
 mat2 turn=mat2(cos(angle),-sin(angle),sin(angle),cos(angle));
 vec2 q=turn*p;
 q.x+=.24*sin(p.y*4.2-t*.38)+.12*sin(p.y*2.1+t*.26);
 q.y+=.18*sin(p.x*3.5+t*.29);
 float sweep=q.x*3.4+q.y*2.2+.85*sin(q.y*3.0-t*.31)+t*.42;
 float returnFold=q.y*3.1-q.x*2.4+.90*sin(q.x*2.7+t*.23)-t*.34;
 float ribbon=smoothstep(-.78,.78,sin(sweep));
 float counterRibbon=smoothstep(-.60,.88,sin(returnFold));
 // Palette-only mixing: no gray veil, brightness reduction or white overlay.
 vec3 color=mix(u_a,u_b,ribbon);
 color=mix(color,u_c,counterRibbon*.94);
 gl_FragColor=vec4(color,1.);
}
`;
const DEFAULT=["#000000","#ffffff","#303030"];
function rgb(value){
 if(/^#[0-9a-f]{6}$/i.test(value||""))return [1,3,5].map(i=>parseInt(value.slice(i,i+2),16)/255);
 const m=/^rgb\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*\)$/.exec(value||"");
 return m?m.slice(1).map(n=>Math.min(255,Number(n))/255):null;
}
function paletteOf(colors){
 const values=[...new Set((colors||[]).filter(c=>rgb(c)))].slice(0,3);
 if(!values.length)return DEFAULT;
 const shade=(color,factor)=>"rgb("+rgb(color).map(v=>Math.round(Math.min(255,v*255*factor))).join(", ")+")";
 return [values[0],values[1]||shade(values[0],.62),values[2]||values[1]||shade(values[0],1.3)];
}
export default function MotionGradient({colors=DEFAULT,motion="flow",speed=1,active=true,pauseWhenCovered=false,className="",style}){
 const canvas=useRef(null),settings=useRef(null),wake=useRef(null),phase=useRef(4.6);
 const [ready,setReady]=useState(false),[version,setVersion]=useState(0);
 const palette=paletteOf(colors),key=palette.join("|");
 settings.current={palette,motion,speed:Math.max(.35,Math.min(1.6,Number(speed)||1)),active,pauseWhenCovered};
 useEffect(()=>{
  const element=canvas.current;
  let gl,program,buffer,vertex,fragment,raf=0,last=0,painted=0,visible=true,disposed=false,lost=false;
  const reduced=window.matchMedia("(prefers-reduced-motion: reduce)");
  let current=settings.current.palette.map(rgb);
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
  const uniforms=Object.fromEntries(["time","aspect","a","b","c"].map(name=>[name,gl.getUniformLocation(program,"u_"+name)]));
  const stop=()=>{if(raf)cancelAnimationFrame(raf);raf=0;last=0;painted=0;};
  const draw=(dt,animate)=>{
   const {palette,speed}=settings.current;
   const target=palette.map(rgb),blend=animate?1-Math.exp(-dt/1100):1;
   current=current.map((c,i)=>c.map((v,j)=>v+(target[i][j]-v)*blend));
   if(animate)phase.current+=dt*.001*speed;
   const rect=element.getBoundingClientRect(),scale=Math.min(1.25,window.devicePixelRatio||1,1100/Math.max(1,rect.width,rect.height));
   const w=Math.max(1,Math.round(rect.width*scale)),h=Math.max(1,Math.round(rect.height*scale));
   if(element.width!==w||element.height!==h){element.width=w;element.height=h;}
   gl.viewport(0,0,w,h);gl.uniform1f(uniforms.time,phase.current);gl.uniform1f(uniforms.aspect,w/h);
   ["a","b","c"].forEach((name,i)=>gl.uniform3fv(uniforms[name],current[i]));
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
  const resume=()=>{stop();if(!disposed&&!lost&&!document.hidden&&visible&&settings.current.active&&!covered())raf=requestAnimationFrame(tick);};
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
 return <div aria-hidden="true" data-gradient-motion="public-flow" className={className} style={{pointerEvents:"none",overflow:"hidden",...style}}>
  <div style={{position:"absolute",inset:0,backgroundColor:palette[0],backgroundImage:`linear-gradient(125deg, ${palette[0]} 0%, ${palette[1]} 42%, ${palette[2]} 78%, ${palette[0]} 100%)`}}/>
  <canvas ref={canvas} style={{position:"absolute",inset:0,width:"100%",height:"100%",display:"block",opacity:ready?1:0,transition:"opacity .5s ease"}}/>
 </div>;
}
