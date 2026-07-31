import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import Avatar from "@/components/Avatar";
import { Loader2, Search, X } from "lucide-react";

export default function NewMessageModal({ onClose }) {
  const nav = useNavigate();
  const [q, setQ] = useState("");
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);

  async function run() {
    const term = q.trim();
    if (!term) return;
    setSearching(true);
    try {
      const res = await base44.functions.invoke("searchUsers", { q: term });
      setResults(res?.data?.results || []);
    } catch {
      setResults([]);
    } finally {
      setSearching(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative w-full md:max-w-md bg-popover border border-border rounded-t-3xl md:rounded-3xl p-5 max-h-[80vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-extrabold tracking-tight">New message</h2>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full grid place-items-center hover:bg-foreground/[0.06]"
            aria-label="Close"
          >
            <X size={16} />
          </button>
        </div>

        <div className="flex items-center gap-2 mb-4">
          <input
            autoFocus
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && run()}
            placeholder="Search people…"
            className="flex-1 min-w-0 bg-transparent border border-border rounded-full px-4 py-2.5 text-sm outline-none focus:border-foreground/30"
          />
          <button
            onClick={run}
            disabled={searching || !q.trim()}
            className="shrink-0 w-11 h-11 rounded-full bg-foreground text-background grid place-items-center disabled:opacity-40"
            aria-label="Search"
          >
            {searching ? <Loader2 size={16} className="animate-spin" /> : <Search size={16} />}
          </button>
        </div>

        {results.length === 0 ? (
          <p className="text-sm text-foreground/50 text-center py-8">
            Search for someone by name or email to start a conversation.
          </p>
        ) : (
          <div className="space-y-0.5">
            {results.map((u) => (
              <button
                key={u.id}
                onClick={() => {
                  onClose();
                  nav(`/messages/${u.id}`);
                }}
                className="w-full flex items-center gap-3 rounded-xl px-2 py-2.5 hover:bg-foreground/[0.05] text-left"
              >
                <Avatar user={u} size={38} />
                <div className="min-w-0">
                  <div className="text-sm font-semibold truncate">
                    {u.display_name || u.full_name || u.email}
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}