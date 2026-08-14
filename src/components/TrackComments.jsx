import { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { Loader2, Send, MessageCircle } from "lucide-react";

export default function TrackComments({ trackId }) {
  const { user } = useAuth();
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const c = await base44.entities.TrackComment.filter(
        { track_id: trackId },
        "-created_date",
        200
      );
      setComments(c || []);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    const unsub = base44.entities.TrackComment.subscribe((event) => {
      if (event.data?.track_id !== trackId) return;
      if (event.type === "create") setComments((prev) => [event.data, ...prev]);
      else if (event.type === "delete")
        setComments((prev) => prev.filter((c) => c.id !== event.data.id));
    });
    return unsub;
  }, [trackId]);

  async function send() {
    if (!text.trim() || sending) return;
    setSending(true);
    try {
      const c = await base44.entities.TrackComment.create({
        track_id: trackId,
        author_id: user.id,
        author_name: user.display_name || user.full_name || "",
        author_avatar_url: user.avatar_url || "",
        message: text.trim(),
      });
      setComments((prev) => [c, ...prev]);
      setText("");
    } finally {
      setSending(false);
    }
  }

  async function remove(id) {
    await base44.entities.TrackComment.delete(id);
    setComments((prev) => prev.filter((c) => c.id !== id));
  }

  return (
    <div className="mb-6">
      <h2 className="text-lg font-extrabold tracking-tight mb-3 flex items-center gap-2">
        <MessageCircle size={18} /> Comments
      </h2>
      <div className="flex items-center gap-2 mb-4">
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && send()}
          placeholder="Write a comment…"
          className="flex-1 px-3.5 py-2.5 rounded-full bg-foreground/[0.06] text-sm focus:outline-none focus:ring-1 focus:ring-ring"
        />
        <button
          onClick={send}
          disabled={!text.trim() || sending}
          className="w-10 h-10 rounded-full bg-foreground text-background grid place-items-center disabled:opacity-30 shrink-0 active:scale-95 transition"
        >
          {sending ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} />}
        </button>
      </div>
      {loading ? (
        <div className="flex justify-center py-6">
          <Loader2 className="animate-spin text-foreground/40" />
        </div>
      ) : comments.length === 0 ? (
        <p className="text-sm text-foreground/40 text-center py-6">
          No comments yet. Be the first!
        </p>
      ) : (
        <div className="space-y-3">
          {comments.map((c) => (
            <div key={c.id} className="flex items-start gap-3">
              {c.author_avatar_url ? (
                <img
                  src={c.author_avatar_url}
                  alt=""
                  className="w-8 h-8 rounded-full object-cover shrink-0"
                />
              ) : (
                <div className="w-8 h-8 rounded-full bg-foreground/10 grid place-items-center text-xs font-semibold shrink-0">
                  {(c.author_name || "?").charAt(0)}
                </div>
              )}
              <div className="flex-1 min-w-0">
                <div className="bg-foreground/[0.06] rounded-2xl rounded-tl-md px-3.5 py-2">
                  <div className="text-xs font-semibold mb-0.5">
                    {c.author_name || "Unknown"}
                  </div>
                  <div className="text-sm break-words">{c.message}</div>
                </div>
                {c.author_id === user?.id && (
                  <button
                    onClick={() => remove(c.id)}
                    className="text-[10px] text-foreground/30 hover:text-destructive mt-1 ml-2"
                  >
                    Delete
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}