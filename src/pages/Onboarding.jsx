import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { Image } from "@/components/ui/image";
import Logo from "@/components/Logo";
import { Button } from "@/components/ui/button";
import { Loader2, Check } from "lucide-react";
import { saveUserGenres, clearUserGenresCache } from "@/lib/userGenres";

const MIN = 3;

export default function Onboarding() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [tracks, setTracks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(new Set());
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const t = await base44.entities.Track.filter({ is_published: true }, "-created_date", 10000).catch(() => []);
        setTracks(Array.isArray(t) ? t : []);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // Same genre set the Search page shows — only genres that have published
  // tracks, each represented by a real cover from the first matching track.
  const genres = useMemo(() => {
    const map = {};
    for (const t of tracks) {
      const g = t.genre;
      if (!g) continue;
      if (!map[g]) map[g] = { genre: g, cover: "" };
      if (!map[g].cover && t.cover_art_url) map[g].cover = t.cover_art_url;
    }
    return Object.values(map).sort((a, b) => a.genre.localeCompare(b.genre));
  }, [tracks]);

  function toggle(g) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(g)) next.delete(g);else next.add(g);
      return next;
    });
  }

  function addAll() {
    setSelected(new Set(genres.map((g) => g.genre)));
  }

  async function done() {
    if (selected.size < MIN || saving) return;
    setSaving(true);
    try {
      await saveUserGenres([...selected], user?.id);
      clearUserGenresCache();
      navigate("/");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="px-4 pt-8 pb-28">
      <div className="max-w-5xl mx-auto">
        <div className="flex flex-col items-center text-center mb-8">
          <Logo width="184px" className="max-w-[60%] mb-5" />
          <h1 className="text-3xl font-extrabold tracking-tight">Choose your sound</h1>
          <p className="text-muted-foreground mt-2 max-w-md">
            Pick at least {MIN} genres to shape your queue and Discover feed — we suggest {MIN}–5, but add as many as you like.
          </p>
        </div>

        {loading ?
        <div className="py-16 text-center">
            <Loader2 className="animate-spin inline text-foreground/40" size={22} />
          </div> :

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
            {genres.map((g) => {
            const active = selected.has(g.genre);
            return (
              <button
                key={g.genre}
                onClick={() => toggle(g.genre)}
                className={`group relative rounded-2xl p-2.5 sm:p-3 transition-all duration-300 text-center hover:bg-foreground/[0.04] active:scale-[0.98] ${
                active ? "bg-foreground/[0.04]" : ""}`
                }>
                
                  <div
                  className={`relative aspect-square rounded-xl overflow-hidden bg-foreground/[0.06] mb-2.5 shadow-sm ring-2 transition ${
                  active ? "ring-foreground" : "ring-transparent"}`
                  }>
                  
                    {g.cover ?
                  <Image
                    src={g.cover}
                    fittingType="fill"
                    alt=""
                    className="w-full h-full object-cover transition-transform duration-500 ease-out group-hover:scale-[1.06]" /> :


                  <div className="w-full h-full grid place-items-center text-foreground/25 text-[10px] font-semibold uppercase tracking-wider px-2 text-center">
                        {g.genre}
                      </div>
                  }
                    {active &&
                  <div className="absolute top-2 right-2 w-6 h-6 rounded-full bg-foreground text-background grid place-items-center shadow">
                        <Check size={14} strokeWidth={3} />
                      </div>
                  }
                  </div>
                  <div className="truncate text-sm font-semibold text-center">{g.genre}</div>
                </button>);

          })}
          </div>
        }
      </div>

      <div className="mt-10">
        <div className="max-w-5xl mx-auto flex items-center justify-center gap-2 py-1">
          <div className="flex items-center gap-2 shrink-0">
            {selected.size > 0 && (
              <button
                onClick={() => setSelected(new Set())}
                disabled={saving}
                className="h-11 px-4 rounded-xl text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-foreground/[0.05] transition disabled:opacity-40"
              >
                Clear all
              </button>
            )}
            {selected.size < genres.length && (
              <button
                onClick={addAll}
                disabled={saving}
                className="h-11 px-4 rounded-xl text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-foreground/[0.05] transition disabled:opacity-40"
              >
                Add all
              </button>
            )}
            <Button onClick={done} disabled={selected.size < MIN || saving} className="h-11 px-8">
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Saving…
                </>
              ) : (
                "Done"
              )}
            </Button>
          </div>
        </div>
      </div>
      </div>);

}