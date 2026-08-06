import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { GENRES } from "@/lib/audio-utils";
import { clearUserGenresCache } from "@/lib/userGenres";
import { Check, Loader2, Music } from "lucide-react";

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
        <div className="w-14 h-14 rounded-2xl grid place-items-center bg-foreground/[0.05] text-foreground/60 mb-4">
          <Music size={26} />
        </div>
        <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight mb-2">
          Pick your sound
        </h1>
        <p className="text-sm text-foreground/55 max-w-sm">
          Choose the genres you love. We'll tune your feed and queue to match.
        </p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 flex-1">
        {GENRES.map((g) => {
          const on = selected.has(g);
          return (
            <button
              key={g}
              onClick={() => toggle(g)}
              className={`relative px-3 py-3 rounded-xl text-sm font-semibold border transition active:scale-[0.98] text-left ${
                on
                  ? "bg-foreground text-background border-foreground"
                  : "border-border text-foreground/70 hover:bg-foreground/[0.04]"
              }`}
            >
              {on && (
                <Check size={14} className="absolute top-2 right-2" />
              )}
              {g}
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