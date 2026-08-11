import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { Link } from "react-router-dom";
import {
  Search as SearchIcon,
  Loader2,
  Music,
  Users,
  Mic2,
  Disc3,
  X,
  ArrowLeft } from
"lucide-react";
import { base44 } from "@/api/base44Client";
import TrackCard from "@/components/TrackCard";
import VinylCrate from "@/components/search/VinylCrate";
import Avatar from "@/components/Avatar";
import PullToRefresh from "@/components/PullToRefresh";
import PageHeader from "@/components/PageHeader";
import EmptyState from "@/components/EmptyState";
import { useUnpublishedSync } from "@/hooks/useUnpublishedSync";

function ArtistRow({ artist, trackCount, onPick }) {
  return (
    <button
      onClick={onPick}
      className="w-full flex items-center gap-3 p-2.5 rounded-xl hover:bg-foreground/[0.03] transition text-left"
    >
      <div className="w-12 h-12 rounded-full overflow-hidden bg-foreground/10 shrink-0 grid place-items-center">
        {artist.avatar_url ? (
          <img src={artist.avatar_url} alt="" className="w-full h-full object-cover" />
        ) : (
          <Disc3 size={20} className="text-foreground/40" />
        )}
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-sm font-semibold truncate">{artist.name}</div>
        <div className="text-xs text-foreground/50 truncate">
          {artist.location ? `${artist.location} · ` : ""}
          {trackCount} {trackCount === 1 ? "track" : "tracks"}
        </div>
      </div>
      <Mic2 size={16} className="text-foreground/30 shrink-0" />
    </button>
  );
  }

  export default function Search() {
  const [q, setQ] = useState("");
  const [genre, setGenre] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get("genre") || null;
  });
  const [allTracks, setAllTracks] = useState([]);
  const [allArtists, setAllArtists] = useState([]);
  const [people, setPeople] = useState([]);
  const [loadingAll, setLoadingAll] = useState(true);
  const [loadingPeople, setLoadingPeople] = useState(false);
  const peopleReqId = useRef(0);

  const onUnpublished = useCallback((id) => {
    setAllTracks((prev) => prev.filter((t) => t.id !== id));
  }, []);
  useUnpublishedSync(onUnpublished);

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

  const genreList = useMemo(() => {
    const map = {};
    for (const t of allTracks) {
      const g = t.genre;
      if (!g) continue;
      if (!map[g]) map[g] = { genre: g, count: 0, cover: "" };
      map[g].count += 1;
      if (!map[g].cover && t.cover_art_url) map[g].cover = t.cover_art_url;
    }
    return Object.values(map).sort(
      (a, b) => b.count - a.count || a.genre.localeCompare(b.genre)
    );
  }, [allTracks]);

  const genreTracks = useMemo(() => {
    if (!genre) return [];
    return allTracks.filter((t) => t.genre === genre);
  }, [genre, allTracks]);

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
  }

  const loader =
  <div className="py-16 text-center">
      <Loader2 className="animate-spin inline text-foreground/40" size={22} />
    </div>;


  return (
    <PullToRefresh onRefresh={loadCatalogue}>
      <div>
        <PageHeader eyebrow="Find" title="Search" subtitle="Find tracks, artists, and people across the PUBLIC network." />

        {/* Search input */}
        <div className="relative mb-5">
          <SearchIcon size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-foreground/40 pointer-events-none" />
          <input
            value={q}
            onChange={(e) => {setQ(e.target.value);setGenre(null);}}
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

        {/* Body */}
        {hasQuery ?
        loading ? loader :
        anyResults === 0 ?
        <EmptyState
          icon={SearchIcon}
          title={`No results for "${q}"`}
          description="Try a different spelling or search term." /> :
        <div className="space-y-8">
            {trackResults.length > 0 &&
          <div>
                <h3 className="flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-foreground/60 mb-2 px-1">
                  <Music size={14} /> Tracks
                  
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-1">
                  {trackResults.slice(0, 40).map((t) =>
              <TrackCard key={t.id} track={t} />
              )}
                </div>
              </div>
          }

            {artistResults.length > 0 &&
          <div>
                


            
                <h3 className="flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-foreground/60 mb-2 px-1">
                  <Mic2 size={14} /> Artists
                  <span className="text-xs font-semibold text-foreground/40">{artistResults.length}</span>
                </h3>
                <div className="space-y-1">
                  {artistResults.map((a) =>
              <ArtistRow
                key={a.id}
                artist={a}
                trackCount={allTracks.filter((t) => t.artist?.toLowerCase() === a.name.toLowerCase()).length}
                onPick={() => searchArtist(a.name)} />
              )}
                </div>
              </div>
          }

            {people.length > 0 &&
          <div>
                <h3 className="flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-foreground/60 mb-2 px-1">
                  <Users size={14} /> People
                  <span className="text-xs font-semibold text-foreground/40">{people.length}</span>
                </h3>
                <div className="space-y-1">
                  {people.map((u) =>
              <Link
                key={u.id}
                to={`/profile/${u.id}`}
                className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-foreground/[0.03] transition">
                      <Avatar user={u} size={48} />
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-semibold truncate flex items-center gap-1">
                          {u.display_name || u.full_name || "Unnamed"}
                        </div>
                        <div className="text-xs text-foreground/50 truncate">{u.email}</div>
                      </div>
                    </Link>
              )}
                </div>
              </div>
          }
          </div> :
        genre ?
        <div>
            <div className="flex items-center gap-3 mb-3">
              <button
              onClick={() => setGenre(null)}
              className="tap-target rounded-full hover:bg-foreground/[0.06]"
              aria-label="Back to genres">
                <ArrowLeft size={20} />
              </button>
              <div className="min-w-0 flex-1">
                <h2 className="text-lg font-extrabold tracking-tight truncate">{genre}</h2>
                <p className="text-xs text-foreground/50">
                  {genreTracks.length} {genreTracks.length === 1 ? "track" : "tracks"}
                </p>
              </div>
            </div>
            {genreTracks.length ?
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-1">
                {genreTracks.map((t) =>
            <TrackCard key={t.id} track={t} />
            )}
              </div> :

          <EmptyState
            title="Nothing here yet"
            description="No published tracks in this genre." />
          }
          </div> :
        loadingAll ? loader :
        <VinylCrate genres={genreList} onPick={(g) => setGenre(g)} />
        }
      </div>
    </PullToRefresh>);

}