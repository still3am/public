import {createContext,useContext,useState,useEffect,cloneElement} from 'react';
import translations from './translations.json';
export const LANGUAGES=[{code:'en',name:'English'},{code:'es',name:'Español'},{code:'fr',name:'Français'},{code:'zh-CN',name:'简体中文'}];
const KEY='public:language';
const LanguageContext=createContext(null);
export function translateText(text,language,values=[]) {
 if(typeof text!=='string')return text;
 const trimmed=text.trim(),entry=translations[trimmed];
 const result=language==='en'?trimmed:(entry?.[language]||trimmed);
 const spaced=text.slice(0,text.indexOf(trimmed))+result+text.slice(text.indexOf(trimmed)+trimmed.length);
 return spaced.replace(/\{\{(\d+)\}\}/g,(_,i)=>String(values[Number(i)]??''));
}
export function LanguageProvider({children}) {
 const [language,setLanguageState]=useState(()=>{try{const value=localStorage.getItem(KEY);return LANGUAGES.some(l=>l.code===value)?value:'en';}catch{return 'en';}});
 function setLanguage(value){if(!LANGUAGES.some(l=>l.code===value))return;setLanguageState(value);try{localStorage.setItem(KEY,value);}catch{}}
 useEffect(()=>{document.documentElement.lang=language;},[language]);
 useEffect(()=>{const handler=e=>{if(e.key===KEY&&LANGUAGES.some(l=>l.code===e.newValue))setLanguageState(e.newValue);};window.addEventListener('storage',handler);return()=>window.removeEventListener('storage',handler);},[]);
 return <LanguageContext.Provider value={{language,setLanguage}}>{children}</LanguageContext.Provider>;
}
export const useLanguage=()=>useContext(LanguageContext);
export function PublicText({text,values=[]}) {const {language}=useLanguage();return translateText(text,language,values);}
export function PublicElement({element,fields}) {const {language}=useLanguage();const props={};fields.forEach(key=>{props[key]=translateText(element.props[key],language);});return cloneElement(element,props);}
