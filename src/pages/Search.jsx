import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import {
  Search as SearchIcon,
  Loader2,
  Music,
  Users,
  Mic2,
  Disc3,
  X,
  Shield,
  Sparkles } from
"lucide-react";
import { base44 } from "@/api/base44Client";
import TrackRow from "@/components/TrackRow";
import Avatar from "@/components/Avatar";
import PullToRefresh from "@/components/PullToRefresh";
import PageHeader from "@/components/PageHeader";
import EmptyState from "@/components/EmptyState";

const TABS = [
{ id: "tracks", label: "Tracks", icon: Music },
{ id: "artists", label: "Artists", icon: Mic2 },
{ id: "people", label: "People", icon: Users }];


const QUICK_GENRES = ["Hip-Hop", "Electronic", "Ambient", "Lo-Fi", "R&B", "Pop", "House", "Afrobeats"];

function countLabel(n) {
  if (n === 0) return "0";
  if (n > 999) return "999+";
  return String(n);
}

function ArtistRow({ artist, trackCount, onPick }) {
  return (
    <button
      onClick={onPick}
      className="w-full flex items-center gap-4 p-2.5 rounded-xl hover:bg-foreground/[0.03] transition text-left group">
      <div className="w-12 h-12 rounded-full bg-foreground/[0.06] grid place-items-center overflow-hidden shrink-0 ring-1 ring-foreground/10">
        {artist.avatar_url ?
        <img src={artist.avatar_url} alt="" className="w-full h-full object-cover" /> :
        <Mic2 size={20} className="text-foreground/50" />}
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-sm font-semibold truncate flex items-center gap-1.5">
          {artist.name}
          <Shield size={12} className="text-foreground/40" />
        </div>
        <div className="text-xs text-foreground/50 truncate flex items-center gap-1.5">
          {artist.location && <span className="truncate">{artist.location}</span>}
          {artist.location && trackCount > 0 && <span>·</span>}
          {trackCount > 0 && <span className="truncate">{trackCount} {trackCount === 1 ? "track" : "tracks"}</span>}
          {!artist.location && trackCount === 0 && <span>Artist on PUBLIC</span>}
        </div>
      </div>
      <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-foreground/[0.05] text-foreground/60 text-xs font-semibold shrink-0 group-hover:bg-foreground group-hover:text-background transition-all">
        Browse <Disc3 size={13} />
      </span>
    </button>);

}

function ResultChip({ icon: Icon, label, count, active, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-semibold whitespace-nowrap transition ${
      active ?
      "bg-foreground text-background" :
      "border border-border text-foreground/60 hover:bg-foreground/5"}`
      }>
      <Icon size={14} /> {label}
      <span
        className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full tabular-nums ${
        active ? "bg-background/20 text-background" : "bg-foreground/10 text-foreground/50"}`
        }>
        {countLabel(count)}
      </span>
    </button>);

}

