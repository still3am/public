import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Music, Pencil, X, Check, Loader2 } from "lucide-react";
import { GENRES } from "@/lib/audio-utils";
import { saveUserGenres, clearUserGenresCache } from "@/lib/userGenres";

export default function GenreTags() {
  const [genres, setGenres] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(new Set());
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    base44.entities.UserGenre.
    filter({}, "-created_date", 1).
    then((records) => {
      const g = Array.isArray(records) && records[0]?.genres ? records[0].genres : [];
      setGenres(g);
    }).
    catch(() => setGenres([])).
    finally(() => setLoading(false));
  }, []);

  function startEdit() {
    setDraft(new Set(genres));
    setEditing(true);
  }

  function toggle(g) {
    setDraft((prev) => {
      const next = new Set(prev);
      if (next.has(g)) next.delete(g);else
      next.add(g);
      return next;
    });
  }

  async function save() {
    if (saving) return;
    setSaving(true);
    try {
      const arr = [...draft];
      await saveUserGenres(arr);
      clearUserGenresCache();
      setGenres(arr);
      setEditing(false);
    } catch {
      alert("Couldn't save your taste. Try again.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) return null;

  if (editing) {
    return (
      <div className="mb-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-extrabold tracking-tight flex items-center gap-2">
            <Music size={18} /> Edit My Taste
          </h2>
          <div className="flex items-center gap-2">
            <button
              onClick={save}
              disabled={saving}
              className="w-9 h-9 rounded-full bg-foreground text-background grid place-items-center disabled:opacity-40"
              aria-label="Save">
              
              {saving ? <Loader2 size={15} className="animate-spin" /> : <Check size={15} />}
            </button>
            <button
              onClick={() => setEditing(false)}
              className="w-9 h-9 rounded-full border border-border grid place-items-center"
              aria-label="Cancel">
              
              <X size={15} />
            </button>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {GENRES.map((g) => {
            const active = draft.has(g);
            return (
              <button
                key={g}
                onClick={() => toggle(g)}
                className={`chip ${active ? "active" : ""}`}>
                
                {active && <Check size={11} />} {g}
              </button>);

          })}
        </div>
      </div>);

  }

  if (!genres.length) return null;

  return (
    <div className="mb-6 hidden">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-lg font-extrabold tracking-tight flex items-center gap-2">
           My Taste
        </h2>
        <button
          onClick={startEdit}
          className="w-9 h-9 rounded-full border border-border grid place-items-center hover:bg-foreground/[0.04] transition"
          aria-label="Edit taste">
          
          <Pencil size={15} />
        </button>
      </div>
      <div className="flex flex-wrap gap-2">
        {genres.map((g) =>
        <Link key={g} to={`/search?genre=${encodeURIComponent(g)}`} className="chip active">
            {g}
          </Link>
        )}
      </div>
    </div>);

}