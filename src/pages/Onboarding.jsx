import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { GENRES } from "@/lib/audio-utils";
import { clearUserGenresCache } from "@/lib/userGenres";
import { Check, Loader2, RotateCcw } from "lucide-react";
import Logo from "@/components/Logo";

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
    <div className="h-screen flex flex-col px-4 pt-6 pb-3 max-w-3xl mx-auto overflow-hidden">
      <div className="flex flex-col items-center text-center mb-4 shrink-0">
        <Logo size={72} className="mb-3" />
        <h1 className="text-xl md:text-2xl font-extrabold tracking-tight mb-1.5">
          Pick your sound
        </h1>
        <p className="text-[13px] text-foreground/55 max-w-sm leading-relaxed">
          Tap the genres that move you — your Discover feed and auto-queue will be built around what you choose.
        </p>
        {selected.size > 0 && (
          <button
            onClick={() => setSelected(new Set())}
            className="mt-2.5 inline-flex items-center gap-1.5 text-xs font-semibold text-foreground/55 hover:text-foreground active:scale-95 transition"
          >
            <RotateCcw size={13} /> Reset
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto -mx-1 px-1">
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2">
          {GENRES.map((g) => {
            const on = selected.has(g);
            return (
              <button
                key={g}
                onClick={() => toggle(g)}
                className={`group relative rounded-xl p-1.5 transition-all duration-300 text-center cursor-pointer
                  hover:bg-foreground/[0.04] active:scale-[0.98]`}
              >
                <div
                  className={`relative aspect-square rounded-lg overflow-hidden mb-1.5 shadow-sm transition-all duration-300
                    ${on ? "ring-2 ring-foreground" : "bg-foreground/[0.06] group-hover:scale-[1.03]"}`}
                >
                  <div className="w-full h-full grid place-items-center text-foreground/25 text-[9px] font-semibold uppercase tracking-wider px-1.5 text-center leading-tight">
                    {g}
                  </div>
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors duration-300" />
                  {on && (
                    <div className="absolute bottom-1.5 right-1.5 w-6 h-6 rounded-full grid place-items-center bg-foreground text-background shadow-lg">
                      <Check size={13} strokeWidth={3} />
                    </div>
                  )}
                </div>
                <div
                  className={`truncate text-[11px] font-semibold ${
                    on ? "text-foreground" : "text-foreground/70"
                  }`}
                >
                  {g}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      <div className="shrink-0 pt-3 pb-1 bg-background/80 backdrop-blur">
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