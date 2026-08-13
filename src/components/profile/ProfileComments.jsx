import { useEffect, useState, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import Avatar from "@/components/Avatar";
import { Loader2, Send, Trash2, MessageCircle } from "lucide-react";

export default function ProfileComments({ profileId, isOwn }) {
  const { user } = useAuth();
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [posting, setPosting] = useState(false);

  const load = useCallback(async () => {
    try {
      const items = await base44.entities.ProfileComment.filter(
        { profile_id: profileId },
        "-created_date",
        200
      );
      setComments(items || []);
    } catch {
      setComments([]);
    } finally {
      setLoading(false);
    }
  }, [profileId]);

  useEffect(() => {
    load();
    const unsub = base44.entities.ProfileComment.subscribe(() => load());
    return unsub;
  }, [load]);

  async function postComment(e) {
    e.preventDefault();
    const text = message.trim();
    if (!text || !user) return;
    setPosting(true);
    try {
      await base44.entities.ProfileComment.create({
        profile_id: profileId,
        author_id: user.id,
        author_name: user.display_name || user.full_name || "",
        author_avatar_url: user.avatar_url || "",
        message: text,
      });
      setMessage("");
      if (profileId !== user.id) {
        try {
          await base44.entities.Notification.create({
            user_id: profileId,
            type: "profile_comment",
            actor_id: user.id,
          });
        } catch {}
      }
    } catch {
      // ignore — subscribe will not fire
    } finally {
      setPosting(false);
    }
  }

  async function deleteComment(id) {
    try {
      await base44.entities.ProfileComment.delete(id);
    } catch {}
  }

  return (
    <div className="mb-8">
      <h2 className="text-lg font-extrabold tracking-tight mb-4 flex items-center gap-2">
        <MessageCircle size={18} /> Comments
      </h2>

      <form onSubmit={postComment} className="mb-4 flex gap-2">
        <input
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Leave a comment..."
          maxLength={500}
          className="flex-1 px-4 py-2.5 rounded-full border border-border bg-background text-sm"
        />
        <button
          type="submit"
          disabled={posting || !message.trim()}
          className="w-11 h-11 rounded-full bg-foreground text-background grid place-items-center disabled:opacity-40 active:scale-90 transition shrink-0"
          aria-label="Post comment"
        >
          {posting ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
        </button>
      </form>

      {loading ? (
        <div className="py-8 grid place-items-center">
          <Loader2 className="animate-spin text-foreground/40" />
        </div>
      ) : comments.length === 0 ? (
        <p className="text-center text-sm text-foreground/40 py-8">
          No comments yet. Be the first to leave one!
        </p>
      ) : (
        <div className="space-y-3">
          {comments.map((c) => (
            <div key={c.id} className="flex gap-3 p-3 rounded-2xl bg-foreground/[0.02]">
              <Avatar user={{ avatar_url: c.author_avatar_url, full_name: c.author_name }} size={40} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-semibold truncate">{c.author_name || "Someone"}</span>
                  <span className="text-[10px] text-foreground/40 shrink-0">
                    {new Date(c.created_date).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                  </span>
                </div>
                <p className="text-sm text-foreground/70 mt-1 break-words">{c.message}</p>
              </div>
              {(c.author_id === user?.id || isOwn) && (
                <button
                  onClick={() => deleteComment(c.id)}
                  className="p-1.5 rounded-full hover:bg-foreground/10 text-foreground/30 hover:text-foreground/60 transition shrink-0"
                  aria-label="Delete comment"
                >
                  <Trash2 size={14} />
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}