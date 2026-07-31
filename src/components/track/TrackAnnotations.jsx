import { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { usePlayer } from "@/context/PlayerContext";
import { formatTime } from "@/lib/audio-utils";
import { MessageSquare, Loader2, Trash2, MapPin } from "lucide-react";

export default function TrackAnnotations({ track }) {
  const { user } = useAuth();
  const p = usePlayer();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [body, setBody] = useState("");
  const [saving, setSaving] = useState(false);

  const isCurrent = p.currentTrack?.id === track.id;
  const pinAt = isCurrent ? p.position : 0;

  async function load() {
    const rows = await base44.entities.TrackAnnotation
      .filter({ track_id: track.id }, "timestamp_ms", 200)
      .catch(() => []);
    setItems(Array.isArray(rows) ? rows : []);
    setLoading(false);
  }

  useEffect(() => {
    setLoading(true);
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [track.id]);

  async function add() {
    const text = body.trim();
    if (!text || !user) return;
    setSaving(true);
    try {
      const created = await base44.entities.TrackAnnotation.create({
        track_id: track.id,
        author_id: user.id,
        author_name: user.display_name || user.full_name || "Someone",
        author_avatar_url: user.avatar_url || "",
        timestamp_ms: Math.round(pinAt * 1000),
        body: text,
      });
      setItems((prev) =>
        [...prev, created].sort((a, b) => a.timestamp_ms - b.timestamp_ms)
      );
      setBody("");
    } finally {
      setSaving(false);
    }
  }

  async function remove(id) {
    setItems((prev) => prev.filter((x) => x.id !== id));
    await base44.entities.TrackAnnotation.delete(id).catch(() => load());
  }

  function jumpTo(ms) {
    const secs = ms / 1000;
    if (isCurrent) p.seek(secs);
    else {
      p.playTrackAt([track]);
      setTimeout(() => p.seek(secs), 600);
    }
  }

  const duration = p.duration || track.duration_seconds || 0;

  return (
    <div className="mb-8">
      <h2 className="text-lg font-extrabold tracking-tight mb-3 flex items-center gap-2">
        <MessageSquare size={18} /> Moments
        {items.length > 0 && (
          <span className="text-xs font-semibold text-foreground/40 bg-foreground/[0.05] rounded-full px-2.5 py-1">
            {items.length}
          </span>
        )}
      </h2>

      {/* Timeline strip with a marker per pinned note */}
      {duration > 0 && (
        <div className="relative h-8 mb-3 rounded-full bg-foreground/[0.06] overflow-hidden">
          {items.map((a) => (
            <button
              key={a.id}
              onClick={() => jumpTo(a.timestamp_ms)}
              title={`${formatTime(a.timestamp_ms / 1000)} — ${a.body}`}
              style={{
                left: `${Math.min(98, (a.timestamp_ms / 1000 / duration) * 100)}%`,
              }}
              className="absolute top-1 bottom-1 w-1.5 rounded-full bg-foreground/70 hover:bg-foreground hover:w-2 transition-all"
            />
          ))}
          {isCurrent && (
            <div
              style={{ left: `${Math.min(99, (p.position / duration) * 100)}%` }}
              className="absolute top-0 bottom-0 w-0.5 bg-emerald-500"
            />
          )}
        </div>
      )}

      <div className="flex items-center gap-2 mb-4">
        <span className="shrink-0 inline-flex items-center gap-1 text-[11px] font-bold text-foreground/60 bg-foreground/[0.06] rounded-full px-2.5 py-1.5">
          <MapPin size={11} /> {formatTime(pinAt)}
        </span>
        <input
          value={body}
          onChange={(e) => setBody(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && add()}
          placeholder={
            isCurrent ? "Pin a note at this moment…" : "Play the track to pin a moment"
          }
          className="flex-1 min-w-0 bg-transparent border border-border rounded-full px-4 py-2 text-sm outline-none focus:border-foreground/30"
        />
        <button
          onClick={add}
          disabled={saving || !body.trim()}
          className="shrink-0 px-4 py-2 rounded-full bg-foreground text-background text-sm font-bold disabled:opacity-40 active:scale-95 transition"
        >
          {saving ? <Loader2 size={14} className="animate-spin" /> : "Pin"}
        </button>
      </div>

      {loading ? (
        <div className="py-6 grid place-items-center">
          <Loader2 size={16} className="animate-spin text-foreground/40" />
        </div>
      ) : items.length === 0 ? (
        <p className="text-sm text-foreground/50 px-1">
          No moments pinned yet. Play the track and drop a note on the exact second
          that hits.
        </p>
      ) : (
        <div className="space-y-1">
          {items.map((a) => (
            <div
              key={a.id}
              className="group flex items-start gap-3 rounded-xl px-2 py-2 hover:bg-foreground/[0.04]"
            >
              <button
                onClick={() => jumpTo(a.timestamp_ms)}
                className="shrink-0 mt-0.5 text-[11px] font-bold font-mono text-foreground/70 bg-foreground/[0.06] rounded-md px-2 py-1 hover:bg-foreground hover:text-background transition"
              >
                {formatTime(a.timestamp_ms / 1000)}
              </button>
              <div className="min-w-0 flex-1">
                <p className="text-sm text-foreground/85 break-words">{a.body}</p>
                <p className="text-[11px] text-foreground/45 mt-0.5">
                  {a.author_name}
                </p>
              </div>
              {a.author_id === user?.id && (
                <button
                  onClick={() => remove(a.id)}
                  className="shrink-0 p-1.5 rounded-lg text-foreground/30 hover:text-red-600 md:opacity-0 group-hover:opacity-100 transition"
                  aria-label="Delete note"
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