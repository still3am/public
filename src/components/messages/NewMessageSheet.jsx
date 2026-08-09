import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { X, Search, Loader2, MessageCircle } from "lucide-react";

export default function NewMessageSheet({ onPick, onClose }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  async function doSearch(q) {
    setQuery(q);
    const trimmed = q.trim();
    if (!trimmed) {
      setResults([]);
      setSearched(false);
      return;
    }
    setLoading(true);
    setSearched(true);
    try {
      const res = await base44.functions.invoke("searchMessageUsers", { q: trimmed });
      setResults(res?.data?.results || []);
    } catch {
      setResults([]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[70] flex items-end md:items-center justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full md:max-w-lg bg-card border rounded-t-3xl md:rounded-3xl p-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] max-h-[80vh] flex flex-col">
        <div className="md:hidden w-10 h-1 bg-foreground/20 rounded-full mx-auto mb-4" />
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-extrabold">New message</h3>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-foreground/10" aria-label="Close">
            <X size={18} />
          </button>
        </div>
        <div className="relative mb-3">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-foreground/30" />
          <input
            value={query}
            onChange={(e) => doSearch(e.target.value)}
            placeholder="Search by name..."
            className="w-full pl-9 pr-3 py-2 rounded-lg border border-border bg-background text-sm"
            autoFocus
          />
        </div>
        <div className="flex-1 overflow-y-auto space-y-1.5 -mx-1 px-1">
          {loading ? (
            <div className="grid place-items-center py-10">
              <Loader2 size={22} className="animate-spin text-foreground/40" />
            </div>
          ) : searched && results.length === 0 ? (
            <p className="text-center text-sm text-foreground/40 py-8">
              No users found. Try searching by display name.
            </p>
          ) : !searched ? (
            <div className="flex flex-col items-center justify-center py-12 text-foreground/40">
              <MessageCircle size={32} className="mb-3" />
              <p className="text-sm">Search for someone to start chatting</p>
            </div>
          ) : (
            results.map((u) => (
              <button
                key={u.id}
                onClick={() => onPick(u)}
                className="w-full flex items-center gap-3 p-2.5 rounded-xl text-left hover:bg-foreground/[0.04] transition"
              >
                {u.avatar_url ? (
                  <img src={u.avatar_url} alt="" className="w-11 h-11 rounded-full object-cover shrink-0" />
                ) : (
                  <div className="w-11 h-11 rounded-full bg-foreground/10 grid place-items-center text-sm font-bold text-foreground/50 shrink-0">
                    {(u.display_name || "?").charAt(0).toUpperCase()}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold truncate">{u.display_name}</div>
                </div>
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  );
}