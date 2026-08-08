import { useState, useRef, useEffect } from "react";
import {
  Plus,
  Share2,
  X,
  Heart,
  ListMusic,
  Smartphone,
  Download,
  Trash2,
  Loader2,
  SlidersHorizontal,
} from "lucide-react";

export default function NowPlayingAddMenu({
  onShare,
  showPulse,
  onTogglePulse,
  onViewQueue,
  onToggleLibrary,
  onLounge,
  onToggleOffline,
  savedOffline = false,
  savingOffline = false,
  inLibrary = false,
  queueCount = 0,
  onMix,
  mixerActive = false,
}) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false);
    };
    window.addEventListener("mousedown", onDown);
    window.addEventListener("touchstart", onDown);
    return () => {
      window.removeEventListener("mousedown", onDown);
      window.removeEventListener("touchstart", onDown);
    };
  }, [open]);

  const options = [
    onMix && {
      icon: SlidersHorizontal,
      label: "Mix",
      onClick: (close) => {
        onMix();
        close();
      },
      accent: mixerActive ? "text-white" : "",
    },
    onShare && {
      icon: Share2,
      label: "Share",
      onClick: (close) => {
        onShare();
        close();
      },
    },
    onToggleLibrary && !inLibrary && {
      icon: Plus,
      label: "Add to library",
      onClick: (close) => {
        onToggleLibrary();
        close();
      },
    },
    onViewQueue && {
      icon: ListMusic,
      label: "Queue",
      onClick: (close) => {
        onViewQueue();
        close();
      },
    },
    onToggleOffline && {
      icon: savingOffline ? Loader2 : savedOffline ? Trash2 : Download,
      label: savingOffline
        ? "Saving…"
        : savedOffline
        ? "Remove offline"
        : "Save offline",
      onClick: (close) => {
        onToggleOffline();
        close();
      },
    },
    onLounge && {
      icon: Smartphone,
      label: "Lounge",
      onClick: (close) => {
        onLounge();
        close();
      },
    },
    onTogglePulse && {
      icon: Heart,
      label: showPulse ? "Hide color pulse" : "Color pulse",
      onClick: (close) => {
        onTogglePulse();
        close();
      },
      accent: showPulse ? "text-white" : "",
    },
  ].filter(Boolean);

  return (
    <div ref={wrapRef} className="relative flex items-center shrink-0">
      {open && (
        <>
          <div
            className="md:hidden fixed inset-0 z-40"
            onClick={() => setOpen(false)}
          />
          <div className="absolute right-0 top-full mt-2 z-50 w-52 rounded-2xl bg-black/70 backdrop-blur-xl border border-white/10 shadow-2xl py-1.5 animate-[fadeIn_.15s_ease-out]">
            {options.map((opt, i) => {
              const Icon = opt.icon;
              return (
                <button
                  key={i}
                  onClick={() => opt.onClick(() => setOpen(false))}
                  className="w-full flex items-center gap-3 px-3.5 py-2.5 text-sm font-medium text-left hover:bg-white/10 active:scale-[0.98] transition"
                >
                  <Icon size={16} className={opt.accent || "opacity-80"} />
                  <span className="flex-1 truncate">{opt.label}</span>
                </button>
              );
            })}
          </div>
        </>
      )}
      <button
        onClick={() => setOpen((v) => !v)}
        aria-label={open ? "Close menu" : "Open menu"}
        className={`w-9 h-9 rounded-full grid place-items-center active:scale-90 transition ${
          open ? "bg-white/15" : "bg-white/10 hover:bg-white/20"
        }`}
      >
        {open ? <X size={20} /> : <Plus size={20} />}
      </button>
    </div>
  );
}