import ArtistAliases from "@/components/ArtistAliases";
import {DropdownMenu,DropdownMenuTrigger,DropdownMenuContent,DropdownMenuItem} from "@/components/ui/dropdown-menu";
import {shareLink} from "@/lib/shareLink";
import ArtistReleaseFollow from "@/components/ArtistReleaseFollow";
import ScrollShelf from "@/components/ScrollShelf";
import LoadError from '@/components/LoadError';
import {useRef} from 'react';
import { useEffect, useState, useMemo } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { getArtists, getPublishedTracks } from "@/lib/catalogCache";
import { artistTrackRole } from "@/lib/artistTrackRole";
import { fetchArtistTracks } from "@/lib/artistTracks";
import SafetyControls from '@/components/SafetyControls';
import TrackCard from "@/components/TrackCard";
import PullToRefresh from "@/components/PullToRefresh";
import ArtistNameEditor from "@/components/ArtistNameEditor";
import CollapsibleText from "@/components/CollapsibleText";
import TrackRow from "@/components/TrackRow";
import LibraryButton from "@/components/LibraryButton";
import { useCoverUrl } from "@/hooks/useCoverUrl";
import { usePlayer } from "@/context/PlayerContext";
import { useAuth } from "@/lib/AuthContext";
import { useToast } from "@/components/ui/use-toast";
import {
  ChevronLeft,
  ChevronRight,
  MoreHorizontal, Share2, Shuffle, Info,
  Loader2,
  Music,
  Mic2,
  Sparkles,
  Globe,
  Calendar,
  Users,
  MapPin,
  Disc3,
  Headphones,
  Play, Pause,
  ExternalLink } from
"lucide-react";

function safeUrl(u) {
  if (!u) return undefined;
  try {
    const parsed = new URL(u);
    return parsed.protocol === "http:" || parsed.protocol === "https:" ?
    parsed.href :
    undefined;
  } catch {
    return undefined;
  }
}

const mkSocial = (url, icon, label) => {
  const href = safeUrl(url);
  return href ? { href, icon, label } : null;
};

function ArtistArtwork({source,className}) {
  const url = useCoverUrl(source);
  const [failed,setFailed] = useState(false);
  useEffect(() => setFailed(false), [url]);
  return url && !failed ? <img src={url} alt="" className={className} onError={() => setFailed(true)} /> : <div aria-hidden="true" className={className + " artist-art-fallback"}><Mic2 size={36} /></div>;
}

/** @param {any} props */
function Pill({ icon: Icon, children }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-foreground/55 bg-foreground/[0.05] rounded-full px-2.5 py-1">
      {Icon && <Icon size={12} />}
      <span className="truncate max-w-[160px]">{children}</span>
    </span>);

}

/** @param {any} props */
function SocialChip({ href, icon: Icon, label }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className="inline-flex items-center gap-1.5 text-xs font-semibold text-foreground/70 hover:text-foreground bg-foreground/[0.05] hover:bg-foreground/[0.09] rounded-full px-3 py-1.5 transition active:scale-95">
      
      <Icon size={13} /> {label}
      <ExternalLink size={10} className="text-foreground/35" />
    </a>);

}

/** @param {any} props */
function SectionTitle({ icon: Icon, children, right }) {
  return (
    <div className="artist-section-heading flex items-center justify-between gap-3 mb-3">
      <h2 className="text-base md:text-lg font-extrabold tracking-tight flex items-center gap-2">
        <Icon size={17} className="text-foreground/60 hidden" />
        {children}
      </h2>
      {right}
    </div>);

}

