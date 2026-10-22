import GlassSettingsBackdrop from "@/components/GlassSettingsBackdrop";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Link } from "react-router-dom";
import PureControls from "@/components/PureControls";
import { usePlayer } from "@/context/PlayerContext";
import { ArrowLeft, AudioLines, Play, Pause, X, Lightbulb, GitMerge, Trash2, ChevronRight, Sparkles, BarChart3, Loader2, LogOut, Sun, Moon, Shield, Headphones, FileText } from "lucide-react";
import { reportActionError } from "@/lib/actionError";
import { useTheme } from "@/lib/useTheme";
import { useAuth } from "@/lib/AuthContext";
import { clearPersonalData } from "@/lib/clearPersonalData";
import { useSafety } from "@/context/SafetyContext";
import { onboardingComplete } from "@/lib/onboardingModel";
import { base44 } from "@/api/base44Client";

/** @param {any} props */
function SettingRow({ icon: Icon, title, description, children, to, onClick, danger = false, disabled = false }) {
  const content = <><span className={"w-9 h-9 rounded-xl grid place-items-center shrink-0 " + (danger ? "bg-red-500/10 text-red-500" : "bg-foreground/[0.06] text-foreground/75")}><Icon size={18} /></span><span className="min-w-0 flex-1"><span className={"block text-sm font-semibold leading-snug " + (danger ? "text-red-500" : "")}>{title}</span>{description && <span className="block text-xs text-muted-foreground leading-relaxed mt-0.5">{description}</span>}</span>{children || <ChevronRight size={16} className="shrink-0 text-muted-foreground/60" />}</>;
  const cls = "w-full min-h-[64px] flex items-center gap-3 px-4 py-3 text-left";
  return to ? <Link to={to} onClick={onClick} className={cls + " hover:bg-foreground/[0.04] transition-colors"}>{content}</Link> : onClick ? <button type="button" disabled={disabled} onClick={onClick} className={cls + " hover:bg-foreground/[0.04] transition-colors disabled:opacity-50"}>{content}</button> : <div className={cls}>{content}</div>;
}
/** @param {any} props */
function SettingSwitch({ checked, onChange, busy, label }) {
  return <button type="button" role="switch" aria-label={label} aria-checked={checked} aria-busy={busy} disabled={busy} onClick={() => onChange(!checked)} className="w-14 h-11 shrink-0 grid place-items-center focus-visible:ring-2 focus-visible:ring-ring rounded-xl disabled:opacity-50">
  <span className={"relative w-12 h-7 rounded-full transition-colors " + (checked ? "bg-foreground" : "bg-foreground/20")}><span className={"absolute top-1 left-1 w-5 h-5 rounded-full shadow-sm transition-transform " + (checked ? "translate-x-5 bg-background" : "translate-x-0 bg-background")}>{busy && <Loader2 size={12} className="absolute inset-1 animate-spin text-foreground" />}</span></span>
 </button>;
}
/** @param {any} props */
function SettingGroup({ title, children }) {
  return <section className="space-y-2"><h3 className="px-2 text-[11px] font-semibold uppercase tracking-[.12em] text-muted-foreground">{title}</h3><div className="rounded-2xl border border-border/70 bg-card overflow-hidden divide-y divide-border/60">{children}</div></section>;
}
/** @param {any} props */
export default function SettingsSheet({ onClose, onDeleteAccount }) {
  const player = usePlayer();
  const [pureOpen, setPureOpen] = useState(false);
  const safety = useSafety(),{ user, checkUserAuth } = useAuth(),theme = useTheme();
  const [artist, setArtist] = useState(!!user?.is_artist);
  const [glass,setGlass] = useState(user?.liquid_glass_enabled===true);
  const [saving, setSaving] = useState(""),[unblocking, setUnblocking] = useState(""),[loggingOut, setLoggingOut] = useState(false);
  const lock = useRef(false),logoutLock = useRef(false),blockedLock = useRef(false);
  useEffect(() => {const previous = document.body.style.overflow;document.body.style.overflow = "hidden";return () => {document.body.style.overflow = previous;};}, []);
  useEffect(() => {setArtist(!!user?.is_artist);setGlass(user?.liquid_glass_enabled===true);}, [user?.id, user?.is_artist,user?.liquid_glass_enabled]);
  async function preference(key, value) {
    if (!user?.id || lock.current || logoutLock.current) return;
    lock.current = true;setSaving(key);
    const before = key==="liquid_glass_enabled"?glass:artist,set = key==="liquid_glass_enabled"?setGlass:setArtist;
    try {
      const saved = await base44.auth.updateMe({ [key]: value });
      if (saved?.id !== user.id || saved[key] !== value) throw new Error("This setting was not confirmed. Please retry.");
      set(value);
      await checkUserAuth({ silent: true });

    } catch (error) {set(before);reportActionError(error, "Couldn’t save this setting. Please try again.");} finally
    {lock.current = false;setSaving("");}
  }
  async function logout() {
    if (logoutLock.current || lock.current || blockedLock.current) return;
    logoutLock.current = true;setLoggingOut(true);
    try {await clearPersonalData().catch(() => {});await base44.auth.logout(window.location.origin + "/");}
    catch (error) {logoutLock.current = false;setLoggingOut(false);reportActionError(error, "Couldn’t sign out. Please try again.");}
  }
  async function unblock(row) {
    if (blockedLock.current || logoutLock.current) return;
    blockedLock.current = true;setUnblocking(row.id);
    try {await base44.functions.invoke("safety", { action: "block", user_id: row.blocked_user_id, blocked: false });await safety.reload();window.dispatchEvent(new Event("catalog:invalidate"));}
    catch (error) {reportActionError(error, "Couldn’t unblock this account.");} finally
    {blockedLock.current = false;setUnblocking("");}
  }
  const dialog = <div role="dialog" aria-modal="true" aria-label={pureOpen ? "PURE settings" : "Settings"} data-public-dialog tabIndex={-1} onKeyDown={(e) => {if (e.key === "Escape") {e.stopPropagation();if (pureOpen) setPureOpen(false);else onClose();}}} className="profile-settings-dialog fixed inset-0 z-[80] flex items-end md:items-center justify-center md:p-5">
  <div className="absolute inset-0 bg-black/55 backdrop-blur-md" onClick={onClose} />
  <div className="profile-settings-panel relative w-full md:max-w-lg max-h-[92dvh] md:max-h-[86dvh] flex flex-col bg-background text-foreground border border-border/70 rounded-t-[28px] md:rounded-[28px] shadow-2xl overflow-hidden animate-in slide-in-from-bottom-4 duration-200">
   {glass && <GlassSettingsBackdrop dark={theme.isDark}/>}
   <header className="shrink-0 px-5 pt-3 pb-4 border-b border-border/60 bg-background">
    <div aria-hidden="true" className="md:hidden mx-auto w-9 h-1 rounded-full bg-foreground/20 mb-3" />
    <div className="flex justify-between items-center gap-3"><div className="flex items-center gap-3">{pureOpen && <button type="button" aria-label="Back to settings" onClick={() => {setPureOpen(false);}} className="w-11 h-11 rounded-full bg-foreground/[0.06] grid place-items-center shrink-0"><ArrowLeft size={19} /></button>}<div><h2 className="text-2xl font-bold tracking-tight">{pureOpen ? "PURE" : "Settings"}</h2><p className="text-xs text-muted-foreground mt-1 hidden">{pureOpen ? "Your sound, fine-tuned." : "Make PUBLIC feel right for you."}</p></div></div><button type="button" onClick={onClose} className="w-11 h-11 rounded-full bg-foreground/[0.06] grid place-items-center hover:bg-foreground/10 shrink-0" aria-label="Close settings"><X size={20} /></button></div>
   </header>
   <div className={"profile-settings-groups " + (pureOpen ? "settings-detail " : "") + "min-h-0 overflow-y-auto overscroll-contain px-4 md:px-5 pt-5 pb-[calc(1.5rem+env(safe-area-inset-bottom))] space-y-6"}>
    {pureOpen ? <div className="space-y-5">
     {player.currentTrack ? <section aria-label="Listening preview" className="flex items-center gap-3 rounded-2xl border bg-card p-4"><span className="w-10 h-10 rounded-xl bg-foreground/5 grid place-items-center shrink-0"><AudioLines size={20} /></span><div className="flex-1 min-w-0"><p className="text-[9px] font-semibold tracking-[.14em] text-muted-foreground mb-1">LISTENING PREVIEW</p><p className="text-sm font-semibold truncate">{player.currentTrack.title}</p><p className="text-xs text-muted-foreground truncate mt-0.5">{player.currentTrack.artist || player.currentTrack.uploader_name}</p></div><button type="button" onClick={() => player.togglePlay()} aria-label={player.isPlaying ? "Pause preview" : "Play preview"} className="w-11 h-11 rounded-full bg-foreground text-background grid place-items-center shrink-0">{player.isPlaying ? <Pause size={18} /> : <Play size={18} className="ml-0.5" />}</button></section> : <p className="text-xs text-muted-foreground leading-relaxed px-1">Start a song and return here to hear your adjustments as you make them.</p>}
     <PureControls />
     <p className="text-[11px] text-muted-foreground leading-relaxed px-1">PURE applies to music playing on this device, including songs saved for offline listening.</p>
    </div> : <>
    <SettingGroup title="Listening & appearance">
     {user && !onboardingComplete(user) && <SettingRow icon={Sparkles} title="Finish setting up PUBLIC" description="Your taste, people and profile colors" onClick={() => {onClose();window.dispatchEvent(new Event("onboarding:open"));}} />}
     <SettingRow icon={AudioLines} title="PURE" description="Clarity, body and balanced sound" onClick={() => setPureOpen(true)}>{player.pure?.enabled && !player.pureSuspended && <span className="w-1.5 h-1.5 rounded-full bg-foreground/60" aria-label="PURE enabled" />}<ChevronRight size={16} className="text-muted-foreground/60 shrink-0" /></SettingRow>
     <SettingRow icon={GitMerge} title="Song transitions" description="Crossfade and gapless playback" to="/settings/transitions" onClick={onClose} />
     <SettingRow icon={Sparkles} title="Liquid Glass" description="Translucent panels, soft edges and profile colors"><SettingSwitch label="Liquid Glass" checked={glass} busy={!!saving || loggingOut} onChange={value=>preference("liquid_glass_enabled",value)}/></SettingRow>
     <SettingRow icon={theme.isDark ? Moon : Sun} title="Dark appearance" description={theme.isDark ? "Dark backgrounds, softer light" : "Light backgrounds, clear contrast"}><SettingSwitch label="Dark appearance" checked={theme.isDark} onChange={theme.toggle} /></SettingRow>
    </SettingGroup>
    {user?.role !== "admin" && <SettingGroup title="Creator">
     <SettingRow icon={Sparkles} title="Artist Mode" description="Artist badge and listening insights"><SettingSwitch label="Artist Mode" checked={artist} busy={!!saving || loggingOut} onChange={(v) => preference("is_artist", v)} /></SettingRow>
     {artist && <SettingRow icon={BarChart3} title="Artist dashboard" description="Plays, likes and followers" to="/artist-dashboard" onClick={onClose} />}
    </SettingGroup>}
    <SettingGroup title="Help & privacy">
     <SettingRow icon={Headphones} title="Support & copyright" description="Get help or send a copyright request" to="/support" onClick={onClose} />
     <SettingRow icon={Lightbulb} title="Ideas & suggestions" to="/suggestions" onClick={onClose} />
     <SettingRow icon={Shield} title="Privacy" to="/privacy" onClick={onClose} />
     <SettingRow icon={FileText} title="Terms & community" to="/terms" onClick={onClose} />
    </SettingGroup>
    {safety.own.length > 0 && <SettingGroup title="Blocked accounts">{safety.own.map((row, i) => <SettingRow key={row.id} icon={Shield} title={"Blocked account " + (i + 1)} description="This account can’t interact with you."><button type="button" disabled={!!unblocking || loggingOut} className="min-h-11 px-3 rounded-full border text-xs font-semibold disabled:opacity-50 shrink-0" onClick={() => unblock(row)}>{unblocking === row.id ? "Unblocking…" : "Unblock"}</button></SettingRow>)}</SettingGroup>}
    <SettingGroup title="Account">
     <SettingRow icon={loggingOut ? Loader2 : LogOut} title={loggingOut ? "Signing out…" : "Log out"} description="Sign out on this device" disabled={loggingOut || !!saving || !!unblocking} onClick={logout} />
     <SettingRow icon={Trash2} title="Delete account" description="Permanently remove your profile and uploads" danger disabled={loggingOut || !!saving || !!unblocking} onClick={() => {onClose();onDeleteAccount();}} />
    </SettingGroup>
    <p className="text-center text-[11px] tracking-[.18em] text-muted-foreground/60 font-semibold hidden">PUBLIC.</p>
    </>}
   </div>
  </div>
 </div>;
  return typeof document !== "undefined" ? createPortal(dialog, document.body) : dialog;
}