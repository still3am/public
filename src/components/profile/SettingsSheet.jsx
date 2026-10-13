import {LANGUAGES,useLanguage} from "@/lib/i18n/LanguageContext";
import { useState } from "react";
import { Link } from "react-router-dom";
import { Languages, X, Lightbulb, GitMerge, Palette, Trash2, ChevronRight, Sparkles, BarChart3, Loader2, LogOut } from "lucide-react";
import ThemeToggle from "@/components/ThemeToggle";
import { Switch } from "@/components/ui/switch";
import { useAuth } from "@/lib/AuthContext";
import {clearPersonalData} from '@/lib/clearPersonalData';
import {useSafety} from '@/context/SafetyContext';
import { base44 } from "@/api/base44Client";

/** @param {any} props */
export default function SettingsSheet({ onClose, onDeleteAccount }) {
  const safety=useSafety();
  const {language,setLanguage}=useLanguage();
  const { user, checkUserAuth } = useAuth();
  const [toggling, setToggling] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const isArtist = user?.is_artist === true;

  // Full sign-out: the SDK clears the stored token, then the app reloads on the
  // public landing screen so no signed-in state survives on this device.
  async function handleLogout() {
    setLoggingOut(true);
    try {
      await clearPersonalData();
      await base44.auth.logout(`${window.location.origin}/`);
    } catch {
      window.alert("Sign-out could not complete. Please retry.");
      setLoggingOut(false);
    }
  }

  async function toggleArtist(checked) {
    setToggling(true);
    try {
      await base44.auth.updateMe({ is_artist: checked });
      await checkUserAuth();
    } catch {window.alert("Artist Mode could not save. Please retry.");
    } finally {
      setToggling(false);
    }
  }

  return (
    <div role="dialog" aria-modal="true" aria-label="Settings" data-public-dialog tabIndex={-1} onKeyDown={e=>e.key==="Escape"&&onClose()} className="fixed inset-0 z-[60] flex items-end md:items-center justify-center">
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
          <div className="p-3.5 rounded-2xl border border-border">
            <label htmlFor="public-language" className="flex items-center gap-3 text-sm font-bold mb-2"><Languages size={18}/> Language</label>
            <p className="text-xs text-muted-foreground mb-3">Choose the language for PUBLIC.</p>
            <select id="public-language" value={language} onChange={e=>setLanguage(e.target.value)} className="w-full min-h-11 px-3 rounded-xl border border-border bg-background text-sm">{LANGUAGES.map(l=><option key={l.code} value={l.code} lang={l.code}>{l.name}</option>)}</select>
          </div>
          <Link to="/support" onClick={onClose} className="block p-3 rounded-xl border">Support & copyright requests</Link>
          <div className="flex gap-4 text-sm p-3"><Link to="/privacy" onClick={onClose} className="underline">Privacy</Link><Link to="/terms" onClick={onClose} className="underline">Terms & community</Link></div>
          <label className="flex items-center gap-3 p-3 rounded-xl border text-sm"><input type="checkbox" checked={!!user?.show_explicit} onChange={async e=>{const enabled=e.target.checked;if(enabled&&!window.confirm('I confirm I am at least 18 and want to see explicit music.'))return;try{await base44.auth.updateMe({show_explicit:enabled,adult_confirmed:enabled||!!user?.adult_confirmed});await checkUserAuth();window.dispatchEvent(new Event('catalog:invalidate'));}catch{window.alert('Could not save your content preference.');}}}/>Show explicit music (18+)</label>
          {safety.own.length>0&&<div className="p-3 border rounded-xl"><h3 className="font-bold text-sm mb-2">Blocked users</h3>{safety.own.map(r=><button key={r.id} className="block text-xs underline p-2" onClick={async()=>{await base44.functions.invoke('safety',{action:'block',user_id:r.blocked_user_id,blocked:false});await safety.reload();window.dispatchEvent(new Event('catalog:invalidate'));}}>Unblock {r.blocked_user_id}</button>)}</div>}
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

          <button
            onClick={handleLogout}
            disabled={loggingOut}
            className="w-full flex items-center gap-3 p-3.5 rounded-2xl bg-overlay text-overlay-foreground ring-1 ring-inset ring-overlay-foreground/15 hover:opacity-90 transition active:scale-[0.99] text-left disabled:opacity-60"
          >
            <div className="w-10 h-10 rounded-xl bg-overlay-foreground/15 grid place-items-center shrink-0">
              {loggingOut ? <Loader2 size={18} className="animate-spin" /> : <LogOut size={18} />}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-bold">Log Out</div>
              <div className="text-xs text-overlay-foreground/70">Sign out of PUBLIC on this device</div>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
}