import {useCallback,useEffect,useState} from "react";
const KEY="public-theme",ACCENT_KEY="public-accent",EVENT="public-theme-change";
export const ACCENT_OPTIONS=[
 {id:"public",name:"PUBLIC blue",hue:222,saturation:82},
 {id:"violet",name:"Violet",hue:270,saturation:78},
 {id:"pink",name:"Pink",hue:332,saturation:78},
 {id:"red",name:"Red",hue:4,saturation:76},
 {id:"orange",name:"Orange",hue:25,saturation:84},
 {id:"green",name:"Green",hue:148,saturation:65},
 {id:"teal",name:"Teal",hue:185,saturation:78},
];
const systemTheme=()=>{try{return window.matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light";}catch{return "light";}};
const stored=()=>{try{const value=localStorage.getItem(KEY);return ["dark","light"].includes(value)?value:null;}catch{return null;}};
const storedAccent=()=>{try{const value=localStorage.getItem(ACCENT_KEY);return ACCENT_OPTIONS.some(option=>option.id===value)?value:null;}catch{return null;}};
const accentOption=id=>ACCENT_OPTIONS.find(option=>option.id===id)||ACCENT_OPTIONS[0];
let current=stored()||systemTheme(),explicit=!!stored(),currentAccent=storedAccent()||"public";
function applyAccentVariables(id=currentAccent,isDark=current==="dark"){
 const option=accentOption(id),root=document.documentElement;
 root.style.setProperty("--primary",`${option.hue} ${option.saturation}% 39%`);
 root.style.setProperty("--primary-foreground","0 0% 100%");
 root.style.setProperty("--ring",`${option.hue} ${option.saturation}% ${isDark?68:42}%`);
 root.style.setProperty("--accent",`${option.hue} ${Math.round(option.saturation*.32)}% ${isDark?19:95}%`);
 root.style.setProperty("--accent-foreground",`${option.hue} ${option.saturation}% ${isDark?78:34}%`);
 root.style.setProperty("--sidebar-primary",`${option.hue} ${option.saturation}% 39%`);
 root.style.setProperty("--sidebar-primary-foreground","0 0% 100%");
 root.style.setProperty("--sidebar-ring",`${option.hue} ${option.saturation}% ${isDark?68:42}%`);
 root.style.setProperty("--sidebar-accent",`${option.hue} ${Math.round(option.saturation*.32)}% ${isDark?19:95}%`);
 root.style.setProperty("--sidebar-accent-foreground",`${option.hue} ${option.saturation}% ${isDark?78:34}%`);
}
function notify(){window.dispatchEvent(new CustomEvent(EVENT,{detail:{theme:current,accent:currentAccent}}));}
if(typeof document!=="undefined"){
 document.documentElement.classList.toggle("dark",current==="dark");
 document.documentElement.style.colorScheme=current;
 applyAccentVariables(currentAccent,current==="dark");
}
function apply(next,persist=false){
 current=next;
 if(persist){explicit=true;try{localStorage.setItem(KEY,next);}catch{}}
 document.documentElement.classList.toggle("dark",next==="dark");
 document.documentElement.style.colorScheme=next;
 applyAccentVariables(currentAccent,next==="dark");
 notify();
}
function applyAccent(next,persist=false){
 currentAccent=accentOption(next).id;
 if(persist){try{localStorage.setItem(ACCENT_KEY,currentAccent);}catch{}}
 applyAccentVariables(currentAccent,current==="dark");
 notify();
}
export function useTheme(){
 const [theme,setState]=useState(current),[accent,setAccentState]=useState(currentAccent);
 useEffect(()=>{
  const update=event=>{setState(event.detail?.theme||current);setAccentState(event.detail?.accent||currentAccent);};
  const storage=event=>{
   if(event.key!==KEY&&event.key!==ACCENT_KEY&&event.key!==null)return;
   explicit=!!stored();currentAccent=storedAccent()||"public";
   apply(stored()||systemTheme());
  };
  const media=window.matchMedia?.("(prefers-color-scheme: dark)");
  const os=()=>{if(!explicit)apply(systemTheme());};
  window.addEventListener(EVENT,update);window.addEventListener("storage",storage);media?.addEventListener?.("change",os);
  document.documentElement.classList.toggle("dark",current==="dark");document.documentElement.style.colorScheme=current;applyAccentVariables(currentAccent,current==="dark");
  return()=>{window.removeEventListener(EVENT,update);window.removeEventListener("storage",storage);media?.removeEventListener?.("change",os);};
 },[]);
 const setTheme=useCallback(value=>apply(value==="dark"?"dark":"light",true),[]);
 const toggle=useCallback(()=>apply(current==="dark"?"light":"dark",true),[]);
 const setAccent=useCallback(value=>applyAccent(value,true),[]);
 return {theme,setTheme,toggle,isDark:theme==="dark",accent,setAccent,accentOptions:ACCENT_OPTIONS};
}
