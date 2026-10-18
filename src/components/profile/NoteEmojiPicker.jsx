import {useState} from "react";
import {NOTE_EMOJIS} from "@/lib/noteEmojis";
const recentKey="public:note-recent-emojis";
const catalogValues=new Set(NOTE_EMOJIS.map(row=>row[0]));
function readRecent(){try{const saved=JSON.parse(localStorage.getItem(recentKey)||"[]");return Array.isArray(saved)?saved.filter(value=>catalogValues.has(value)).slice(0,12):[];}catch{return [];}}
const categories=["All emojis",...new Set(NOTE_EMOJIS.map(row=>row[2]))];
const tones=["","🏻","🏼","🏽","🏾","🏿"];
const toneNames=["Default","Light","Medium light","Medium","Medium dark","Dark"];
const withoutTone=emoji=>emoji.replace(/[\u{1F3FB}-\u{1F3FF}]/gu,"");
const variants=new Map();
NOTE_EMOJIS.forEach(row=>{const key=withoutTone(row[0]);if(!variants.has(key))variants.set(key,[]);variants.get(key).push(row);});
export default function NoteEmojiPicker({selected,onSelect,disabled=false}) {
 const [query,setQuery]=useState(""),[category,setCategory]=useState("All emojis"),[tone,setTone]=useState("all");
 const [recent]=useState(readRecent);
 function choose(value){try{localStorage.setItem(recentKey,JSON.stringify([value,...readRecent().filter(item=>item!==value)].slice(0,12)));}catch{/* Private browsing may disable storage. */}onSelect(value);}
 const term=query.trim().toLowerCase();
 const choices=NOTE_EMOJIS.filter(([emoji,label,group])=>{
  if(term)return emoji.includes(term)||label.toLowerCase().includes(term);
  if(category!=="All emojis"&&group!==category)return false;
  if(tone==="all")return true;
  const family=variants.get(withoutTone(emoji));
  const preferred=tone&&family.find(([value])=>value.includes(tone));
  return preferred?emoji===preferred[0]:!/[\u{1F3FB}-\u{1F3FF}]/u.test(emoji);
 });
 return <div className="note-emoji-picker" role="group" aria-label="Choose a note emoji">
  <input type="search" aria-label="Search note emojis" placeholder="Search all emojis…" value={query} onChange={event=>{setQuery(event.target.value);}} onKeyDown={event=>{if(event.key==="Escape"&&query){event.preventDefault();event.stopPropagation();setQuery("");}}} disabled={disabled}/>
  {!term&&recent.length>0&&<div className="note-emoji-recent"><p>Recently used</p><div className="note-emoji-grid">{recent.map(value=><button type="button" key={value} disabled={disabled} aria-label={NOTE_EMOJIS.find(row=>row[0]===value)?.[1]||value} aria-pressed={selected===value} onClick={()=>choose(value)}>{value}</button>)}</div></div>}
  <div className="note-emoji-filters"><label>Category<select aria-label="Emoji category" value={category} disabled={disabled} onChange={event=>{setCategory(event.target.value);setQuery("");}}>{categories.map(value=><option key={value}>{value}</option>)}</select></label><label>Skin tone<select aria-label="Emoji skin tone" value={tone} disabled={disabled} onChange={event=>{setTone(event.target.value);try{localStorage.setItem("public:note-emoji-tone",event.target.value);}catch{/* Optional preference. */}}}><option value="all">All skin tones</option>{tones.map((value,index)=><option key={value} value={value}>{(value?value+" ":"")+toneNames[index]}</option>)}</select></label></div>
  <p className="note-emoji-results" role="status">{choices.length.toLocaleString()+" "+(term?"matching emojis":category==="All emojis"?"emojis":category.toLowerCase())}</p>
  <div className="note-emoji-grid" key={term||category+tone}>{choices.map(([emoji,label])=><button type="button" key={emoji} disabled={disabled} aria-label={label} title={label} aria-pressed={selected===emoji} onClick={()=>choose(emoji)}>{emoji}</button>)}</div>
  {!choices.length&&<p className="text-xs text-muted-foreground py-3">No matching emojis. Try another word.</p>}
 </div>;
}
