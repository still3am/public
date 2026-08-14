import { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { Search, Send, Loader2, X, Music2 } from "lucide-react";

export default function SendTrackModal({ track, onClose }) {
  const { user } = useAuth();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(null);

  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      return;
    }
    setLoading(true);
    const t = setTimeout(async () => {
      try {
        const res = await base44.functions.invoke("searchUsers", { q: query.trim() });
        const users = res?.data?.results || [];
        setResults(users.filter((u) => u.id !== user?.id));
      } catch {
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 300);
    return () => clearTimeout(t);
  }, [query]);

  async function sendTo(targetUser) {
    setSending(targetUser.id);
    try {
      // Find existing conversation or create new one
      const existing = await base44.entities.Conversation
        .filter({ participant_ids: user.id }, "-created_date", 200)
        .catch(() => []);

      let convo = (existing || []).find(
        (c) => c.participant_ids?.includes(targetUser.id) && c.participant_ids?.length === 2
      );

      if (!convo) {
        convo = await base44.entities.Conversation.create({
          participant_ids: [user.id, targetUser.id],
          participant_names: [
            user.display_name || user.full_name || "",
            targetUser.display_name || targetUser.full_name || "",
          ],
          participant_avatars: [user.avatar_url || "", targetUser.avatar_url || ""],
          last_message_text: `🎵 ${track.title}`,
          last_message_at: new Date().toISOString(),
          last_sender_id: user.id,
        });
      } else {
        await base44.entities.Conversation.update(convo.id, {
          last_message_text: `🎵 ${track.title}`,
          last_message_at: new Date().toISOString(),
          last_sender_id: user.id,
        });
      }

      // Send the track message
      const minimalTrack = JSON.stringify({
        id: track.id,
        title: track.title,
        artist: track.artist || "",
        cover_art_url: track.cover_art_url || "",
        audio_url: track.audio_url,
        genre: track.genre || "",
      });

      await base44.entities.Message.create({
        conversation_id: convo.id,
        sender_id: user.id,
        recipient_id: targetUser.id,
        sender_name: user.display_name || user.full_name || "",
        sender_avatar_url: user.avatar_url || "",
        text: "",
        track_id: track.id,
        track: minimalTrack,
      });

      onClose();
    } catch (e) {
      console.error(e);
    } finally {
      setSending(null);
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm grid place-items-center p-4" onClick={onClose}>
      <div
        className="bg-card rounded-2xl w-full max-w-md shadow-2xl border border-border overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <h3 className="font-bold flex items-center gap-2">
            <Music2 size={16} /> Send track
          </h3>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-foreground/5" aria-label="Close">
            <X size={18} />
          </button>
        </div>

        {/* Track preview */}
        <div className="flex items-center gap-3 px-4 py-3 bg-foreground/[0.03]">
          <div className="w-12 h-12 rounded-lg overflow-hidden bg-foreground/10 shrink-0">
            {track.cover_art_url && <img src={track.cover_art_url} alt="" className="w-full h-full object-cover" />}
          </div>
          <div className="min-w-0">
            <div className="text-sm font-semibold truncate">{track.title}</div>
            <div className="text-xs text-foreground/50 truncate">{track.artist || ""}</div>
          </div>
        </div>

        {/* Search */}
        <div className="p-4">
          <div className="relative">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-foreground/40" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by name…"
              className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-foreground/[0.06] text-sm focus:outline-none focus:ring-1 focus:ring-ring"
              autoFocus
            />
          </div>

          <div className="mt-3 max-h-64 overflow-y-auto space-y-1">
            {loading && (
              <div className="flex justify-center py-6">
                <Loader2 className="animate-spin text-foreground/40" size={18} />
              </div>
            )}
            {!loading && results.length === 0 && query.trim() && (
              <p className="text-sm text-foreground/40 text-center py-6">No users found.</p>
            )}
            {!loading && !query.trim() && (
              <p className="text-sm text-foreground/40 text-center py-6">Search for someone to send this track to.</p>
            )}
            {!loading &&
              results.map((u) => (
                <button
                  key={u.id}
                  onClick={() => sendTo(u)}
                  disabled={sending === u.id}
                  className="w-full flex items-center gap-3 px-2.5 py-2 rounded-xl hover:bg-foreground/[0.04] transition text-left disabled:opacity-50"
                >
                  {u.avatar_url ? (
                    <img src={u.avatar_url} alt="" className="w-9 h-9 rounded-full object-cover shrink-0" />
                  ) : (
                    <div className="w-9 h-9 rounded-full bg-foreground/10 grid place-items-center text-xs font-semibold shrink-0">
                      {(u.display_name || u.full_name || "?").charAt(0)}
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium truncate">
                      {u.display_name || u.full_name || "Unknown"}
                    </div>
                  </div>
                  {sending === u.id ? (
                    <Loader2 size={16} className="animate-spin text-foreground/40" />
                  ) : (
                    <Send size={15} className="text-foreground/40" />
                  )}
                </button>
              ))}
          </div>
        </div>
      </div>
    </div>
  );
}