/** @param {any} props */
export default function PublicRecords({ id: propId, fallbackArtist = null }) {
  const { id: paramId } = useParams();
  const id = propId || paramId;
  const nav = useNavigate();
  const { toast } = useToast();
  const p = usePlayer();
  const { user } = useAuth();
  const [artist, setArtist] = useState(null);
  const [tracks, setTracks] = useState([]);
  const [similarArtists,setSimilarArtists] = useState([]);
  useEffect(() => {
    let active = true;
    setSimilarArtists([]);
    if (!artist?.name || !tracks.length) return;
    const normalize = value => String(value || "").trim().replace(/\s+/g," ").toLowerCase();
    const genres = new Set(tracks.map(track => normalize(track.genre)).filter(Boolean));
    if (!genres.size) return;
    Promise.all([getArtists(),getPublishedTracks()]).then(([artists,catalog]) => {
      const byName = new Map();
      for (const track of catalog) {
        const key = normalize(track.artist);
        if (!key || key === normalize(artist.name)) continue;
        if (!byName.has(key)) byName.set(key,{name:track.artist,genres:new Set(),cover:track.cover_art_url,plays:0});
        const row = byName.get(key);
        if (track.genre) row.genres.add(normalize(track.genre));
        if (!row.cover && track.cover_art_url) row.cover = track.cover_art_url;
        row.plays += Number(track.play_count) || 0;
      }
      const seen = new Set(),picks = [];
      for (const candidate of artists) {
        const key = normalize(candidate.name),row = byName.get(key);
        if (!row || seen.has(key)) continue;
        seen.add(key);
        const shared = [...row.genres].filter(genre => genres.has(genre)).length;
        if (shared) picks.push({...candidate,image:candidate.avatar_url || candidate.cover_art_url || row.cover,shared,plays:row.plays});
      }
      picks.sort((a,b)=>b.shared-a.shared || b.plays-a.plays || a.name.localeCompare(b.name));
      if(active)setSimilarArtists(picks.slice(0,12));
    }).catch(()=>{});
    return () => {active=false;};
  }, [artist?.name,tracks]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [query,setQuery]=useState(""),[sort,setSort]=useState("recent");
  const [songsExpanded,setSongsExpanded]=useState(false);
  const songPreviewLimit=6;
  const mainTracks = useMemo(() => tracks.filter(track => artistTrackRole(track,artist?.name) === "lead"), [tracks,artist?.name]);
  const appearanceTracks = useMemo(() => tracks.filter(track => artistTrackRole(track,artist?.name) === "appearance"), [tracks,artist?.name]);
  const visibleTracks=useMemo(()=>{const term=query.trim().toLowerCase(),list=mainTracks.filter(t=>!term||[t.title,t.artist,t.uploader_name].some(value=>(value||"").toLowerCase().includes(term)));if(sort==="popular")list.sort((a,b)=>(b.play_count||0)-(a.play_count||0));if(sort==="title")list.sort((a,b)=>(a.title||"").localeCompare(b.title||""));return list;},[mainTracks,query,sort]);

  const loadVersion=useRef(0);
  const [loadError,setLoadError]=useState(false);
  async function load() {
    const request=++loadVersion.current;(request===loadVersion.current)&&setLoadError(false);
    (request===loadVersion.current)&&setLoading(true);
    try {
      const a = fallbackArtist || await base44.entities.Artist.get(id);
      (request===loadVersion.current)&&setArtist(a);
      const list=a?.name?await fetchArtistTracks(a.name):[];
      if(request===loadVersion.current)setTracks(list);
    } catch {(request===loadVersion.current)&&setLoadError(true);
    } finally {
      (request===loadVersion.current)&&setLoading(false);
    }
  }

  useEffect(() => {
    setArtist(null);setTracks([]);setQuery("");setSort("recent");setSongsExpanded(false);load();
    return()=>{loadVersion.current++;};
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id,fallbackArtist?.name,user?.id,user?.show_explicit,user?.adult_confirmed]);

  useEffect(() => {
    const refreshCatalog = () => load();
    window.addEventListener("catalog:invalidate", refreshCatalog);
    return () => window.removeEventListener("catalog:invalidate", refreshCatalog);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id,fallbackArtist?.name,user?.id,user?.show_explicit,user?.adult_confirmed]);

  async function generateHistory() {
    if(generating||!id||user?.role!=="admin")return;
    setGenerating(true);
    try {
      const res = await base44.functions.invoke("generateArtistHistory", { artist_id: id });
      const history = res?.data?.history;
      if (history) {
        setArtist((prev) => prev ? { ...prev, history_text: history } : prev);
        toast({ title: "Artist history generated" });
      } else {
        toast({ title: "Couldn't generate history", variant: "destructive" });
      }
    } catch (e) {
      toast({
        title: e?.response?.data?.error || "Couldn't generate history",
        variant: "destructive"
      });
    } finally {
      setGenerating(false);
    }
  }

  if(loadError&&!artist)return <LoadError onRetry={load}/>;
  if (loading) {
    return (
      <div className="py-24 grid place-items-center">
        <Loader2 className="animate-spin text-foreground/40" />
      </div>);

  }

  if (!artist) {
    return (
      <div className="max-w-md mx-auto py-24 px-6 text-center">
        <div className="w-16 h-16 rounded-2xl bg-foreground/[0.06] grid place-items-center mx-auto mb-4">
          <Mic2 size={28} className="text-foreground/40" />
        </div>
        <h2 className="text-xl font-extrabold tracking-tight mb-1">Artist not found</h2>
        <p className="text-sm text-foreground/50">This Public Record doesn’t exist or was removed.</p>
      </div>);

  }

  const socials = [
  mkSocial(artist.website, Globe, "Website"),
  mkSocial(artist.spotify_url, Disc3, "Spotify"),
  mkSocial(artist.soundcloud_url, Headphones, "SoundCloud"),
  artist.instagram && {
    href: `https://instagram.com/${artist.instagram.replace(/^@/, "")}`,
    icon: Globe,
    label: artist.instagram
  }].
  filter(Boolean);

  const meta = [
  artist.location && { icon: MapPin, label: artist.location },
  artist.formed_year && { icon: Calendar, label: artist.formed_year },
  artist.members && { icon: Users, label: artist.members }].
  filter(Boolean);

  const topCover = [...tracks].
  sort((a, b) => (b.play_count || 0) - (a.play_count || 0)).
  find((t) => t.cover_art_url)?.cover_art_url;

  const latestTrack = [...mainTracks].sort((a,b) => (Date.parse(b.created_date)||0) - (Date.parse(a.created_date)||0))[0];
  const topTracks = [...mainTracks].sort((a,b) => (b.play_count||0) - (a.play_count||0)).slice(0,18);
  const isAdmin = !!user && user.role === "admin";
  const artistQueue=visibleTracks.length?visibleTracks:mainTracks.length?mainTracks:appearanceTracks;
  const artistActive=artistQueue.length>0&&p.queue?.length===artistQueue.length&&artistQueue.every((track,index)=>p.queue[index]?.id===track.id)&&artistQueue.some(track=>track.id===p.currentTrack?.id);
  const artistPlaying=artistActive&&p.isPlaying;
  const playAll=()=>{if(artistActive)p.togglePlay();else {p.setShuffle(false);p.playTrackAt(artistQueue);}};
  async function shuffleArtist(){
    const queue=[...artistQueue];
    for(let i=queue.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[queue[i],queue[j]]=[queue[j],queue[i]];}
    try{p.setShuffle(false);await p.playTrackAt(queue,0);}catch{toast({title:"This artist’s music could not start. Please retry.",variant:"destructive"});}
  }
  async function shareArtist(){
    try{const result=await shareLink({title:artist.name+" on PUBLIC",url:window.location.origin+(id?"/records/"+encodeURIComponent(id):"/artist?name="+encodeURIComponent(artist.name))});if(result==="copied")toast({title:"Artist link copied"});}
    catch{toast({title:"This artist link could not be shared. Please retry.",variant:"destructive"});}
  }
  const aboutArtist=()=>document.getElementById("artist-about")?.scrollIntoView({behavior:window.matchMedia("(prefers-reduced-motion: reduce)").matches?"auto":"smooth"});
  const latestDate=latestTrack?.created_date&&Number.isFinite(Date.parse(latestTrack.created_date))?new Date(latestTrack.created_date).toLocaleDateString(undefined,{month:"short",day:"numeric",year:"numeric"}):"";

  return (
    <PullToRefresh onRefresh={load}>
      <div className="artist-page artist-editorial mx-auto pb-12">
        <section className="artist-hero">
          <ArtistArtwork source={topCover || artist.cover_art_url || artist.avatar_url} className="artist-hero-image" />
          <div className="artist-hero-shade" />
          <button onClick={() => window.history.state?.idx > 0 ? nav(-1) : nav("/search")} className="artist-back" aria-label="Back"><ChevronLeft size={25} /></button>
          <ArtistReleaseFollow key={(user?.id||"guest")+":"+artist.name} name={artist.name}/>
          <div className="artist-hero-bottom">
            <div className="artist-hero-name min-w-0">
              <p className="artist-eyebrow">Artist on PUBLIC</p>
              <ArtistNameEditor artist={artist} canEdit={!!user && !!id} onSaved={name => setArtist(prev => prev ? {...prev,name} : prev)} />
              <p className="artist-track-count">{mainTracks.length} {mainTracks.length === 1 ? "song" : "songs"}{appearanceTracks.length > 0 && ` · ${appearanceTracks.length} appearances`}</p>
            </div>
            {tracks.length > 0 && <button onClick={playAll} className="artist-play" aria-label={(artistPlaying?"Pause ":"Play ") + artist.name}>{artistPlaying?<Pause size={26} fill="currentColor"/>:<Play size={26} fill="currentColor"/>}</button>}
          </div>
        </section>

        <div className="artist-feature-grid">
        {latestTrack && <section className="artist-latest">
          <button className="artist-latest-cover" onClick={() => {if(p.currentTrack?.id===latestTrack.id)p.togglePlay();else p.playTrackAt(mainTracks, mainTracks.findIndex(track => track.id === latestTrack.id));}} aria-label={(p.currentTrack?.id===latestTrack.id&&p.isPlaying?"Pause ":"Play ") + latestTrack.title}><ArtistArtwork source={latestTrack.cover_art_url} className="w-full h-full object-cover" /></button>
          <div className="min-w-0 flex-1">
            <p className="eyebrow text-muted-foreground mb-2">Recently added to PUBLIC</p>
            <Link to={"/track/" + latestTrack.id} className="artist-latest-title">{latestTrack.title}</Link>
            <p className="text-sm text-muted-foreground mt-1 truncate">{latestTrack.artist || artist.name}</p>
            <div className="mt-2"><LibraryButton track={latestTrack} /></div>
          </div>
        </section>}

        {topTracks.length > 0 && <section className="artist-top-songs">
          <SectionTitle icon={Music} right={<button className="text-xs text-muted-foreground px-2 py-2" onClick={() => {setSongsExpanded(true);requestAnimationFrame(() => document.getElementById("artist-discography")?.scrollIntoView({behavior:window.matchMedia("(prefers-reduced-motion: reduce)").matches?"auto":"smooth"}));}}>All songs <ChevronRight size={14} className="inline" /></button>}>Top Songs</SectionTitle>
          <ScrollShelf className="artist-top-list" label="Artist top songs">{Array.from({length:Math.ceil(topTracks.length/3)},(_,column)=><div className="artist-top-column" key={column}>{topTracks.slice(column*3,column*3+3).map((track,index)=><TrackRow key={track.id} track={track} index={column*3+index} queue={topTracks} queueIndex={column*3+index} />)}</div>)}</ScrollShelf>
        </section>}

        </div>
        {/* Discography */}
        <section id="artist-discography" className="artist-discography mb-8">
          <SectionTitle icon={Disc3} right={
          <span className="text-xs font-semibold text-foreground/40 bg-foreground/[0.05] rounded-full px-2.5 py-1">
              {mainTracks.length}
            </span>
          }>
            Songs
          </SectionTitle>
          {mainTracks.length>0&&<div className="collection-tools"><input aria-label="Search artist discography" placeholder="Find a song" value={query} onChange={e=>setQuery(e.target.value)} onKeyDown={e=>{if(e.key==="Escape")setQuery("");}}/><select aria-label="Sort artist discography" value={sort} onChange={e=>setSort(e.target.value)}><option value="recent">Newest</option><option value="popular">Most played</option><option value="title">Title A–Z</option></select></div>}
          {mainTracks.length === 0 ?
          <div className="rounded-2xl border border-dashed border-border py-10 text-center px-6">
              <Music size={22} className="text-foreground/35 mx-auto mb-2" />
              <p className="text-sm text-foreground/50">No lead-artist songs are listed yet. Featured songs are shown in Appears On.</p>
            </div> :

          <div id="artist-song-grid" className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 md:gap-4">
              {!visibleTracks.length&&<div className="collection-empty col-span-full"><h2>No matching songs</h2><button className="playlist-action" onClick={()=>setQuery("")}>Show all songs</button></div>}
              {(songsExpanded || query.trim() ? visibleTracks : visibleTracks.slice(0,songPreviewLimit)).map((t) =>
            <TrackCard key={t.id} track={t} queue={visibleTracks}/>
            )}
            </div>
          }
          {!query.trim() && visibleTracks.length > songPreviewLimit && <div className="flex items-center justify-between gap-3 mt-5">
            <span className="text-xs text-muted-foreground">{songsExpanded ? visibleTracks.length : songPreviewLimit} of {visibleTracks.length} songs</span>
            <button type="button" aria-expanded={songsExpanded} aria-controls="artist-song-grid" className="playlist-action px-4 py-2.5 text-sm" onClick={() => {
              setSongsExpanded(value => !value);
              if(songsExpanded)requestAnimationFrame(() => document.getElementById("artist-discography")?.scrollIntoView({behavior:window.matchMedia("(prefers-reduced-motion: reduce)").matches?"auto":"smooth"}));
            }}>{songsExpanded ? "Show less" : "Show all songs"}</button>
          </div>}
        </section>
        {appearanceTracks.length > 0 && <section className="artist-appears-on">
          <SectionTitle icon={Disc3}>Appears On</SectionTitle>
          <ScrollShelf className="artist-appears-list" label="Featured appearances">
            {appearanceTracks.map(track=><div className="artist-appears-card" key={track.id}><TrackCard track={track} queue={appearanceTracks} /></div>)}
          </ScrollShelf>
        </section>}
        {(artist.bio || meta.length > 0 || socials.length > 0 || artist.history_text || tracks.some(track=>track.genre) || isAdmin) && <section className="artist-about">
          <SectionTitle icon={Mic2}>About {artist.name}</SectionTitle>
          <ArtistAliases artist={artist} onSaved={aliases=>setArtist(previous=>({...previous,aliases}))}/>
          {artist.bio && <CollapsibleText text={artist.bio} className="artist-about-copy selectable-content leading-relaxed" clampClass="max-h-28" />}
          <dl className="artist-facts">
            {artist.location && <div><dt>From</dt><dd>{artist.location}</dd></div>}
            {artist.formed_year && <div><dt>Formed</dt><dd>{artist.formed_year}</dd></div>}
            {artist.members && <div><dt>Members</dt><dd>{artist.members}</dd></div>}
            {tracks.some(track=>track.genre) && <div><dt>Genre</dt><dd>{[...new Set(tracks.map(track=>track.genre).filter(Boolean))].slice(0,4).join(" · ")}</dd></div>}
          </dl>
          {socials.length > 0 && <div className="flex flex-wrap gap-2 mt-4">{socials.map((s,i) => <SocialChip key={i} href={s.href} icon={s.icon} label={s.label} />)}</div>}
          {artist.history_text && <div className="mt-6"><h3 className="font-semibold mb-3">History</h3><CollapsibleText text={artist.history_text} className="selectable-content text-sm text-muted-foreground leading-relaxed whitespace-pre-line" /></div>}
          {isAdmin && id && <button onClick={generateHistory} disabled={generating} className="playlist-action inline-flex items-center gap-2 px-4 py-2.5 mt-5 text-xs">{generating ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}{generating ? "Generating…" : artist.history_text ? "Regenerate history" : "Generate history"}</button>}
        </section>}
        {similarArtists.length > 0 && <section className="artist-similar">
          <SectionTitle icon={Users}>Similar Artists</SectionTitle>
          <p className="text-xs text-muted-foreground mb-4">More artists in the same genres.</p>
          <ScrollShelf className="artist-similar-list" label="Similar artists">
            {similarArtists.map(candidate=><Link className="artist-similar-card" key={candidate.id} to={"/records/"+candidate.id}><ArtistArtwork source={candidate.image} className="artist-similar-image" /><span>{candidate.name}</span></Link>)}
          </ScrollShelf>
        </section>}
        {id && <SafetyControls type="artist" id={id} label="artist page" />}
      </div>
    </PullToRefresh>);

}