import { useEffect, useMemo, useState } from "react";
import {
  Search as SearchIcon,
  Loader2,
  X,
  ArrowLeft } from
"lucide-react";
import { getPublishedTracks } from "@/lib/catalogCache";
import { useGlobalSearch } from "@/hooks/useGlobalSearch";
import { useUnpublishedSync } from "@/hooks/useUnpublishedSync";
import TrackCard from "@/components/TrackCard";
import VinylCrate from "@/components/search/VinylCrate";
import SearchResults from "@/components/search/SearchResults";
import PullToRefresh from "@/components/PullToRefresh";
import PageHeader from "@/components/PageHeader";
import EmptyState from "@/components/EmptyState";

export default function Search() {
  const [q, setQ] = useState("");
  const [genre, setGenre] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get("genre") || null;
  });
  const [allTracks, setAllTracks] = useState([]);
  const [loadingAll, setLoadingAll] = useState(true);

  const {
    tracks: trackResults,
    artists: artistResults,
    people,
    searching,
    hasQuery } =
  useGlobalSearch(q);

  // Keep the browse crate honest if an admin unpublishes a track mid-session.
  useUnpublishedSync((id) => {
    setAllTracks((prev) => prev.filter((t) => t.id !== id));
  });

  async function loadCatalogue() {
    setLoadingAll(true);
    try {
      const tracks = await getPublishedTracks();
      setAllTracks(Array.isArray(tracks) ? tracks : []);
    } finally {
      setLoadingAll(false);
    }
  }

  useEffect(() => {
    loadCatalogue();
  }, []);

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

  const anyResults = trackResults.length || artistResults.length || people.length;
  const firstSearchInFlight = hasQuery && searching && anyResults === 0;

  const loader =
  <div className="py-16 text-center">
      <Loader2 className="animate-spin inline text-foreground/40" size={22} />
    </div>;


  return (
    <PullToRefresh onRefresh={loadCatalogue}>
      <div>
        <PageHeader eyebrow="Find" title="Search" subtitle="Find tracks, artists, and people across the PUBLIC network." />

        {/* Search input — results arrive as you type */}
        <div className="relative mb-5">
          <SearchIcon size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-foreground/40 pointer-events-none" />
          <input
            value={q}
            onChange={(e) => {setQ(e.target.value);setGenre(null);}}
            placeholder="Search tracks, artists, people…"
            className="w-full pl-11 pr-20 py-3.5 rounded-full border border-border bg-background text-sm font-medium focus:outline-none focus:ring-2 focus:ring-foreground/10 transition shadow-sm" />

          {searching &&
          <Loader2
            size={15}
            className="animate-spin absolute right-11 top-1/2 -translate-y-1/2 text-foreground/40 pointer-events-none" />

          }

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
        firstSearchInFlight ? loader :
        anyResults === 0 ?
        <EmptyState
          icon={SearchIcon}
          title={`No results for "${q}"`}
          description="Try a different spelling or search term." /> :

        <SearchResults
          tracks={trackResults}
          artists={artistResults}
          people={people}
          onPickArtist={(name) => setQ(name)}
          dimmed={searching} /> :


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
                <p className="text-xs text-foreground/50 hidden">
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