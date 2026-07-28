import { Loader2, RefreshCw } from "lucide-react";

export default function AdminStats({ stats, loading, onRefresh, lastUpdated }) {
  const items = [
    { key: "tracks", label: "Tracks" },
    { key: "users", label: "Users" },
    { key: "pendingReports", label: "Pending Reports" },
    { key: "openSuggestions", label: "Open Suggestions" },
    { key: "playlists", label: "Playlists" },
    { key: "unclassified", label: "Unclassified" },
  ];
  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <div className="text-xs text-foreground/45">
          {lastUpdated ? `Updated ${lastUpdated}` : "Overview"}
        </div>
        <button
          onClick={onRefresh}
          disabled={loading}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-foreground/60 hover:text-foreground disabled:opacity-50"
        >
          <RefreshCw size={13} className={loading ? "animate-spin" : ""} />
          Refresh
        </button>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {items.map((it) => (
          <div key={it.key} className="rounded-2xl border border-border bg-card p-4">
            <div className="text-xs text-foreground/50">{it.label}</div>
            <div className="text-2xl font-extrabold mt-1">
              {loading ? (
                <Loader2 size={18} className="animate-spin text-foreground/40" />
              ) : (
                stats[it.key] ?? 0
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}