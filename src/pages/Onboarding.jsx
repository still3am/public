import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { GENRES } from "@/lib/audio-utils";
import { clearUserGenresCache } from "@/lib/userGenres";
import { Check, Loader2, RotateCcw } from "lucide-react";
import Logo from "@/components/Logo";

const GENRE_COLORS = [
  "#ff5e7e", "#ff8a3d", "#ffd23d", "#a3e635", "#34d399", "#22d3ee",
  "#38bdf8", "#818cf8", "#c084fc", "#f472b6", "#fb7185", "#fbbf24",
  "#4ade80", "#2dd4bf", "#60a5fa", "#a78bfa", "#f59e0b", "#ef4444",
  "#10b981", "#06b6d4", "#6366f1", "#ec4899", "#84cc16", "#f97316",
];
const colorFor = (g) => GENRE_COLORS[Math.abs([...g].reduce((a, c) => a + c.charCodeAt(0), 0)) % GENRE_COLORS.length];

export default function Onboarding() {
  const { user } = useAuth();
  const nav = useNavigate();
  const [selected, setSelected] = useState(new Set());
  const [saving, setSaving] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const existing = await base44.entities.UserGenre.filter({}, "-created_date", 1);
        if (Array.isArray(existing) && existing[0]?.genres?.length) {
          nav("/", { replace: true });
          return;
        }
      } catch {}
      setChecking(false);
    })();
  }, []);

  const toggle = (g) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(g)) next.delete(g);
      else next.add(g);
      return next;
    });
  };

  const finish = async () => {
    if (selected.size === 0 || saving) return;
    setSaving(true);
    try {
      await base44.entities.UserGenre.create({
        user_id: user?.id || "",
        genres: Array.from(selected),
      });
      clearUserGenresCache();
      nav("/", { replace: true });
    } catch {
      setSaving(false);
    }
  };

  if (checking) {
    return (
      <div className="fixed inset-0 grid place-items-center">
        <Loader2 className="animate-spin text-foreground/40" size={28} />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col px-5 py-10 max-w-2xl mx-auto">
      <div className="flex flex-col items-center text-center mb-8">
        <Logo width="70%" className="mb-5 max-w-[420px]" />
        <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight mb-2">
          Pick your sound
        </h1>
        <p className="text-sm text-foreground/55 max-w-sm">
          Choose the genres you love. We'll tune your feed and queue to match.
        </p>
        {selected.size > 0 && (
          <button
            onClick={() => setSelected(new Set())}
            className="mt-4 inline-flex items-center gap-1.5 text-xs font-semibold text-foreground/55 hover:text-foreground active:scale-95 transition"
          >
            <RotateCcw size={13} /> Reset
          </button>
        )}
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 flex-1">
        {GENRES.map((g, gi) => {
          const on = selected.has(g);
          const color = colorFor(g);
          return (
            <button
              key={g}
              onClick={() => toggle(g)}
              className={`group relative rounded-2xl p-2.5 sm:p-3 transition-all duration-300 text-center cursor-pointer
                hover:bg-foreground/[0.04] active:scale-[0.98]`}
            >
              <div
                className={`relative aspect-square rounded-xl overflow-hidden mb-2.5 shadow-sm transition-all duration-300
                  ${on ? "ring-2 ring-foreground" : "group-hover:scale-[1.03]"}`}
                style={{ background: `linear-gradient(135deg, ${color} 0%, rgba(255,255,255,0.55) 100%)` }}
              >
                <div className="w-full h-full grid place-items-center text-white/90 text-[10px] font-extrabold uppercase tracking-wider px-2 text-center drop-shadow">
                  {g}
                </div>
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors duration-300" />
                {on && (
                  <div className="absolute bottom-2 right-2 w-7 h-7 rounded-full grid place-items-center bg-foreground text-background shadow-lg">
                    <Check size={15} strokeWidth={3} />
                  </div>
                )}
              </div>
              <div
                className={`truncate text-sm font-semibold ${
                  on ? "text-foreground" : "text-foreground/70"
                }`}
              >
                {g}
              </div>
            </button>
          );
        })}
      </div>

      <div className="sticky bottom-0 pt-4 pb-2 bg-background/80 backdrop-blur">
        <button
          onClick={finish}
          disabled={selected.size === 0 || saving}
          className="w-full h-12 rounded-full bg-foreground text-background text-sm font-bold disabled:opacity-40 active:scale-95 transition flex items-center justify-center gap-2"
        >
          {saving ? (
            <>
              <Loader2 size={16} className="animate-spin" /> Saving…
            </>
          ) : (
            `Done${selected.size > 0 ? ` · ${selected.size}` : ""}`
          )}
        </button>
      </div>
    </div>
  );
}