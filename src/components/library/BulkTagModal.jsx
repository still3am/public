import { useState } from "react";
import { X, Tag, Check } from "lucide-react";

export default function BulkTagModal({ allTags = [], count, onApply, onClose }) {
  const [tags, setTags] = useState([]);
  const [value, setValue] = useState("");

  const commit = () => {
    const t = value.trim().replace(/^#/, "");
    if (!t) return;
    setTags((prev) => (prev.includes(t) ? prev : [...prev, t]));
    setValue("");
  };

  const toggle = (t) =>
    setTags((prev) => (prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t]));

  return (
    <div className="fixed inset-0 z-[70] flex items-end md:items-center justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full md:max-w-md bg-card border rounded-t-3xl md:rounded-3xl p-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] max-h-[80vh] overflow-y-auto">
        <div className="md:hidden w-10 h-1 bg-foreground/20 rounded-full mx-auto mb-4" />
        <div className="flex items-center justify-between mb-4">
          <div className="min-w-0">
            <h2 className="text-lg font-extrabold tracking-tight">Tag tracks</h2>
            <p className="text-xs text-foreground/50 mt-0.5">{count} selected</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-foreground/10 shrink-0"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        <div className="flex items-center gap-2 mb-3">
          <div className="relative flex-1">
            <Tag size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-foreground/40" />
            <input
              value={value}
              onChange={(e) => setValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  commit();
                }
              }}
              placeholder="Add a tag…"
              className="w-full pl-9 pr-3 py-2.5 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          <button
            onClick={commit}
            disabled={!value.trim()}
            className="h-10 px-4 rounded-lg bg-foreground text-background text-xs font-bold disabled:opacity-40"
          >
            Add
          </button>
        </div>

        {tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-4">
            {tags.map((t) => (
              <button key={t} onClick={() => toggle(t)} className="chip active">
                {t} <X size={11} />
              </button>
            ))}
          </div>
        )}

        {allTags.length > 0 && (
          <div className="mb-5">
            <div className="text-[11px] font-bold uppercase tracking-wider text-foreground/50 mb-2">
              Your tags
            </div>
            <div className="flex flex-wrap gap-1.5">
              {allTags.map((t) => (
                <button
                  key={t}
                  onClick={() => toggle(t)}
                  className={`chip ${tags.includes(t) ? "active" : ""}`}
                >
                  {tags.includes(t) && <Check size={11} />}
                  {t}
                </button>
              ))}
            </div>
          </div>
        )}

        <button
          onClick={() => onApply(tags)}
          disabled={!tags.length}
          className="w-full h-12 rounded-full bg-foreground text-background text-sm font-bold disabled:opacity-40 active:scale-95 transition"
        >
          Apply to {count} {count === 1 ? "track" : "tracks"}
        </button>
      </div>
    </div>
  );
}