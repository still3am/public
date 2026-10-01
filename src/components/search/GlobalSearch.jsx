import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Search as SearchIcon, X, Loader2 } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { getPublishedTracks, getArtists } from "@/lib/catalogCache";
import { OPEN_GLOBAL_SEARCH } from "@/lib/searchBus";
import GlobalSearchResults from "@/components/search/GlobalSearchResults";

const MAX_PER_GROUP = 6;

function matchGroups(Q, catalog, people) {
  if (!Q) return [];
  const tracks = catalog?.tracks || [];
  const artists = catalog?.artists || [];
  const groups = [];

  const trackHits = tracks.filter(
    (t) =>
      t.title?.toLowerCase().includes(Q) ||
      t.artist?.toLowerCase().includes(Q) ||
      t.uploader_name?.toLowerCase().includes(Q)
  );
  if (trackHits.length) {
    groups.push({
      key: "tracks",
      label: "Tracks",
      items: trackHits.slice(0, MAX_PER_GROUP).map((t) => ({
        kind: "track",
        id: t.id,
        title: t.title,
        subtitle: t.artist || t.uploader_name || "Unknown",
        image: t.cover_art_url,
        label: "Track",
      })),
    });
  }

  const artistTrackCounts = new Map();
  for (const t of tracks) {
    const key = (t.artist || "").toLowerCase().trim();
    if (key) artistTrackCounts.set(key, (artistTrackCounts.get(key) || 0) + 1);
  }

  const artistHits = artists.filter(
    (a) =>
      a.name?.toLowerCase().includes(Q) ||
      a.bio?.toLowerCase().includes(Q) ||
      a.location?.toLowerCase().includes(Q)
  );
  if (artistHits.length) {
    groups.push({
      key: "artists",
      label: "Artists",
      items: artistHits.slice(0, MAX_PER_GROUP).map((a) => {
        const count = artistTrackCounts.get((a.name || "").toLowerCase().trim()) || 0;
        return {
          kind: "artist",
          id: a.id,
          title: a.name,
          subtitle: count ? `${count} ${count === 1 ? "track" : "tracks"}` : a.location || "Artist",
          image: a.avatar_url,
          label: "Artist",
        };
      }),
    });
  }

  const genreCounts = {};
  for (const t of tracks) {
    if (t.genre) genreCounts[t.genre] = (genreCounts[t.genre] || 0) + 1;
  }
  const genreHits = Object.keys(genreCounts).filter((g) => g.toLowerCase().includes(Q));
  if (genreHits.length) {
    groups.push({
      key: "genres",
      label: "Genres",
      items: genreHits.slice(0, MAX_PER_GROUP).map((g) => ({
        kind: "genre",
        id: g,
        title: g,
        subtitle: `${genreCounts[g]} ${genreCounts[g] === 1 ? "track" : "tracks"}`,
        image: tracks.find((t) => t.genre === g && t.cover_art_url)?.cover_art_url || "",
        label: "Genre",
      })),
    });
  }

  if (people.length) {
    groups.push({
      key: "people",
      label: "People",
      items: people.slice(0, MAX_PER_GROUP).map((u) => ({
        kind: "person",
        id: u.id,
        title: u.display_name || "Unnamed",
        subtitle: u.bio || u.location || "PUBLIC listener",
        user: u,
        label: "Person",
      })),
    });
  }

  return groups;
}

