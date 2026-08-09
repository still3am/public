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
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full md:max-w-lg bg-background border border-border/50 rounded-t-3xl md:rounded-3xl p-4 pb-[calc(1rem+env(safe-area-inset-bottom))] max-h-[80vh] flex flex-col">
        <div className="md:hidden w-10 h-1 bg-foreground/20 rounded-full mx-auto mb-3" />
        <div className="flex items-center justify-between mb-3 px-1">
          <h3 className="text-[17px] font-semibold">New message</h3>
          <button onClick={onClose} className="p-1.5 rounded-full hover:bg-foreground/10" aria-label="Close">
            <X size={20} />
          </button>
        </div>
        <div className="relative mb-3">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-foreground/30 pointer-events-none" />
          <input
            value={query}
            onChange={(e) => doSearch(e.target.value)}
            placeholder="Search by name..."
            className="w-full pl-8 pr-3 py-1.5 rounded-full bg-foreground/[0.07] text-sm border-0 focus:outline-none placeholder:text-foreground/40"
            autoFocus
          />
        </div>
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="grid place-items-center py-10">
              <Loader2 size={22} className="animate-spin text-foreground/30" />
            </div>
          ) : searched && results.length === 0 ? (
            <p className="text-center text-sm text-foreground/40 py-8">
              No users found. Try searching by display name.
            </p>
          ) : !searched ? (
            <div className="flex flex-col items-center justify-center py-12 text-foreground/40">
              <MessageCircle size={28} className="mb-3" />
              <p className="text-sm">Search for someone to start chatting</p>
            </div>
          ) : (
            results.map((u) => (
              <button
                key={u.id}
                onClick={() => onPick(u)}
                className="w-full flex items-center gap-3 px-2 py-2 text-left hover:bg-foreground/[0.03] rounded-xl transition"
              >
                {u.avatar_url ? (
                  <img src={u.avatar_url} alt="" className="w-[49px] h-[49px] rounded-full object-cover shrink-0" />
                ) : (
                  <div className="w-[49px] h-[49px] rounded-full bg-foreground/10 grid place-items-center text-lg font-bold text-foreground/50 shrink-0">
                    {(u.display_name || "?").charAt(0).toUpperCase()}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="text-[15px] font-medium truncate">{u.display_name}</div>
                </div>
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  );
}