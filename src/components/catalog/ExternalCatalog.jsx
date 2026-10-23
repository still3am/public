import { useEffect, useState } from 'react';
import { ExternalLink, Loader2, Music2 } from 'lucide-react';
import { catalogDetails, catalogLink, searchExternalCatalog, uploadMetadata } from '@/lib/externalCatalog';
import './external-catalog.css';

/** @param {{query: string, active?: boolean, allowExplicit?: boolean, onSelect?: (value: any) => void, disabled?: boolean}} props */
export default function ExternalCatalog({query, active = true, allowExplicit = false, onSelect, disabled = false}) {
  const [kind,setKind] = useState('song');
  const [state,setState] = useState({rows:[],loading:false,error:''});
  const [retry,setRetry] = useState(0);
  const [selected,setSelected] = useState(null);
  const [detail,setDetail] = useState({value:null,loading:false,error:''});
  const term = query.trim();
  useEffect(() => {
    setSelected(null);setDetail({value:null,loading:false,error:''});
    setState({rows:[],loading:active && term.length >= 2,error:''});
    if (!active || term.length < 2) return;
    const controller = new AbortController();
    const timer = setTimeout(() => {
      searchExternalCatalog(term,kind,{signal:controller.signal}).then(rows => {
        if (!controller.signal.aborted) setState({rows,loading:false,error:''});
      }).catch(error => {if (!controller.signal.aborted) setState({rows:[],loading:false,error:error.message});});
    },400);
    return () => {clearTimeout(timer);controller.abort();};
  },[term,kind,active,retry]);
  useEffect(() => {
    setDetail({value:null,loading:!!selected,error:''});
    if (!selected || !active) return;
    const controller = new AbortController();
    catalogDetails(kind,selected,{signal:controller.signal}).then(value => {
      if (!controller.signal.aborted) setDetail({value,loading:false,error:''});
    }).catch(error => {if (!controller.signal.aborted) setDetail({value:null,loading:false,error:error.message});});
    return () => controller.abort();
  },[selected,kind,active]);
  const rows = state.rows.filter(row => allowExplicit || !row.explicit_lyrics);
  const value = detail.value;
  const fields = value ? [
    ['Title / name',value.title || value.name],['Artist',value.artist?.name],['Album',value.album?.title],
    ['Released',value.release_date],['Duration',value.duration ? `${Math.floor(value.duration/60)}:${String(value.duration%60).padStart(2,'0')}` : ''],
    ['ISRC',value.isrc],['UPC',value.upc],['Label',value.label],['Genres',value.genres?.data?.map(g=>g.name).join(', ')],
    ['Tracks',value.nb_tracks],['Albums',value.nb_album],['Content',value.explicit_lyrics === true ? 'Explicit' : value.explicit_lyrics === false ? 'Clean' : ''],
  ].filter(([,v])=>v !== undefined && v !== null && v !== '') : [];
  return <section className="external-catalog" aria-label="External music catalog">
    {!onSelect && <><h2>More search results</h2><p>Explore songs, artists, and albums on Deezer. Catalog details only; audio must be uploaded separately.</p>
    <div className="catalog-tabs" aria-label="Catalog category">{[['song','Songs'],['artist','Artists'],['album','Albums']].map(([key,label])=><button type="button" key={key} aria-pressed={kind===key} onClick={()=>{setKind(key);setSelected(null);}}>{label}</button>)}</div></>}
    {term.length < 2 ? <p>Enter at least two characters to search.</p> : state.loading ? <p role="status"><Loader2 size={16} className="animate-spin"/> Searching Deezer…</p> : state.error ? <p role="alert">{state.error} <button type="button" onClick={()=>setRetry(n=>n+1)}>Retry</button></p> : !rows.length ? <p>No catalog matches. Try another title or artist.</p> :
    <ul className="catalog-results">{rows.map(row=>{const image=row.album?.cover_medium || row.cover_medium || row.picture_medium;return <li key={row.id}>
      {image ? <img src={image} alt="" loading="lazy" referrerPolicy="no-referrer"/> : <Music2 size={36}/>}
      <div><strong>{row.title || row.name}</strong><span>{row.artist?.name || 'Artist'}{row.album?.title ? ` · ${row.album.title}` : ''}{row.explicit_lyrics ? ' · Explicit' : ''}</span></div>
      <button type="button" aria-expanded={selected===row.id} onClick={()=>setSelected(selected===row.id?null:row.id)}>Details</button>
    </li>;})}</ul>}
    {selected && <div className="catalog-detail" aria-label="Catalog metadata">
      <button type="button" className="catalog-close" onClick={()=>setSelected(null)}>Close details</button>
      {detail.loading ? <p role="status">Loading metadata…</p> : detail.error ? <p role="alert">{detail.error}<button type="button" onClick={()=>{setSelected(null);setRetry(n=>n+1);}}>Retry search</button></p> : value && <>
        <dl>{fields.map(([label,text])=><div key={label}><dt>{label}</dt><dd>{text}</dd></div>)}</dl>
        {catalogLink(value.link) && <a href={catalogLink(value.link)} target="_blank" rel="noopener noreferrer">Open on Deezer <ExternalLink size={13}/></a>}
        {onSelect && <button type="button" className="playlist-action" disabled={disabled || (!allowExplicit && value.explicit_lyrics)} onClick={()=>onSelect(uploadMetadata(value))}>Use these details</button>}
      </>}
    </div>}
  </section>;
}
