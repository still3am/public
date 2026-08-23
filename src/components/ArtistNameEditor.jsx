import { useState } from "react";
import { Pencil, Check, X, Loader2 } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { useToast } from "@/components/ui/use-toast";

export default function ArtistNameEditor({ artist, canEdit, onSaved }) {
  const { toast } = useToast();
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(artist.name || "");
  const [saving, setSaving] = useState(false);

  const save = async () => {
    const name = value.trim();
    if (!name || name === artist.name) {
      setEditing(false);
      return;
    }
    setSaving(true);
    try {
      await base44.entities.Artist.update(artist.id, { name });
      onSaved?.(name);
      setEditing(false);
      toast({ title: "Artist name updated" });
    } catch {
      toast({ title: "Couldn't update name", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  if (editing) {
    return (
      <div className="flex items-center justify-center gap-2">
        <input
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") save();
            if (e.key === "Escape") setEditing(false);
          }}
          autoFocus
          className="bg-transparent border-b-2 border-foreground/20 focus:border-foreground/60 outline-none text-3xl md:text-5xl font-extrabold tracking-tighter text-center min-w-0 w-full max-w-[80%]" />
        
        <button
          onClick={save}
          disabled={saving}
          className="w-9 h-9 rounded-full bg-foreground text-background grid place-items-center shrink-0 active:scale-95"
          aria-label="Save name">
          
          {saving ? <Loader2 size={15} className="animate-spin" /> : <Check size={15} />}
        </button>
        <button
          onClick={() => {
            setValue(artist.name || "");
            setEditing(false);
          }}
          className="w-9 h-9 rounded-full bg-foreground/[0.06] grid place-items-center shrink-0 active:scale-95"
          aria-label="Cancel">
          
          <X size={15} />
        </button>
      </div>);

  }

  return (
    <div className="flex items-center justify-center gap-2">
      <h1 className="text-3xl md:text-5xl font-extrabold tracking-tighter leading-[1.02] break-words">
        {artist.name}
      </h1>
      {canEdit &&
      <button
        onClick={() => {
          setValue(artist.name || "");
          setEditing(true);
        }}
        className="w-8 h-8 rounded-full bg-foreground/[0.06] hover:bg-foreground/[0.1] grid place-items-center shrink-0 text-foreground/60 active:scale-95 transition hidden"
        aria-label="Edit artist name">
        
          <Pencil size={14} />
        </button>
      }
    </div>);

}