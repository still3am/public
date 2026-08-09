import { useState } from "react";
import { Image } from "@/components/ui/image";
import { Check, X, Search } from "lucide-react";

export default function TrackPickerSheet({ title, selectedIds, max, tracks, onToggle, onClose }) {
  const [query, setQuery] = useState("");
  const filtered = (tracks || []).filter(
    (t) =>
      !query ||
      t.title?.toLowerCase().includes(query.toLowerCase()) ||
      (t.artist || t.uploader_name || "").toLowerCase().includes(query.toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-[70] flex items-end md:items-center justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full md:max-w-lg bg-card border rounded-t-3xl md:rounded-3xl p-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] max-h-[80vh] flex flex-col">
        <div className="md:hidden w-10 h-1 bg-foreground/20 rounded-full mx-auto mb-4" />
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-extrabold">{title}</h3>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-foreground/10" aria-label="Close">
            <X size={18} />
          </button>
        </div>
        <div className="relative mb-3">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-foreground/30" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search tracks..."
            className="w-full pl-9 pr-3 py-2 rounded-lg border border-border bg-background text-sm"
          />
        </div>
        <div className="flex-1 overflow-y-auto space-y-1.5 -mx-1 px-1">
          {filtered.length === 0 ? (
            <p className="text-center text-sm text-foreground/40 py-8">
              {tracks?.length === 0 ? "No tracks available. Upload music to pin tracks." : "No tracks found"}
            </p>
          ) : (
            filtered.map((t) => {
              const selected = selectedIds.includes(t.id);
              const canSelect = selected || selectedIds.length < max;
              return (
                <button
                  key={t.id}
                  onClick={() => canSelect && onToggle(t.id)}
                  disabled={!canSelect && !selected}
                  className={`w-full flex items-center gap-3 p-2.5 rounded-xl text-left transition ${
                    selected ? "bg-foreground/[0.06] ring-1 ring-foreground/20" : "hover:bg-foreground/[0.03]"
                  } ${!canSelect && !selected ? "opacity-40" : ""}`}
                >
                  <div className="w-12 h-12 rounded-lg overflow-hidden bg-foreground/10 shrink-0">
                    {t.cover_art_url ? (
                      <Image src={t.cover_art_url} fittingType="fill" alt="" className="w-full h-full" />
                    ) : (
                      <div className="w-full h-full grid place-items-center text-[8px] uppercase text-foreground/30">
                        {t.genre}
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold truncate">{t.title}</div>
                    <div className="text-xs text-foreground/50 truncate">{t.artist || t.uploader_name}</div>
                  </div>
                  {selected && <Check size={18} className="text-foreground shrink-0" />}
                </button>
              );
            })
          )}
        </div>
        {max > 1 && (
          <p className="text-xs text-foreground/40 mt-3 text-center">
            {selectedIds.length} / {max} selected
          </p>
        )}
      </div>
    </div>
  );
}