import { useEffect, useRef, useState } from "react";
import { Loader2, X, Pause, Play, Save, Timer, RotateCcw, Undo2 } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { usePlayer } from "@/context/PlayerContext";
import { useToast } from "@/components/ui/use-toast";
import { formatTime } from "@/lib/audio-utils";

// Tap-along lyrics timing: the owner pastes (or reuses) the lyrics, plays the
// track and stamps each line at the moment it starts. The saved timings are
// what the now-playing screen follows line by line.
export default function SyncLyricsModal({ track, onClose, onSaved }) {
  const { user } = useAuth();
  const { toast } = useToast();
  const p = usePlayer();
  const [loading, setLoading] = useState(true);
  const [existingId, setExistingId] = useState(null);
  const [step, setStep] = useState("edit");
  const [draft, setDraft] = useState("");
  const [rows, setRows] = useState([]);
  const [cursor, setCursor] = useState(0);
  const [saving, setSaving] = useState(false);
  const rowRefs = useRef([]);

  useEffect(() => {
    let alive = true;
    (async () => {
      const records = await base44.entities.Lyrics
        .filter({ track_id: track.id }, "-created_date", 5)
        .catch(() => []);
      const mine = Array.isArray(records) ? records.find((r) => r.uploader_id === user?.id) : null;
      let text = "";
      if (mine?.lines?.length) {
        text = mine.lines.map((l) => l.text || "").join("\n");
      }
      if (!text.trim()) {
        const t = await base44.entities.Track.get(track.id).catch(() => null);
        text = t?.lyrics_text || "";
      }
      if (!alive) return;
      setExistingId(mine?.id || null);
      setDraft(text);
      setLoading(false);
    })();
    return () => {
      alive = false;
    };
  }, [track.id, user?.id]);

  useEffect(() => {
    if (step !== "sync") return;
    rowRefs.current[cursor]?.scrollIntoView({ block: "center", behavior: "smooth" });
  }, [cursor, step]);

  const startSync = () => {
    const lines = draft
      .split("\n")
      .map((s) => s.trim())
      .filter(Boolean);
    if (!lines.length) return;
    setRows(lines.map((text) => ({ text, start_ms: null })));
    setCursor(0);
    setStep("sync");
    if (p.currentTrack?.id !== track.id) {
      p.playTrackAt([track]);
    } else if (!p.isPlaying) {
      p.togglePlay?.();
    }
  };

  const mark = () => {
    if (cursor >= rows.length) return;
    const at = Math.round((p.position || 0) * 1000);
    setRows((prev) => prev.map((r, i) => (i === cursor ? { ...r, start_ms: at } : r)));
    setCursor((c) => c + 1);
  };

  const undo = () => {
    if (cursor === 0) return;
    const target = cursor - 1;
    setRows((prev) => prev.map((r, i) => (i === target ? { ...r, start_ms: null } : r)));
    setCursor(target);
  };

  const jumpTo = (i) => {
    const start = rows[i]?.start_ms;
    if (start != null) p.seek?.(start / 1000);
    setCursor(i);
  };

  const save = async () => {
    setSaving(true);
    try {
      const durationMs = Math.round((p.duration || track.duration_seconds || 0) * 1000);
      const lines = rows.map((r, i) => {
        const start = r.start_ms || 0;
        const nextStart = rows[i + 1]?.start_ms;
        // A line runs until the next one starts; the last one holds to the end.
        const end = nextStart ?? (durationMs > start ? durationMs : start + 4000);
        return { text: r.text, start_time_ms: start, end_time_ms: end };
      });
      const payload = {
        track_id: track.id,
        uploader_id: user.id,
        language_code: "en",
        lines,
        status: "approved",
        out_of_sync: false,
      };
      const saved = existingId
        ? await base44.entities.Lyrics.update(existingId, payload)
        : await base44.entities.Lyrics.create(payload);
      toast({ title: "Synced lyrics saved" });
      onSaved?.(saved);
    } catch {
      toast({ title: "Couldn't save synced lyrics", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const marked = rows.filter((r) => r.start_ms != null).length;

  return (
    <div
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end md:items-center justify-center"
      onClick={onClose}
    >
      <div
        className="bg-background w-full md:max-w-lg rounded-t-3xl md:rounded-3xl border border-border shadow-2xl flex flex-col max-h-[92vh]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-4 border-b border-border shrink-0">
          <h3 className="font-bold flex items-center gap-2">
            <Timer size={16} /> Sync lyrics
          </h3>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-foreground/5" aria-label="Close">
            <X size={18} />
          </button>
        </div>

        {loading ? (
          <div className="py-16 grid place-items-center text-foreground/60">
            <Loader2 className="animate-spin" size={22} />
          </div>
        ) : step === "edit" ? (
          <>
            <div className="p-4 flex-1 overflow-y-auto">
              <p className="text-xs text-foreground/50 mb-2 px-1">
                One line per row. Next you'll play the track and tap through the lines to time them.
              </p>
              <textarea
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                className="selectable-content w-full min-h-[280px] text-sm leading-relaxed bg-foreground/[0.03] border border-border rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-foreground/10 resize-none"
                placeholder="Paste or type the lyrics, one line per row…"
              />
            </div>
            <div className="p-4 border-t border-border flex items-center justify-end gap-2 shrink-0">
              <button
                onClick={onClose}
                className="px-4 py-2 rounded-full text-sm font-semibold hover:bg-foreground/5"
              >
                Cancel
              </button>
              <button
                onClick={startSync}
                disabled={!draft.split("\n").some((s) => s.trim())}
                className="px-5 py-2 rounded-full bg-foreground text-background text-sm font-semibold flex items-center gap-2 disabled:opacity-50"
              >
                <Timer size={14} /> Start syncing
              </button>
            </div>
          </>
        ) : (
          <>
            <div className="px-4 py-3 border-b border-border flex items-center gap-3 shrink-0">
              <button
                onClick={() => p.togglePlay?.()}
                className="w-10 h-10 rounded-full bg-foreground text-background grid place-items-center shrink-0"
                aria-label={p.isPlaying ? "Pause" : "Play"}
              >
                {p.isPlaying ? <Pause size={16} /> : <Play size={16} />}
              </button>
              <button
                onClick={() => p.seek?.(0)}
                className="w-10 h-10 rounded-full border border-border grid place-items-center shrink-0"
                aria-label="Back to start"
              >
                <RotateCcw size={15} />
              </button>
              <div className="min-w-0 ml-auto text-right">
                <div className="text-sm font-bold tabular-nums">{formatTime(p.position || 0)}</div>
                <div className="text-[11px] text-foreground/55">
                  {marked} / {rows.length} lines timed
                </div>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto px-4 py-3">
              {rows.map((r, i) => {
                const isNext = i === cursor;
                const done = r.start_ms != null;
                return (
                  <button
                    key={i}
                    ref={(el) => (rowRefs.current[i] = el)}
                    onClick={() => jumpTo(i)}
                    className={`w-full flex items-start gap-3 text-left rounded-xl px-3 py-2 mb-1.5 transition ${
                      isNext ? "bg-accent" : done ? "text-foreground" : "text-foreground/60"
                    }`}
                  >
                    <span
                      className={`text-[11px] font-bold tabular-nums pt-0.5 shrink-0 w-10 ${
                        done ? "text-foreground" : "text-foreground/40"
                      }`}
                    >
                      {done ? formatTime(r.start_ms / 1000) : "—"}
                    </span>
                    <span className={`text-sm ${isNext ? "font-bold" : ""}`}>{r.text}</span>
                  </button>
                );
              })}
              <div className="h-2" />
            </div>

            <div className="p-4 border-t border-border space-y-2 shrink-0">
              <div className="flex items-center gap-2">
                <button
                  onClick={undo}
                  disabled={cursor === 0}
                  className="px-3 py-2 rounded-full text-xs font-semibold hover:bg-foreground/5 inline-flex items-center gap-1.5 disabled:opacity-40"
                >
                  <Undo2 size={13} /> Undo
                </button>
                <button
                  onClick={() => setStep("edit")}
                  className="px-3 py-2 rounded-full text-xs font-semibold hover:bg-foreground/5"
                >
                  Edit text
                </button>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={mark}
                  disabled={cursor >= rows.length}
                  className="flex-1 h-11 rounded-full bg-foreground text-background text-sm font-semibold disabled:opacity-50"
                >
                  {cursor >= rows.length ? "All lines timed" : `Mark line ${cursor + 1}`}
                </button>
                <button
                  onClick={save}
                  disabled={saving || marked === 0}
                  className="h-11 px-5 rounded-full border border-border text-sm font-semibold inline-flex items-center gap-2 disabled:opacity-50"
                >
                  {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />} Save
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}