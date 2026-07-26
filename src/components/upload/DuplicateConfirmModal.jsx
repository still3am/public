import { Link } from "react-router-dom";
import { Music, Trash2, AlertTriangle } from "lucide-react";

export default function DuplicateConfirmModal({ matches, onContinue, onCancel, onDelete }) {
  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm grid place-items-center p-4">
      <div className="bg-card rounded-3xl w-full max-w-md p-5 shadow-2xl">
        <div className="flex items-center gap-2 mb-1">
          <AlertTriangle size={18} className="text-amber-500" />
          <h3 className="text-lg font-extrabold tracking-tight">Possible duplicate</h3>
        </div>
        <p className="text-sm text-foreground/60 mb-4">
          We found a track that looks like what you're uploading. Delete the existing copy,
          or upload it anyway.
        </p>
        <div className="space-y-2 mb-3 max-h-60 overflow-y-auto no-scrollbar">
          {matches.map((m, i) => (
            <div
              key={i}
              className="flex items-center gap-2 p-2 rounded-2xl border border-border hover:bg-foreground/[0.03] transition">
              <Link
                to={`/track/${m.existing.id}`}
                onClick={onCancel}
                className="flex items-center gap-3 min-w-0 flex-1">
                <div className="w-10 h-10 rounded-lg bg-foreground/10 overflow-hidden shrink-0">
                  {m.existing.cover_art_url ? (
                    <img src={m.existing.cover_art_url} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full grid place-items-center text-foreground/40">
                      <Music size={14} />
                    </div>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-semibold truncate">{m.existing.title}</div>
                  <div className="text-xs text-foreground/50 truncate">{m.existing.artist || "you"}</div>
                </div>
                <span className="text-xs text-foreground/40 shrink-0">View &rarr;</span>
              </Link>
              {onDelete && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    onDelete(m.existing.id);
                  }}
                  className="p-2 rounded-full border border-border hover:bg-red-500/10 hover:text-red-600 hover:border-red-300 transition shrink-0"
                  aria-label="Delete duplicate"
                  title="Delete duplicate">
                  <Trash2 size={14} />
                </button>
              )}
            </div>
          ))}
        </div>
        <p className="text-xs text-foreground/45 mb-4">
          Delete all matches and your new upload continues automatically — or upload anyway.
        </p>
        <div className="flex justify-end gap-2">
          <button
            onClick={onCancel}
            className="px-4 py-2 rounded-full border border-border text-sm font-semibold hover:bg-foreground/5">
            Go back
          </button>
          <button
            onClick={onContinue}
            className="px-4 py-2 rounded-full bg-foreground text-background text-sm font-semibold hover:scale-[1.02] transition">
            Upload anyway
          </button>
        </div>
      </div>
    </div>
  );
}