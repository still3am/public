import { useState, useRef, useEffect } from "react";
import {
  Plus,
  ListPlus,
  ListMusic,
  Share2,
  Link2,
  Heart,
  X,
} from "lucide-react";

export default function NowPlayingAddMenu({
  onAddToPlaylist,
  onPlayNext,
  onAddToQueue,
  onShare,
  onOpenQueue,
  onLike,
  liked,
}) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
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
    onAddToPlaylist && {
      icon: ListPlus,
      label: "Add to playlist",
      onClick: (close) => {
        onAddToPlaylist();
        close();
      },
    },
    onPlayNext && {
      icon: ListPlus,
      label: "Play next",
      onClick: (close) => {
        onPlayNext();
        close();
      },
    },
    onAddToQueue && {
      icon: ListMusic,
      label: "Add to queue",
      onClick: (close) => {
        onAddToQueue();
        close();
      },
    },
    onLike && {
      icon: Heart,
      label: liked ? "Unlike" : "Like",
      onClick: (close) => {
        onLike();
        close();
      },
      accent: liked ? "text-red-400" : "",
    },
    {
      icon: Link2,
      label: copied ? "Link copied" : "Copy link",
      onClick: async (close) => {
        await onShare?.(true);
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
        close();
      },
    },
    onShare && {
      icon: Share2,
      label: "Share",
      onClick: (close) => {
        onShare();
        close();
      },
    },
    onOpenQueue && {
      icon: ListMusic,
      label: "View queue",
      onClick: (close) => {
        onOpenQueue();
        close();
      },
    },
  ].filter(Boolean);

  return (
    <div ref={wrapRef} className="relative flex items-center shrink-0">
      {open && (
        <>
          {/* dim backdrop for mobile */}
          <div
            className="md:hidden fixed inset-0 z-40 bg-black/40 backdrop-blur-[2px] animate-[fadeIn_.15s_ease-out]"
            onClick={() => setOpen(false)}
          />
          <div className="absolute right-0 bottom-full mb-2 z-50 flex flex-col gap-1.5 w-52 animate-[fadeIn_.18s_ease-out]">
            {options.map((opt, i) => {
              const Icon = opt.icon;
              return (
                <button
                  key={i}
                  onClick={() => opt.onClick(() => setOpen(false))}
                  style={{ animationDelay: `${i * 30}ms` }}
                  className="flex items-center gap-3 px-4 py-3 rounded-2xl bg-white/10 backdrop-blur-xl border border-white/10 text-sm font-medium text-left active:scale-[0.97] hover:bg-white/20 transition animate-[fadeIn_.2s_ease-out_both]"
                >
                  <Icon size={18} className={opt.accent || ""} />
                  <span className="flex-1">{opt.label}</span>
                </button>
              );
            })}
          </div>
        </>
      )}
      <button
        onClick={() => setOpen((v) => !v)}
        aria-label={open ? "Close menu" : "Open menu"}
        className={`w-10 h-10 rounded-full grid place-items-center active:scale-90 transition shadow-lg ${
          open ? "bg-white/20" : "bg-white text-black"
        }`}
      >
        {open ? <X size={22} /> : <Plus size={24} className={open ? "rotate-45" : ""} />}
      </button>
    </div>
  );
}