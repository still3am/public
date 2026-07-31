import { useRef } from "react";
import { Loader2, ImagePlus } from "lucide-react";

export default function CoverPicker({ previewUrl, onPick, disabled, loading }) {
  const inputRef = useRef(null);

  return (
    <div className="shrink-0">
      <button
        type="button"
        onClick={() => !disabled && inputRef.current?.click()}
        disabled={disabled}
        className="group relative w-20 h-20 md:w-24 md:h-24 rounded-xl overflow-hidden bg-foreground/[0.06] grid place-items-center ring-1 ring-inset ring-border disabled:opacity-70"
        aria-label="Change cover image"
      >
        {previewUrl ? (
          <img src={previewUrl} alt="" className="w-full h-full object-cover" />
        ) : loading ? (
          <Loader2 size={18} className="animate-spin text-foreground/25" />
        ) : (
          <span className="flex flex-col items-center gap-1 text-foreground/40">
            <ImagePlus size={20} />
            <span className="text-[9px] font-bold uppercase tracking-wide">Add</span>
          </span>
        )}
        {!disabled && previewUrl && (
          <span className="absolute inset-0 grid place-items-center gap-1 bg-black/55 text-white text-[10px] font-bold opacity-0 group-hover:opacity-100 transition">
            <ImagePlus size={16} />
            Change
          </span>
        )}
      </button>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) onPick(file);
          e.target.value = "";
        }}
      />
    </div>
  );
}