export default function GlobalSearch() {
  const nav = useNavigate();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [catalog, setCatalog] = useState(null);
  const [people, setPeople] = useState([]);
  const [loadingPeople, setLoadingPeople] = useState(false);
  const [active, setActive] = useState(0);
  const inputRef = useRef(null);
  const peopleReq = useRef(0);

  // Openable from the shortcut or any nav trigger, from any page.
  useEffect(() => {
    const onOpen = () => setOpen(true);
    const onKey = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key?.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((v) => !v);
      } else if (e.key === "Escape") {
        setOpen(false);
      }
    };
    window.addEventListener(OPEN_GLOBAL_SEARCH, onOpen);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener(OPEN_GLOBAL_SEARCH, onOpen);
      window.removeEventListener("keydown", onKey);
    };
  }, []);

  useEffect(() => {
    if (open) {
      setActive(0);
      const t = setTimeout(() => inputRef.current?.focus(), 40);
      return () => clearTimeout(t);
    }
    setQ("");
    setPeople([]);
  }, [open]);

  // The same cached catalog the discovery screens already share — opening the
  // overlay never adds a fresh full-collection read.
  useEffect(() => {
    if (!open || catalog) return;
    let alive = true;
    Promise.all([getPublishedTracks(), getArtists()])
      .then(([t, a]) => {
        if (alive) {
          setCatalog({
            tracks: Array.isArray(t) ? t : [],
            artists: Array.isArray(a) ? a : [],
          });
        }
      })
      .catch(() => alive && setCatalog({ tracks: [], artists: [] }));
    return () => {
      alive = false;
    };
  }, [open, catalog]);

  const Q = q.trim().toLowerCase();

  useEffect(() => {
    if (Q.length < 2) {
      setPeople([]);
      setLoadingPeople(false);
      return;
    }
    setLoadingPeople(true);
    const id = ++peopleReq.current;
    const t = setTimeout(async () => {
      try {
        const res = await base44.functions.invoke("searchUsers", { q: Q });
        if (id === peopleReq.current) setPeople(res?.data?.results || []);
      } catch {
        if (id === peopleReq.current) setPeople([]);
      } finally {
        if (id === peopleReq.current) setLoadingPeople(false);
      }
    }, 220);
    return () => clearTimeout(t);
  }, [Q]);

  const groups = useMemo(() => matchGroups(Q, catalog, people), [Q, catalog, people]);
  const flat = useMemo(() => groups.flatMap((g) => g.items), [groups]);

  const topGenres = useMemo(() => {
    const counts = {};
    for (const t of catalog?.tracks || []) {
      if (t.genre) counts[t.genre] = (counts[t.genre] || 0) + 1;
    }
    return Object.keys(counts)
      .sort((a, b) => counts[b] - counts[a])
      .slice(0, 10);
  }, [catalog]);

  const openItem = useCallback(
    (item) => {
      setOpen(false);
      if (item.kind === "track") nav(`/track/${item.id}`);
      else if (item.kind === "artist") nav(`/artist?name=${encodeURIComponent(item.title)}`);
      else if (item.kind === "genre") nav(`/search?genre=${encodeURIComponent(item.id)}`);
      else nav(`/profile/${item.id}`);
    },
    [nav]
  );

  function onInputKey(e) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((i) => Math.min(i + 1, Math.max(flat.length - 1, 0)));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      const item = flat[active];
      if (item) {
        openItem(item);
      } else if (Q) {
        setOpen(false);
        nav(`/search?q=${encodeURIComponent(q.trim())}`);
      }
    }
  }

  if (!open) return null;

  const hasQuery = Q.length > 0;

  return (
    <div className="fixed inset-0 z-[80] flex items-start justify-center px-3 pt-[10vh]">
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={() => setOpen(false)}
      />

      <div className="relative w-full max-w-xl rounded-2xl border border-border bg-card shadow-2xl overflow-hidden">
        <div className="flex items-center gap-2.5 px-4 py-3 border-b border-border">
          <SearchIcon size={18} className="text-foreground/40 shrink-0" />
          <input
            ref={inputRef}
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              setActive(0);
            }}
            onKeyDown={onInputKey}
            placeholder="Search tracks, artists, people…"
            enterKeyHint="search"
            className="flex-1 min-w-0 bg-transparent text-sm font-medium focus:outline-none"
          />
          {loadingPeople && (
            <Loader2 size={14} className="animate-spin text-foreground/40 shrink-0" />
          )}
          {q && (
            <button
              onClick={() => setQ("")}
              aria-label="Clear search"
              className="p-1.5 rounded-full hover:bg-foreground/[0.06] text-foreground/40 shrink-0"
            >
              <X size={15} />
            </button>
          )}
          <button
            onClick={() => setOpen(false)}
            aria-label="Close search"
            className="p-1.5 rounded-full hover:bg-foreground/[0.06] text-foreground/40 shrink-0"
          >
            <X size={16} />
          </button>
        </div>

        <div className="max-h-[58vh] overflow-y-auto p-2">
          {!catalog ? (
            <div className="py-12 grid place-items-center">
              <Loader2 className="animate-spin text-foreground/40" />
            </div>
          ) : hasQuery ? (
            flat.length ? (
              <GlobalSearchResults
                groups={groups}
                activeIndex={active}
                onPick={openItem}
                onActive={setActive}
              />
            ) : (
              <div className="py-12 text-center text-sm text-foreground/50">
                No matches for “{q.trim()}”.
              </div>
            )
          ) : (
            <div className="px-3 py-4">
              <div className="text-[11px] font-bold uppercase tracking-wider text-foreground/40 mb-2.5">
                Browse genres
              </div>
              <div className="flex flex-wrap gap-2">
                {topGenres.map((g) => (
                  <button
                    key={g}
                    onClick={() => openItem({ kind: "genre", id: g })}
                    className="chip"
                  >
                    {g}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="px-4 py-2.5 border-t border-border flex items-center justify-between gap-3 text-[11px] text-foreground/45">
          <span className="truncate">↑↓ to move · Enter to open · Esc to close</span>
          {hasQuery && (
            <button
              onClick={() => {
                setOpen(false);
                nav(`/search?q=${encodeURIComponent(q.trim())}`);
              }}
              className="font-bold text-foreground/70 hover:text-foreground shrink-0"
            >
              All results
            </button>
          )}
        </div>
      </div>
    </div>
  );
}