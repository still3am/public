import { reportActionError } from "@/lib/actionError";
import { readAllPages } from '@/lib/readPages';
import { useEffect, useState, useCallback, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { coalesce } from "@/lib/coalesce";
import SafetyControls from '@/components/SafetyControls';
import { useSafety } from '@/context/SafetyContext';
import { Link } from "react-router-dom";
import Avatar from "@/components/Avatar";
import { Loader2, Send, Trash2 } from "lucide-react";

/** @param {any} props */
export default function ProfileComments({ profileId, isOwn, active = true }) {
  const { user } = useAuth();
  const { blocked } = useSafety();

  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [message, setMessage] = useState("");
  const [posting, setPosting] = useState(false);
  const [visibleCount, setVisibleCount] = useState(10);
  const composerRef = useRef(null);
  const commentRequest = useRef({ text: "", key: "", id: "" });
  const identity = useRef(null);
  if (!identity.current || identity.current.uid !== user?.id || identity.current.profileId !== profileId) identity.current = { uid: user?.id, profileId };
  const scope = identity.current;
  const draftKey = `public:comment-draft:${user?.id || "guest"}:${profileId || ""}`;
  const requestVersion = useRef(0),postingRef = useRef(false),currentProfile = useRef(profileId),confirmed = useRef(new Map()),deleting = useRef(new Set()),alive = useRef(true);currentProfile.current = profileId;
  useEffect(() => {alive.current = true;return () => {alive.current = false;requestVersion.current++;};}, []);

  const load = useCallback(async () => {
    if (!profileId) {setComments([]);setLoading(false);return;}
    const request = ++requestVersion.current;
    setError(false);
    try {
      const items = await readAllPages((options) => base44.entities.ProfileComment.filter({ profile_id: profileId }, { sort: "-created_date", ...options }));
      if (request !== requestVersion.current || identity.current !== scope || currentProfile.current !== profileId || !alive.current) return;
      items.forEach((row) => confirmed.current.delete(row.id));
      const merged = new Map([...items, ...confirmed.current.values()].filter((row) => !deleting.current.has(row.id)).map((row) => [row.id, row]));
      setComments([...merged.values()].sort((a, b) => (b.created_date || '').localeCompare(a.created_date || '')));
    } catch {
      if (request === requestVersion.current && identity.current === scope) setError(true);
    } finally {
      if (request === requestVersion.current && identity.current === scope) setLoading(false);
    }
  }, [profileId, user?.id]);

  useEffect(() => {requestVersion.current++;confirmed.current.clear();deleting.current.clear();setComments([]);setPosting(false);setVisibleCount(10);try {setMessage(user?.id ? localStorage.getItem(draftKey) || "" : "");} catch {setMessage("");}setLoading(true);}, [profileId, user?.id]);
  useEffect(() => {
    if (!active) return;
    load();
    const reload = coalesce(load, 1200);
    let unsub = () => {};try {unsub = base44.entities.ProfileComment.subscribe(() => reload());} catch {}
    const timer = setInterval(reload, 30000);
    return () => {
      requestVersion.current++;clearInterval(timer);reload.cancel();
      unsub();
    };
  }, [load, active]);

  async function postComment(e) {
    e.preventDefault();
    const text = message.trim();
    if (!text || !user?.id || !profileId || postingRef.current === scope) return;
    if (commentRequest.current.text !== text || commentRequest.current.key !== draftKey) commentRequest.current = { text, key: draftKey, id: globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}` };
    postingRef.current = scope;setPosting(true);
    try {
      const saved = await base44.entities.ProfileComment.create({
        profile_id: profileId,
        author_id: user.id,
        author_name: user.display_name || user.full_name || "",
        author_avatar_url: user.avatar_url || "",
        message: text,
        request_id: commentRequest.current.id
      });
      if (!saved?.id) throw Error("Comment save was not confirmed");
      if (alive.current && identity.current === scope) {
        requestVersion.current++;
        confirmed.current.set(saved.id, saved);
        setComments((previous) => [saved, ...previous.filter((row) => row.id !== saved.id)]);
        setLoading(false);setError(false);
        setMessage((previous) => previous.trim() === text ? '' : previous);if (composerRef.current) composerRef.current.style.height = "44px";
        try {if ((localStorage.getItem(draftKey) || '').trim() === text) localStorage.removeItem(draftKey);} catch {}
        load();
      }
      if (identity.current === scope && profileId !== user.id) {
        try {
          base44.entities.Notification.create({
            user_id: profileId,
            type: "profile_comment",
            actor_id: user.id
          }).catch(() => {});
        } catch {}
      }
    } catch (error) {
      if (alive.current && identity.current === scope) reportActionError(error, "Couldn’t post your comment. Your draft is still here.");
    } finally {
      if (postingRef.current === scope) postingRef.current = false;if (alive.current && identity.current === scope) setPosting(false);
    }
  }

  async function deleteComment(id) {
    // Take it out of the list right away and put it back if the delete fails,
    // rather than leaving the row sitting there waiting for a realtime event.
    if (deleting.current.has(id)) return;
    deleting.current.add(id);
    const before = comments;
    confirmed.current.delete(id);
    setComments((prev) => prev.filter((c) => c.id !== id));
    try {
      await base44.entities.ProfileComment.delete(id);
    } catch {
      if (identity.current !== scope) return;
      deleting.current.delete(id);
      if (alive.current && identity.current === scope) setComments((previous) => {if (previous.some((row) => row.id === id)) return previous;const row = before.find((row) => row.id === id);if (!row) return previous;const next = [...previous];next.splice(Math.min(before.findIndex((row) => row.id === id), next.length), 0, row);return next;});
      if (alive.current && identity.current === scope) reportActionError(null, "Couldn’t delete this comment. Please try again.");
    }
  }

  return (
    <div className="mb-8">
      {error && <div className="text-sm p-3 border rounded-xl mb-3"><button className="underline" onClick={load}>Refresh comments</button></div>}
      <h2 className="text-lg font-extrabold tracking-tight mb-4 flex items-center gap-2">
         Comments
      </h2>

      <form onSubmit={postComment} className="profile-comments-composer">
        <div><textarea ref={composerRef} rows={1} onInput={(e) => {e.currentTarget.style.height = "44px";e.currentTarget.style.height = Math.min(160, e.currentTarget.scrollHeight) + "px";}} onKeyDown={(e) => {if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {e.preventDefault();postComment(e);}}}
          aria-label="Leave a profile comment"
          value={message}
          onChange={(e) => {const value = e.target.value;setMessage(value);try {if (user?.id) {if (value) localStorage.setItem(draftKey, value);else localStorage.removeItem(draftKey);}} catch {}}}
          placeholder="Leave a comment..."
          maxLength={500}
          className="profile-comment-input" /><small>{message.length}/500</small></div>
        
        <button
          type="submit"
          disabled={posting || !user?.id || !message.trim()}
          className="w-11 h-11 rounded-full bg-foreground text-background grid place-items-center disabled:opacity-40 active:scale-90 transition shrink-0"
          aria-label="Post comment">
          
          {posting ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
        </button>
      </form>

      {loading ?
      <div className="py-8 grid place-items-center">
          <Loader2 className="animate-spin text-foreground/40" />
        </div> :
      comments.length === 0 ?
      <p className="text-center text-sm text-foreground/40 py-8">
          No comments yet. Be the first to leave one!
        </p> :

      <div className="space-y-3">
          {comments.filter((c) => !blocked.has(c.author_id)).slice(0, visibleCount).map((c) =>
        <div key={c.id} className="flex gap-3 p-3 rounded-2xl bg-foreground/[0.02]">
              <Link to={`/profile/${c.author_id}`} aria-label={`View ${c.author_name || "user"} profile`} className="shrink-0"><Avatar user={{ avatar_url: c.author_avatar_url, full_name: c.author_name }} size={40} /></Link>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <Link to={`/profile/${c.author_id}`} className="text-sm font-semibold truncate hover:underline">{c.author_name || "PUBLIC member"}</Link>
                  <span className="text-[10px] text-foreground/40 shrink-0">
                    {new Date(c.created_date).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                  </span>
                </div>
                <p className="selectable-content text-sm text-foreground/70 mt-1 break-words">{c.message}</p><SafetyControls type="comment" id={c.id} userId={c.author_id} label="comment" />
              </div>
              {(c.author_id === user?.id || isOwn) &&
          <button
            onClick={() => deleteComment(c.id)}
            className="p-1.5 rounded-full hover:bg-foreground/10 text-foreground/30 hover:text-foreground/60 transition shrink-0"
            aria-label="Delete comment">
            
                  <Trash2 size={14} />
                </button>
          }
            </div>
        )}
        </div>
      }
      {!loading && comments.filter((c) => !blocked.has(c.author_id)).length > visibleCount && <button type="button" className="playlist-action mt-4 w-full" onClick={() => setVisibleCount((n) => n + 10)}>Show older comments</button>}
      {visibleCount > 10 && <button type="button" className="text-xs underline min-h-11 mt-2" onClick={(e) => {setVisibleCount(10);e.currentTarget.closest('.profile-conversation')?.scrollTo({ top: 0, behavior: 'smooth' });composerRef.current?.focus({ preventScroll: true });}}>Back to latest comments</button>}
    </div>);

}