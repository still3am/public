import { useEffect, useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { X, Search, Loader2, Music } from "lucide-react";

export default function MixerTrackPicker({ open, onClose, onLoad }) {
  const [tracks, setTracks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [q, setQ] = useState("");

  useEffect(() => {
    if (!open) return;
    let live = true;
    setLoading(true);
    base44.entities.Track
      .filter({ approval_status: "approved", is_published: true }, "-created_date", 100)
      .then((rows) => {
        if (!live) return;
        setTracks(rows || []);
      })
      .catch(() => {})
      .finally(() => live && setLoading(false));
    return () => {
      live = false;
    };
  }, [open]);

  const filtered = useMemo(() => {
    if (!q.trim()) return tracks;
    const s = q.toLowerCase();
    return tracks.filter(
      (t) =>
        (t.title || "").toLowerCase().includes(s) ||
        (t.artist || "").toLowerCase().includes(s) ||
        (t.uploader_name || "").toLowerCase().includes(s)
    );
  }, [tracks, q]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[70] bg-black/85 backdrop-blur-2xl flex flex-col animate-[fadeIn_.2s_ease-out]">
      <div className="flex items-center justify-between px-4 pt-4 pb-3 border-b border-white/10">
        <h2 className="text-base font-bold text-white">Load a track</h2>
        <button
          onClick={onClose}
          className="p-2 rounded-full hover:bg-white/10 active:scale-90 transition text-white/80"
          aria-label="Close"
        >
          <X size={22} />
        </button>
      </div>

      <div className="px-4 py-3">
        <div className="flex items-center gap-2 rounded-full bg-white/10 px-3 py-2">
          <Search size={16} className="text-white/50" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search tracks, artists…"
            className="bg-transparent flex-1 text-sm text-white placeholder:text-white/40 outline-none"
          />
        </div>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto px-3 pb-8">
        {loading ? (
          <div className="grid place-items-center py-16 text-white/60">
            <Loader2 size={26} className="animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="grid place-items-center py-16 text-white/50 text-sm">No tracks found.</div>
        ) : (
          <div className="space-y-1">
            {filtered.map((t) => (
              <div
                key={t.id}
                className="flex items-center gap-3 px-2 py-2 rounded-xl hover:bg-white/[0.06] transition"
              >
                <div className="relative w-11 h-11 rounded-lg overflow-hidden bg-white/10 shrink-0 grid place-items-center">
                  {t.cover_art_url ? (
                    <img src={t.cover_art_url} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <Music size={18} className="text-white/30" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-medium text-white truncate">{t.title}</div>
                  <div className="text-xs text-white/50 truncate">{t.artist || t.uploader_name || "Unknown"}</div>
                </div>
                <button
                  onClick={() => {
                    onLoad("A", t);
                    onClose();
                  }}
                  className="w-8 h-8 rounded-full bg-white/15 hover:bg-white/25 active:scale-90 text-xs font-bold text-white grid place-items-center transition shrink-0"
                  aria-label="Load to deck A"
                >
                  A
                </button>
                <button
                  onClick={() => {
                    onLoad("B", t);
                    onClose();
                  }}
                  className="w-8 h-8 rounded-full bg-white text-black hover:opacity-90 active:scale-90 text-xs font-bold grid place-items-center transition shrink-0"
                  aria-label="Load to deck B"
                >
                  B
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}