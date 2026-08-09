import { Link } from "react-router-dom";
import { X, Lightbulb, GitMerge, Palette, Trash2, ChevronRight } from "lucide-react";
import ThemeToggle from "@/components/ThemeToggle";

export default function SettingsSheet({ onClose, onDeleteAccount }) {
  return (
    <div className="fixed inset-0 z-[60] flex items-end md:items-center justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full md:max-w-md bg-card border rounded-t-3xl md:rounded-3xl p-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] max-h-[80vh] overflow-y-auto">
        <div className="md:hidden w-10 h-1 bg-foreground/20 rounded-full mx-auto mb-4" />
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-extrabold tracking-tight">Settings</h2>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-foreground/10" aria-label="Close">
            <X size={18} />
          </button>
        </div>

        <div className="space-y-2">
          <Link
            to="/suggestions"
            onClick={onClose}
            className="flex items-center gap-3 p-3.5 rounded-2xl bg-foreground/[0.02] hover:bg-foreground/[0.05] transition active:scale-[0.99]"
          >
            <div className="w-10 h-10 rounded-xl bg-foreground/[0.06] grid place-items-center shrink-0">
              <Lightbulb size={18} className="text-foreground/70" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-bold">Ideas & Suggestions</div>
              <div className="text-xs text-foreground/50 truncate">Tell us what should come next</div>
            </div>
            <ChevronRight size={16} className="text-foreground/30 shrink-0" />
          </Link>

          <Link
            to="/settings/transitions"
            onClick={onClose}
            className="flex items-center gap-3 p-3.5 rounded-2xl bg-foreground/[0.02] hover:bg-foreground/[0.05] transition active:scale-[0.99]"
          >
            <div className="w-10 h-10 rounded-xl bg-foreground/[0.06] grid place-items-center shrink-0">
              <GitMerge size={18} className="text-foreground/70" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-bold">Song Transitions</div>
              <div className="text-xs text-foreground/50 truncate">Crossfade & AutoMix</div>
            </div>
            <ChevronRight size={16} className="text-foreground/30 shrink-0" />
          </Link>

          <div className="p-3.5 rounded-2xl bg-foreground/[0.02]">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl bg-foreground/[0.06] grid place-items-center shrink-0">
                <Palette size={18} className="text-foreground/70" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-bold">Appearance</div>
                <div className="text-xs text-foreground/50">Dark / light mode</div>
              </div>
            </div>
            <ThemeToggle />
          </div>

          <button
            onClick={() => { onDeleteAccount(); onClose(); }}
            className="w-full flex items-center gap-3 p-3.5 rounded-2xl bg-foreground/[0.02] hover:bg-foreground/[0.05] transition active:scale-[0.99] text-left"
          >
            <div className="w-10 h-10 rounded-xl bg-red-500/10 grid place-items-center shrink-0">
              <Trash2 size={18} className="text-red-600" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-bold text-red-600">Delete Account</div>
              <div className="text-xs text-foreground/50">Permanently remove your data</div>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
}