export default function Search() {
  const [q, setQ] = useState("");
  const [tab, setTab] = useState("tracks");
  const [allTracks, setAllTracks] = useState([]);
  const [allArtists, setAllArtists] = useState([]);
  const [people, setPeople] = useState([]);
  const [loadingAll, setLoadingAll] = useState(true);
  const [loadingPeople, setLoadingPeople] = useState(false);
  const peopleReqId = useRef(0);

  // One-time load of full catalogue for instant local search.
  async function loadCatalogue() {
    setLoadingAll(true);
    try {
      const [tracks, artists] = await Promise.all([
      base44.entities.Track.filter({ is_published: true }, "-created_date", 10000).catch(() => []),
      base44.entities.Artist.list("-updated_date", 1000).catch(() => [])]
      );
      setAllTracks(Array.isArray(tracks) ? tracks : []);
      setAllArtists(Array.isArray(artists) ? artists : []);
    } finally {
      setLoadingAll(false);
    }
  }

  useEffect(() => {
    loadCatalogue();
  }, []);

  const Q = useMemo(() => q.trim().toLowerCase(), [q]);
  const hasQuery = Q.length > 0;

  const trackResults = useMemo(() => {
    if (!hasQuery) return [];
    return allTracks.filter(
      (t) =>
      t.title?.toLowerCase().includes(Q) ||
      t.artist?.toLowerCase().includes(Q) ||
      t.uploader_name?.toLowerCase().includes(Q)
    );
  }, [hasQuery, Q, allTracks]);

  const artistResults = useMemo(() => {
    if (!hasQuery) return [];
    return allArtists.
    filter(
      (a) =>
      a.name?.toLowerCase().includes(Q) ||
      a.bio?.toLowerCase().includes(Q) ||
      a.location?.toLowerCase().includes(Q)
    ).
    slice(0, 50);
  }, [hasQuery, Q, allArtists]);

  // People search is a remote function — debounce it.
  useEffect(() => {
    if (!hasQuery) {
      setPeople([]);
      return;
    }
    setLoadingPeople(true);
    const reqId = ++peopleReqId.current;
    const t = setTimeout(async () => {
      try {
        const res = await base44.functions.invoke("searchUsers", { q: Q });
        if (reqId === peopleReqId.current) setPeople(res?.data?.results || []);
      } catch {
        if (reqId === peopleReqId.current) setPeople([]);
      } finally {
        if (reqId === peopleReqId.current) setLoadingPeople(false);
      }
    }, 250);
    return () => clearTimeout(t);
  }, [hasQuery, Q]);

  const anyResults = trackResults.length || artistResults.length || people.length;
  const loading = loadingAll || hasQuery && loadingPeople && !people.length;

  function searchArtist(name) {
    setQ(name);
    setTab("tracks");
  }

  return (
    <PullToRefresh onRefresh={loadCatalogue}>
      <div>
        <PageHeader eyebrow="Find" title="Search" subtitle="Find tracks, artists, and people across the PUBLIC network." />

        {/* Search input */}
        <div className="relative mb-5">
          <SearchIcon size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-foreground/40 pointer-events-none" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search tracks, artists, people…"
            className="w-full pl-11 pr-11 py-3.5 rounded-full border border-border bg-background text-sm font-medium focus:outline-none focus:ring-2 focus:ring-foreground/10 transition shadow-sm" />
          
          {q.trim() &&
          <button
            onClick={() => setQ("")}
            className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 rounded-full hover:bg-foreground/5 text-foreground/40"
            aria-label="Clear search">
              <X size={16} />
            </button>
          }
        </div>

        {/* Quick genre chips (no query) */}
        {!hasQuery &&
        <div className="flex items-center gap-2 flex-wrap mb-2 hidden">
            {QUICK_GENRES.map((g) =>
          <button
            key={g}
            onClick={() => {setQ(g);setTab("tracks");}}
            className="chip active:scale-95">
                {g}
              </button>
          )}
          </div>
        }

        {/* Tabs with counts */}
        {hasQuery &&
        <div className="tab-strip flex items-center gap-2 mb-5 overflow-x-auto no-scrollbar">
            <ResultChip icon={Music} label="Tracks" count={trackResults.length} active={tab === "tracks"} onClick={() => setTab("tracks")} />
            <ResultChip icon={Mic2} label="Artists" count={artistResults.length} active={tab === "artists"} onClick={() => setTab("artists")} />
            <ResultChip icon={Users} label="People" count={people.length} active={tab === "people"} onClick={() => setTab("people")} />
          </div>
        }

        {/* Body */}
        {!hasQuery ?
        loadingAll ?
        <div className="py-16 text-center">
              <Loader2 className="animate-spin inline text-foreground/40" size={22} />
            </div> :
        <EmptyState
          icon={Sparkles}
          title="Search PUBLIC"
          description="Type a name, genre, or username to discover tracks, artists, and people. Try a quick genre above." /> :

        loading ?
        <div className="py-16 text-center">
              <Loader2 className="animate-spin inline text-foreground/40" size={22} />
            </div> :
        anyResults === 0 ?
        <EmptyState
          icon={SearchIcon}
          title={`No results for "${q}"`}
          description="Try a different spelling, or switch tabs to search tracks, artists, or people." /> :

        <div>
            {tab === "tracks" && (
          trackResults.length ?
          <div className="space-y-0.5">
                  {trackResults.map((t, i) =>
            <TrackRow key={t.id} track={t} index={i} />
            )}
                </div> :
          <p className="text-sm text-foreground/50 text-center py-12">No tracks found.</p>)
          }

            {tab === "artists" && (
          artistResults.length ?
          <div className="space-y-1">
                  {artistResults.map((a) => {
              const tc = allTracks.filter((t) => t.artist?.toLowerCase() === a.name.toLowerCase()).length;
              return (
                <ArtistRow
                  key={a.id}
                  artist={a}
                  trackCount={tc}
                  onPick={() => searchArtist(a.name)} />);

            })}
                </div> :
          <p className="text-sm text-foreground/50 text-center py-12">No artists found.</p>)
          }

            {tab === "people" && (
          people.length ?
          <div className="space-y-1">
                  {people.map((u) =>
            <Link
              key={u.id}
              to={`/profile/${u.id}`}
              className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-foreground/[0.03] transition group">
                      <Avatar user={u} size={48} />
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-semibold truncate flex items-center gap-1">
                          {u.display_name || u.full_name || "Unnamed"}
                          {u.is_verified && <Shield size={12} className="text-foreground/40" />}
                          {u.can_upload &&
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-foreground/10 text-foreground/60">
                              uploader
                            </span>}
                        </div>
                        <div className="text-xs text-foreground/50 truncate">{u.email}</div>
                      </div>
                    </Link>
            )}
                </div> :
          <p className="text-sm text-foreground/50 text-center py-12">No people found.</p>)
          }
          </div>
        }
      </div>
    </PullToRefresh>);

}