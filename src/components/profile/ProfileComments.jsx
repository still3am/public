import { useEffect, useState, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { coalesce } from "@/lib/coalesce";
import SafetyControls from '@/components/SafetyControls';
import {useSafety} from '@/context/SafetyContext';
import Avatar from "@/components/Avatar";
import { Loader2, Send, Trash2, MessageCircle } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

/** @param {any} props */
export default function ProfileComments({ profileId, isOwn }) {
  const { user } = useAuth();
  const {blocked}=useSafety();
  const { toast } = useToast();
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error,setError]=useState(false);
  const [message, setMessage] = useState("");
  const [posting, setPosting] = useState(false);

  const load = useCallback(async () => {
    setError(false);
    try {
      const items = await base44.entities.ProfileComment.filter(
        { profile_id: profileId },
        "-created_date",
        200
      );
      setComments(items || []);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [profileId]);

  useEffect(() => {
    load();
    const reload = coalesce(load, 1200);
    let unsub=()=>{};try{unsub=base44.entities.ProfileComment.subscribe(()=>reload());}catch{}
    const timer=setInterval(reload,30000);
    return () => {
      clearInterval(timer);reload.cancel();
      unsub();
    };
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
      await load();
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
      toast({ title: "Couldn't post your comment", variant: "destructive" });
    } finally {
      setPosting(false);
    }
  }

  async function deleteComment(id) {
    // Take it out of the list right away and put it back if the delete fails,
    // rather than leaving the row sitting there waiting for a realtime event.
    const before = comments;
    setComments((prev) => prev.filter((c) => c.id !== id));
    try {
      await base44.entities.ProfileComment.delete(id);
    } catch {
      setComments(before);
      toast({ title: "Couldn't delete that comment", variant: "destructive" });
    }
  }

  return (
    <div className="mb-8">
      {error&&<div role="alert" className="text-sm p-3 border rounded-xl mb-3">Comments could not refresh. <button className="underline" onClick={load}>Retry</button></div>}
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
          {comments.filter(c=>!blocked.has(c.author_id)).map((c) => (
            <div key={c.id} className="flex gap-3 p-3 rounded-2xl bg-foreground/[0.02]">
              <Avatar user={{ avatar_url: c.author_avatar_url, full_name: c.author_name }} size={40} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-semibold truncate">{c.author_name || "Someone"}</span>
                  <span className="text-[10px] text-foreground/40 shrink-0">
                    {new Date(c.created_date).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                  </span>
                </div>
                <p className="selectable-content text-sm text-foreground/70 mt-1 break-words">{c.message}</p><SafetyControls type="comment" id={c.id} userId={c.author_id} label="comment" />
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