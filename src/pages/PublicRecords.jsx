import LoadError from '@/components/LoadError';
import {useRef} from 'react';
import { useEffect, useState, useMemo } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
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
  Play,
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
    <div className="flex items-center justify-between gap-3 mb-3">
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
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [query,setQuery]=useState(""),[sort,setSort]=useState("recent");
  const visibleTracks=useMemo(()=>{const term=query.trim().toLowerCase(),list=tracks.filter(t=>!term||[t.title,t.artist,t.uploader_name].some(value=>(value||"").toLowerCase().includes(term)));if(sort==="popular")list.sort((a,b)=>(b.play_count||0)-(a.play_count||0));if(sort==="title")list.sort((a,b)=>(a.title||"").localeCompare(b.title||""));return list;},[tracks,query,sort]);

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
    setArtist(null);setTracks([]);setQuery("");setSort("recent");load();
    return()=>{loadVersion.current++;};
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id,fallbackArtist?.name]);

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

  const latestTrack = [...tracks].sort((a,b) => (Date.parse(b.created_date)||0) - (Date.parse(a.created_date)||0))[0];
  const topTracks = [...tracks].sort((a,b) => (b.play_count||0) - (a.play_count||0)).slice(0,6);
  const isAdmin = !!user && user.role === "admin";
  const playAll = () => p.playTrackAt(visibleTracks.length?visibleTracks:tracks);

  return (
    <PullToRefresh onRefresh={load}>
      <div className="artist-page max-w-5xl mx-auto pb-12">
        <section className="artist-hero">
          <ArtistArtwork source={artist.cover_art_url || topCover} className="artist-hero-image" />
          <div className="artist-hero-shade" />
          <button onClick={() => window.history.state?.idx > 0 ? nav(-1) : nav("/search")} className="artist-back" aria-label="Back"><ChevronLeft size={25} /></button>
          <div className="artist-hero-bottom">
            <div className="artist-hero-name min-w-0">
              <p className="artist-eyebrow">Artist on PUBLIC</p>
              <ArtistNameEditor artist={artist} canEdit={!!user && !!id} onSaved={name => setArtist(prev => prev ? {...prev,name} : prev)} />
              <p className="artist-track-count">{tracks.length} {tracks.length === 1 ? "song" : "songs"}</p>
            </div>
            {tracks.length > 0 && <button onClick={playAll} className="artist-play" aria-label={"Play " + artist.name}><Play size={26} fill="currentColor" /></button>}
          </div>
        </section>

        {latestTrack && <section className="artist-latest">
          <button className="artist-latest-cover" onClick={() => p.playTrackAt(tracks, tracks.findIndex(track => track.id === latestTrack.id))} aria-label={"Play " + latestTrack.title}><ArtistArtwork source={latestTrack.cover_art_url} className="w-full h-full object-cover" /></button>
          <div className="min-w-0 flex-1">
            <p className="eyebrow text-muted-foreground mb-2">Recently added to PUBLIC</p>
            <Link to={"/track/" + latestTrack.id} className="artist-latest-title">{latestTrack.title}</Link>
            <p className="text-sm text-muted-foreground mt-1 truncate">{latestTrack.artist || artist.name}</p>
            <div className="mt-2"><LibraryButton track={latestTrack} /></div>
          </div>
        </section>}

        {topTracks.length > 0 && <section className="artist-top-songs">
          <SectionTitle icon={Music} right={<button className="text-xs text-muted-foreground px-2 py-2" onClick={() => document.getElementById("artist-discography")?.scrollIntoView({behavior:window.matchMedia("(prefers-reduced-motion: reduce)").matches?"auto":"smooth"})}>All songs <ChevronRight size={14} className="inline" /></button>}>Top Songs</SectionTitle>
          <div className="artist-top-list">{topTracks.map((track,index) => <TrackRow key={track.id} track={track} index={index} queue={topTracks} queueIndex={index} />)}</div>
        </section>

        {/* Discography */}
        <section id="artist-discography" className="artist-discography mb-8">
          <SectionTitle icon={Disc3} right={
          <span className="text-xs font-semibold text-foreground/40 bg-foreground/[0.05] rounded-full px-2.5 py-1">
              {tracks.length}
            </span>
          }>
            Songs
          </SectionTitle>
          {tracks.length>0&&<div className="collection-tools"><input aria-label="Search artist discography" placeholder="Find a song" value={query} onChange={e=>setQuery(e.target.value)} onKeyDown={e=>{if(e.key==="Escape")setQuery("");}}/><select aria-label="Sort artist discography" value={sort} onChange={e=>setSort(e.target.value)}><option value="recent">Newest</option><option value="popular">Most played</option><option value="title">Title A–Z</option></select></div>}
          {tracks.length === 0 ?
          <div className="rounded-2xl border border-dashed border-border py-10 text-center px-6">
              <Music size={22} className="text-foreground/35 mx-auto mb-2" />
              <p className="text-sm text-foreground/50">No published tracks linked to this artist yet.</p>
            </div> :

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 md:gap-4">
              {!visibleTracks.length&&<div className="collection-empty col-span-full"><h2>No matching songs</h2><button className="playlist-action" onClick={()=>setQuery("")}>Show all songs</button></div>}
              {visibleTracks.map((t) =>
            <TrackCard key={t.id} track={t} queue={visibleTracks}/>
            )}
            </div>
          }
        </section>
        {(artist.bio || meta.length > 0 || socials.length > 0 || artist.history_text || isAdmin) && <section className="artist-about">
          <SectionTitle icon={Mic2}>About {artist.name}</SectionTitle>
          {artist.bio && <CollapsibleText text={artist.bio} className="selectable-content text-sm text-muted-foreground leading-relaxed" />}
          {meta.length > 0 && <div className="flex flex-wrap gap-2 mt-4">{meta.map((m,i) => <Pill key={i} icon={m.icon}>{m.label}</Pill>)}</div>}
          {socials.length > 0 && <div className="flex flex-wrap gap-2 mt-4">{socials.map((s,i) => <SocialChip key={i} href={s.href} icon={s.icon} label={s.label} />)}</div>}
          {artist.history_text && <div className="mt-6"><h3 className="font-semibold mb-3">History</h3><CollapsibleText text={artist.history_text} className="selectable-content text-sm text-muted-foreground leading-relaxed whitespace-pre-line" /></div>}
          {isAdmin && id && <button onClick={generateHistory} disabled={generating} className="playlist-action inline-flex items-center gap-2 px-4 py-2.5 mt-5 text-xs">{generating ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}{generating ? "Generating…" : artist.history_text ? "Regenerate history" : "Generate history"}</button>}
        </section>}
        {id && <SafetyControls type="artist" id={id} label="artist page" />}
      </div>
    </PullToRefresh>);

}