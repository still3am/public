import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Disc3, ChevronRight } from "lucide-react";
import { useCoverUrl } from "@/hooks/useCoverUrl";

export default function ArtistRow({ artist }) {
  const candidates=[...new Set([...(artist.cover_candidates||[]),artist.avatar_url,artist.cover_art_url].filter(value=>typeof value==="string"&&value.trim()))];
  const signature=JSON.stringify(candidates);
  const [failed,setFailed]=useState(()=>new Set());
  useEffect(()=>setFailed(new Set()),[artist.id,signature]);
  const source=candidates.find(value=>!failed.has(value))||"";
  const art=useCoverUrl(source);
  return <Link to={`/artist?name=${encodeURIComponent(artist.name||"")}`} className="artist-search-row w-full flex items-center gap-3 p-2.5 rounded-xl hover:bg-foreground/[0.03] transition text-left">
    <div className="w-12 h-12 rounded-full overflow-hidden bg-foreground/10 shrink-0 grid place-items-center">
      {art?<img key={source} src={art} alt="" loading="lazy" className="w-full h-full object-cover" onError={()=>setFailed(previous=>new Set([...previous,source]))}/>:<Disc3 size={20} className="text-foreground/40"/>}
    </div>
    <div className="min-w-0 flex-1"><div className="text-sm font-semibold truncate">{artist.name}</div><div className="text-xs text-muted-foreground mt-0.5">Artist</div></div>
    <ChevronRight size={16} className="shrink-0 text-muted-foreground" aria-hidden="true"/>
  </Link>;
}
