import { useState } from 'react';
import ExternalCatalog from '@/components/catalog/MusicBrainzCatalog';
/** @param {{item:any, onChange:(value:any)=>void, disabled?:boolean}} props */
export default function CatalogMetadataPicker({item,onChange,disabled=false}) {
  const [open,setOpen]=useState(false);
  const [query,setQuery]=useState('');
  const [applied,setApplied]=useState(false);
  return <div className="rounded-xl border border-border p-3">
    <button type="button" className="text-xs font-semibold min-h-9" disabled={disabled} aria-expanded={open} onClick={()=>{if(!open)setQuery([item.title,item.artist].filter(Boolean).join(' '));setOpen(v=>!v);}}>Find catalog metadata</button>
    {applied && <p role="status" className="text-xs text-muted-foreground">Details applied. Review before uploading.</p>}
    {open && <><p className="text-xs text-muted-foreground mb-2">Find a matching recording to fill its title, artist, album, and year. Choose the correct release. Audio, artwork, genre, and explicit settings stay as selected.</p><label className="block text-xs">Song or artist<input className="w-full mt-1 rounded-lg border bg-background px-3 py-2 text-sm" value={query} maxLength={200} onChange={e=>setQuery(e.target.value)} disabled={disabled}/></label><ExternalCatalog query={query} active={open&&!disabled} duration={item.duration} onSelect={value=>{if(disabled)return;onChange(value);setApplied(true);setOpen(false);}} disabled={disabled}/></>}
  </div>;
}
