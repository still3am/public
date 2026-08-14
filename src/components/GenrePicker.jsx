import { useState } from "react";
import { GENRES } from "@/lib/audio-utils";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { ChevronDown, Music2 } from "lucide-react";

export default function GenrePicker({
  value,
  onChange,
  placeholder = "Select genre",
  className = "",
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  const q = search.trim().toLowerCase();
  const filtered = q
    ? GENRES.filter((g) => g.toLowerCase().includes(q))
    : GENRES;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button
          type="button"
          className={`w-full inline-flex items-center justify-between gap-2 px-3 py-2 rounded-lg border border-border bg-background text-sm hover:bg-foreground/[0.02] transition ${className}`}
        >
          <span className="inline-flex items-center gap-1.5 min-w-0">
            <Music2 size={14} className="text-foreground/40 shrink-0" />
            <span
              className={`truncate ${
                value
                  ? "text-foreground font-medium"
                  : "text-foreground/40"
              }`}
            >
              {value || placeholder}
            </span>
          </span>
          <ChevronDown size={16} className="text-foreground/40 shrink-0" />
        </button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Choose a genre</DialogTitle>
        </DialogHeader>
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search genres…"
          className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm mb-3"
          autoFocus
        />
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 max-h-72 overflow-y-auto pr-1">
          {filtered.map((g) => (
            <button
              key={g}
              type="button"
              onClick={() => {
                onChange(g);
                setOpen(false);
                setSearch("");
              }}
              className={`text-left px-2.5 py-1.5 rounded-lg text-xs font-medium border transition ${
                g === value
                  ? "bg-foreground text-background border-foreground"
                  : "border-border hover:bg-foreground/[0.04]"
              }`}
            >
              {g}
            </button>
          ))}
          {filtered.length === 0 && (
            <div className="col-span-full text-sm text-foreground/50 text-center py-6">
              No genres match “{search}”
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}