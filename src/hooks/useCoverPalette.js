import {useEffect,useState} from "react";
export function useCoverPalette(url){
 const [state,setState]=useState({url:"",colors:[],loading:false});
 useEffect(()=>{
  let active=true;
  if(!url){setState({url,colors:[],loading:false});return;}
  setState({url,colors:[],loading:true});
  const img=new Image();img.crossOrigin="anonymous";
  const finish=colors=>{if(active)setState({url,colors,loading:false});};
  img.onload=()=>{if(!active)return;try{
   const canvas=document.createElement("canvas");canvas.width=48;canvas.height=48;
   const ctx=canvas.getContext("2d");if(!ctx){finish([]);return;}ctx.drawImage(img,0,0,48,48);
   const pixels=ctx.getImageData(0,0,48,48).data,buckets=new Map();
   for(let i=0;i<pixels.length;i+=4){if(pixels[i+3]<128)continue;const rgb=[pixels[i],pixels[i+1],pixels[i+2]],key=rgb.map(v=>v>>5).join("-");const b=buckets.get(key)||{rgb:[0,0,0],n:0};rgb.forEach((v,j)=>b.rgb[j]+=v);b.n++;buckets.set(key,b);}
   const ranked=[...buckets.values()].map(b=>({rgb:b.rgb.map(v=>Math.round(v/b.n)),n:b.n})).sort((a,b)=>b.n*(1+(Math.max(...b.rgb)-Math.min(...b.rgb))/120)-a.n*(1+(Math.max(...a.rgb)-Math.min(...a.rgb))/120));
   const chosen=[];for(const b of ranked){if(chosen.every(c=>Math.hypot(...c.map((v,i)=>v-b.rgb[i]))>55))chosen.push(b.rgb);if(chosen.length===8)break;}
   finish(chosen.map(c=>"#"+c.map(v=>v.toString(16).padStart(2,"0")).join("")));
  }catch{finish([]);}};
  img.onerror=()=>finish([]);img.src=url;return()=>{active=false;};
 },[url]);return state.url===url?state:{colors:[],loading:!!url};
}
export function profileGradient(colors){
 const safe=(colors||[]).filter(c=>/^#[0-9a-f]{6}$/i.test(c)).slice(0,3);
 if(!safe.length)return undefined;
 return safe.map((c,i)=>`radial-gradient(ellipse at ${[15,85,50][i]}% ${[25,75,95][i]}%, ${c} 0%, transparent 70%)`).join(",");
}
