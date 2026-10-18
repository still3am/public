import {useState} from "react";
import {NOTE_EMOJIS} from "@/lib/noteEmojis";
const categories=[...new Set(NOTE_EMOJIS.map(row=>row[2]))];
const tones=["","🏻","🏼","🏽","🏾","🏿"];
const withoutTone=emoji=>emoji.replace(/[\u{1F3FB}-\u{1F3FF}]/gu,"");
const variants=new Map();
NOTE_EMOJIS.forEach(row=>{const key=withoutTone(row[0]);if(!variants.has(key))variants.set(key,[]);variants.get(key).push(row);});
export default function NoteEmojiPicker({selected,onSelect,disabled=false}) {
 const [query,setQuery]=useState(""),[category,setCategory]=useState(categories[0]),[tone,setTone]=useState("");
 const term=query.trim().toLowerCase();
 const choices=NOTE_EMOJIS.filter(([emoji,label,group])=>{
  if(term)return emoji.includes(term)||label.toLowerCase().includes(term);
  if(group!==category)return false;
  const family=variants.get(withoutTone(emoji));
  const preferred=tone&&family.find(([value])=>value.includes(tone));
  return preferred?emoji===preferred[0]:!/[\u{1F3FB}-\u{1F3FF}]/u.test(emoji);
 });
 return <div className="note-emoji-picker" role="group" aria-label="Choose a note emoji">
  <input type="search" aria-label="Search note emojis" placeholder="Search all emojis…" value={query} onChange={event=>setQuery(event.target.value)} disabled={disabled}/>
  <div className="note-emoji-filters"><label>Category<select aria-label="Emoji category" value={category} disabled={disabled} onChange={event=>{setCategory(event.target.value);setQuery("");}}>{categories.map(value=><option key={value}>{value}</option>)}</select></label><label>Skin tone<select aria-label="Emoji skin tone" value={tone} disabled={disabled} onChange={event=>setTone(event.target.value)}>{tones.map((value,index)=><option key={value} value={value}>{index===0?"Default":value+" Tone "+index}</option>)}</select></label></div>
  <div className="note-emoji-grid" key={term||category+tone}>{choices.map(([emoji,label])=><button type="button" key={emoji} disabled={disabled} aria-label={label} title={label} aria-pressed={selected===emoji} onClick={()=>onSelect(emoji)}>{emoji}</button>)}</div>
  {!choices.length&&<p className="text-xs text-muted-foreground py-3">No matching emojis. Try another word.</p>}
 </div>;
}
