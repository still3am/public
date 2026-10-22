import {useEffect} from "react";
export default function PublicAppearance({user}){
 const enabled=user?.liquid_glass_enabled===true;
 useEffect(()=>{
  document.documentElement.dataset.publicMaterial=enabled?"glass":"default";
  return()=>{delete document.documentElement.dataset.publicMaterial;};
 },[user?.id,enabled]);
 return null;
}
