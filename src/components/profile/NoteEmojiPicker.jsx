import {useState} from "react";
import {NOTE_EMOJIS} from "@/lib/noteEmojis";
export default function NoteEmojiPicker({selected,onSelect,disabled=false}) {
 const [query,setQuery]=useState("");
 const term=query.trim().toLowerCase();
 const choices=NOTE_EMOJIS.filter(([emoji,label])=>!term||emoji.includes(term)||label.toLowerCase().includes(term));
 return <div className="note-emoji-picker" role="group" aria-label="Choose a note emoji">
  <input type="search" aria-label="Search note emojis" placeholder="Search emojis: happy, heart, music…" value={query} onChange={event=>setQuery(event.target.value)} disabled={disabled}/>
  <div className="note-emoji-grid">{choices.map(([emoji,label])=><button type="button" key={emoji} disabled={disabled} aria-label={label} aria-pressed={selected===emoji} onClick={()=>onSelect(emoji)}>{emoji}</button>)}</div>
  {!choices.length&&<p className="text-xs text-muted-foreground py-3">No matching emojis. Try another mood.</p>}
 </div>;
}
