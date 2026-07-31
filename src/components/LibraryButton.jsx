import { useState } from "react";
import { Plus, Check, Loader2 } from "lucide-react";
import { useLibrary } from "@/context/LibraryContext";

export default function LibraryButton({
  track,
  className = "",
  size = 16,
  label = false,
}) {
  const { isInLibrary, toggle } = useLibrary();
  const [busy, setBusy] = useState(false);
  const inLib = isInLibrary(track.id);

  return (
    <button
      type="button"
      disabled={busy}
      onClick={async (e) => {
        e.stopPropagation();
        e.preventDefault();
        setBusy(true);
        try {
          await toggle(track);
        } finally {
          setBusy(false);
        }
      }}
      className={className}
      aria-label={inLib ? "Remove from library" : "Add to library"}
      title={inLib ? "In your library" : "Add to library"}
    >
      {busy ? (
        <Loader2 size={size} className="animate-spin" />
      ) : inLib ? (
        <Check size={size} />
      ) : (
        <Plus size={size} />
      )}
      {label && (
        <span className="truncate">
          {inLib ? "In library" : "Add to library"}
        </span>
      )}
    </button>
  );
}