import { useEffect, useMemo, useRef, useState } from "react";
import {
  Search as SearchIcon,
  Loader2,
  X,
  ArrowLeft } from
"lucide-react";
import { useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { getPublishedTracks, peekPublishedTracks } from "@/lib/catalogCache";
import { useGlobalSearch } from "@/hooks/useGlobalSearch";
import { useUnpublishedSync } from "@/hooks/useUnpublishedSync";
import TrackCard from "@/components/TrackCard";
import VinylCrate from "@/components/search/VinylCrate";
import SearchResults from "@/components/search/SearchResults";
import PullToRefresh from "@/components/PullToRefresh";
import EmptyState from "@/components/EmptyState";

export default function Search() {
  const [searchParams, setSearchParams] = useSearchParams();
  const urlQ = searchParams.get("q") || "";
  const scope = searchParams.get("type") === "people" ? "people" : "all";
  const peopleMode = scope === "people";
  function chooseScope(next) {const params = new URLSearchParams(searchParams);params.delete("genre");if (next === "people") params.set("type", "people");else params.delete("type");setSearchParams(params, { replace: true });setGenre(null);}
  const [q, setQ] = useState(urlQ);
  const [genre, setGenre] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get("genre") || null;
  });

  // The desktop sidebar field drives this page through the same ?q= parameter,
  // so results follow it as the user types there.
  useEffect(() => {
    setQ(urlQ);
  }, [urlQ]);
  useEffect(() => setGenre(searchParams.get("genre") || null), [searchParams]);

  const updateQuery = (next) => {
    setQ(next);
    const params = new URLSearchParams(searchParams);
    params.delete("genre");setGenre(null);
    if (next) params.set("q", next);else
    params.delete("q");
    setSearchParams(params, { replace: true });
  };
  const chooseGenre = (next) => {const params = new URLSearchParams(searchParams);params.delete("q");params.delete("type");if (next) params.set("genre", next);else params.delete("genre");setQ("");setGenre(next);setSearchParams(params, { replace: true });};
  const [browseError, setBrowseError] = useState("");
  const [allTracks, setAllTracks] = useState(peekPublishedTracks);
  const [loadingAll, setLoadingAll] = useState(true);

  const {
    tracks: trackResults,
    artists: artistResults,
    people,
    playlists,
    searching,
    failed,
    peopleFailed,
    hasQuery,
    refresh } =
  useGlobalSearch(q, scope);

  // Keep the browse crate honest if an admin unpublishes a track mid-session.
  useUnpublishedSync((id) => {
    setAllTracks((prev) => prev.filter((t) => t.id !== id));
  });

  async function loadCatalogue(fresh = false) {
    setLoadingAll(true);setBrowseError("");
    try {
      const tracks = await getPublishedTracks(fresh);
      setAllTracks(Array.isArray(tracks) ? tracks : []);
    } catch {setBrowseError("The catalog is unavailable. Retry after checking your connection.");} finally {
      setLoadingAll(false);
    }
  }

  // The browse crate is only fetched when it is actually shown. Landing here with
  // a term already typed (e.g. from the sidebar field) no longer pulls the whole
  // catalogue at the same moment as the search, which is the heaviest read in the
  // app and the main source of rate-limit errors.
  const catalogueLoaded = useRef(false);
  useEffect(() => {
    if (peopleMode || hasQuery || catalogueLoaded.current) return;
    catalogueLoaded.current = true;
    loadCatalogue();
  }, [hasQuery, peopleMode]);

  useEffect(() => {const change = () => {loadCatalogue();refresh();};window.addEventListener('catalog:invalidate', change);return () => window.removeEventListener('catalog:invalidate', change);}, [refresh]);

  // Pulling down re-runs whatever the page is currently showing: the live
  // search when a term is typed, otherwise the genre crate.
  async function handleRefresh() {
    if (hasQuery) {
      refresh();
      return;
    }
    await loadCatalogue(true);
  }

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

  const anyResults =
  trackResults.length || artistResults.length || people.length || playlists.length;
  const firstSearchInFlight = hasQuery && searching && anyResults === 0;

  const loader =
  <div className="py-16 text-center">
      <Loader2 className="animate-spin inline text-foreground/40" size={22} />
    </div>;


  return (
    <PullToRefresh onRefresh={handleRefresh}>
      <div className="search-page">
        <div className="page-intro"><h1>Search</h1><p>Explore music, artists, playlists, and people.</p></div>
        
        


        
        {/* Search input (mobile / tablet) — desktop uses the sidebar field instead */}
        <div className={`relative mb-6 max-w-2xl ${peopleMode ? "" : "md:hidden"}`}>
          <SearchIcon size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-foreground/40 pointer-events-none" />
          <input
            value={q}
            onChange={(e) => {updateQuery(e.target.value);setGenre(null);}}
            aria-label={peopleMode ? "Search people by name" : "Search tracks, artists, people"} placeholder={peopleMode ? "Search people by name…" : "Search tracks, artists, people…"}
            className="w-full pl-11 pr-20 py-3.5 rounded-full border border-border bg-background text-sm font-medium focus:outline-none focus:ring-2 focus:ring-foreground/10 transition shadow-sm" />

          {searching &&
          <Loader2
            size={15}
            className="hidden md:block animate-spin absolute right-11 top-1/2 -translate-y-1/2 text-foreground/40 pointer-events-none" />

          }

          {q.trim() &&
          <button
            onClick={() => updateQuery("")}
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
        failed || peopleFailed ?
        <div className="py-10 text-center"><Button variant="outline" onClick={refresh}>Refresh results</Button></div> :
        <EmptyState
          icon={SearchIcon}
          title={`No results for "${q}"`}
          description="Try a different spelling or search term." /> :

        <SearchResults
          tracks={trackResults}
          artists={artistResults}
          people={people}
          playlists={playlists}
          dimmed={searching} /> :


        peopleMode ? <EmptyState icon={SearchIcon} title="Find people on PUBLIC" description="Search by display name or full name to open their profile and follow them." /> :
        genre ?
        <div>
            <div className="flex items-center gap-3 mb-3">
              <button
              onClick={() => chooseGenre(null)}
              className="tap-target rounded-full hover:bg-foreground/[0.06]"
              aria-label="Back to genres">
                <ArrowLeft size={20} />
              </button>
              <div className="min-w-0 flex-1">
                <h2 className="text-lg font-extrabold tracking-tight truncate">{genre}</h2>
                

              
              </div>
            </div>
            {genreTracks.length ?
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 md:gap-4">
                {genreTracks.map((t) =>
            <TrackCard key={t.id} track={t} queue={genreTracks} />
            )}
              </div> :

          <EmptyState
            title="Nothing here yet"
            description="No published tracks in this genre." />
          }
          </div> :
        browseError ? <div className="p-6 text-center"><Button onClick={loadCatalogue}>Refresh music</Button></div> : loadingAll ? loader :
        genreList.length ?
        <VinylCrate genres={genreList} onPick={chooseGenre} /> :

        <EmptyState
          title="Nothing published yet"
          description="No tracks have been published to the catalogue, so there are no genres to browse." />
        }
      </div>
    </PullToRefresh>);

}