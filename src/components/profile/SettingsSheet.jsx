import { useState } from "react";
import { Link } from "react-router-dom";
import { X, Lightbulb, GitMerge, Palette, Trash2, ChevronRight, Sparkles, BarChart3, Loader2 } from "lucide-react";
import ThemeToggle from "@/components/ThemeToggle";
import { Switch } from "@/components/ui/switch";
import { useAuth } from "@/lib/AuthContext";
import { base44 } from "@/api/base44Client";

export default function SettingsSheet({ onClose, onDeleteAccount }) {
  const { user, checkUserAuth } = useAuth();
  const [toggling, setToggling] = useState(false);
  const isArtist = user?.is_artist === true;

  async function toggleArtist(checked) {
    setToggling(true);
    try {
      await base44.auth.updateMe({ is_artist: checked });
      await checkUserAuth();
    } catch {
    } finally {
      setToggling(false);
    }
  }

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
          {/* Artist Mode */}
          <div className="p-3.5 rounded-2xl bg-foreground/[0.02]">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-foreground/[0.06] grid place-items-center shrink-0">
                {toggling ? <Loader2 size={18} className="animate-spin text-foreground/70" /> : <Sparkles size={18} className="text-foreground/70" />}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-bold">Artist Mode</div>
                <div className="text-xs text-foreground/50">Show an artist badge and unlock analytics tools</div>
              </div>
              <Switch
                checked={isArtist}
                onCheckedChange={toggleArtist}
                disabled={toggling}
              />
            </div>
            {isArtist && (
              <Link
                to="/artist-dashboard"
                onClick={onClose}
                className="mt-3 flex items-center gap-3 p-3 rounded-xl bg-foreground/[0.04] hover:bg-foreground/[0.07] transition active:scale-[0.99]"
              >
                <div className="w-9 h-9 rounded-lg bg-foreground/[0.06] grid place-items-center shrink-0">
                  <BarChart3 size={16} className="text-foreground/70" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-bold">Artist Dashboard</div>
                  <div className="text-xs text-foreground/50 truncate">Plays, likes, followers & more</div>
                </div>
                <ChevronRight size={16} className="text-foreground/30 shrink-0" />
              </Link>
            )}
          </div>

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
            <div className="w-10 h-10 rounded-xl bg-destructive/10 grid place-items-center shrink-0">
              <Trash2 size={18} className="text-destructive" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-bold text-destructive">Delete Account</div>
              <div className="text-xs text-foreground/50">Permanently remove your data</div>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
}