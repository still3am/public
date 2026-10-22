import {Component,lazy,Suspense,useEffect,useState} from "react";
const Material=lazy(()=>import("simple-liquid-glass").then(module=>({default:module.LiquidGlass})));
class MaterialBoundary extends Component{
 state={failed:false};
 static getDerivedStateFromError(){return {failed:true};}
 render(){return this.state.failed?null:this.props.children;}
}
export default function GlassSettingsBackdrop({dark}){
 const [simple,setSimple]=useState(true);
 useEffect(()=>{
  const queries=["(prefers-reduced-motion: reduce)","(prefers-reduced-transparency: reduce)","(prefers-contrast: more)","(forced-colors: active)"].map(value=>window.matchMedia(value));
  const update=()=>setSimple(queries.some(query=>query.matches));update();
  queries.forEach(query=>query.addEventListener?.("change",update));
  return()=>queries.forEach(query=>query.removeEventListener?.("change",update));
 },[]);
 return <div className="public-glass-optics" aria-hidden="true"><MaterialBoundary><Suspense fallback={null}><Material
  radius={28} quality="low" effectMode={simple?"blur":"auto"} mobileFallback="css-only" reveal="immediate"
  backdropSelector="[data-page='profile']:not(.hidden) .profile-artwork-background"
  blur={8} scale={36} saturation={125} dispersion={8} aberrationIntensity={0.15}
  glassColor={dark?"rgba(24,26,32,0.28)":"rgba(255,255,255,0.3)"}
  style={{width:"100%",height:"100%",pointerEvents:"none"}}
 ><span/></Material></Suspense></MaterialBoundary></div>;
}
