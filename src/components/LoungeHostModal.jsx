import { useEffect, useState } from "react";
import { usePlayer } from "@/context/PlayerContext";
import { useAuth } from "@/lib/AuthContext";
import Avatar from "@/components/Avatar";
import { useCoverUrl } from "@/hooks/useCoverUrl";
import { useColorPalette } from "@/hooks/useColorPalette";
import { copyText, shareLink } from "@/lib/shareLink";
import { Users, Check, X, Loader2, Power, Copy, Share2, ScanLine, Pencil, Music2, RefreshCw } from "lucide-react";
import MotionGradient from "@/components/MotionGradient";
import "./profile-qr.css";
import "./connect-qr.css";
import { loungeUrl, qrImageUrl } from "@/lib/lounge";
import QRScannerModal from "@/components/QRScannerModal";
import { useToast } from "@/components/ui/use-toast";

/** @param {any} props */
export default function LoungeHostModal({ lounge, onClose }) {
  const { session, members, loading, error, ensureSession, approve, approveAll, updateApprovalMode, reject, endSession, updateName } = lounge;
  const { toast } = useToast();
  const { user } = useAuth();
  const p = usePlayer();
  const songArt = useCoverUrl(p.currentTrack?.cover_art_url);
  const songColors = useColorPalette(songArt, true, 5);
  const [copied, setCopied] = useState(false);
  const [qrFailed, setQrFailed] = useState(false);
  const [qrAttempt, setQrAttempt] = useState(0);
  const [scanning, setScanning] = useState(false);
  const [editingName, setEditingName] = useState(false);
  const [nameDraft, setNameDraft] = useState("");
  const [savingName, setSavingName] = useState(false);
  const [ending, setEnding] = useState(false);
  const [approvalBusy, setApprovalBusy] = useState(false);

  useEffect(() => {
    ensureSession();
  }, [ensureSession]);

  useEffect(() => {
    if (session?.id) setNameDraft(session.name || cacheName(session));
  }, [session?.id, session?.name, session?.host_name]);

  function cacheName(s) {
    return s && s.host_name ? `${s.host_name}'s Connect` : "Connect";
  }

  const url = session?.code ? loungeUrl(session.code) : "";
  useEffect(() => {setQrFailed(false);}, [url]);

  async function saveName() {
    if (!updateName || savingName || !nameDraft.trim()) return;
    setSavingName(true);
    const ok = await updateName(nameDraft.trim());
    setSavingName(false);
    if (ok) {
      setEditingName(false);
      toast({ title: "Connect name updated" });
    } else {
      toast({ title: "Couldn't update name", variant: "destructive" });
    }
  }

  if (loading && !session) {
    return (
      <div role="dialog" aria-modal="true" aria-label="Connect" data-public-dialog tabIndex={-1} onKeyDown={(e) => {if (e.key === "Escape") {e.stopPropagation();onClose?.();}}} className="fixed inset-0 z-[110] bg-black/70 backdrop-blur-sm grid place-items-center p-4" onClick={onClose}>
        <div className="bg-card rounded-3xl w-full max-w-sm p-8 text-center" onClick={(e) => e.stopPropagation()}>
          <Loader2 className="animate-spin mx-auto mb-3" />
          <p className="text-sm text-foreground/60">Starting Connect…</p>
        </div>
      </div>);

  }

  if (!session) {
    return (
      <div role="dialog" aria-modal="true" aria-label="Start Connect" data-public-dialog tabIndex={-1} onKeyDown={(event) => {if (event.key === "Escape") {event.stopPropagation();onClose();}}} className="fixed inset-0 z-[110] bg-black/70 backdrop-blur-sm grid place-items-center p-4" onClick={onClose}>
        <div className="bg-card rounded-3xl w-full max-w-sm p-8 text-center" onClick={(e) => e.stopPropagation()}>
          <Users size={28} className="mx-auto mb-4 text-foreground/60" />
          <h2 className="text-xl font-semibold mb-2">Connect</h2>
          <p className="text-sm text-foreground/60 mb-5">Share this QR code to invite people into your shared music session.</p>
          {error && <p role="alert" className="text-sm text-destructive mb-5">{error}</p>}
          <div className="flex justify-center gap-2"><button className="chrome-button" disabled={loading} onClick={() => ensureSession()}>{error ? "Try again" : "Start Connect"}</button><button className="playlist-action" onClick={onClose}>Close</button></div>
        </div>
      </div>);

  }

  const pending = members.filter((m) => m.status === "pending" && m.role !== "host");
  const approvedGuests = members.filter((m) => m.status === "approved" && m.role !== "host");

  async function copy() {
    try {
      await copyText(url);
      setCopied(true);setTimeout(() => setCopied(false), 1500);
    } catch {toast({ title: "Couldn’t copy the Connect invite. Please try again.", variant: "destructive" });}
  }

  async function share() {
    try {
      const result = await shareLink({ title: "Join my Connect session on PUBLIC.", text: "Scan in to add music to our shared queue.", url });
      if (result === "copied") {setCopied(true);setTimeout(() => setCopied(false), 1500);}
    } catch {toast({ title: "Couldn’t share the Connect invite. Please try again.", variant: "destructive" });}
  }

  return (
    <div role="dialog" aria-modal="true" aria-label="Connect invite" data-public-dialog tabIndex={-1} onKeyDown={(e) => {if (e.key === "Escape") {e.stopPropagation();onClose?.();}}} className="profile-qr-overlay connect-qr-overlay" onClick={onClose}>
      <MotionGradient colors={songColors} motion="flow" speed={0.72} active={!scanning} className="connect-qr-ambient" />
      <section className="profile-qr-shell connect-qr-shell" onClick={(e) => e.stopPropagation()}>
        <div className="profile-qr-art" aria-hidden="true">
          <MotionGradient colors={songColors} motion="flow" speed={0.72} active={!scanning} className="absolute inset-0" />
          <div className="profile-qr-shade connect-qr-shade" />
        </div>
        <header className="profile-qr-header connect-qr-header">
          <span>Connect</span>
          <button type="button" onClick={onClose} aria-label="Close Connect" className="profile-qr-close"><X size={20} /></button>
        </header>

        <div className="profile-qr-identity connect-qr-identity">
          {songArt ? <img src={songArt} alt="" className="profile-qr-avatar connect-qr-avatar" /> : <div className="profile-qr-avatar connect-qr-avatar connect-qr-placeholder"><Music2 size={25} /></div>}
          <p className="connect-qr-track">
            {p.currentTrack ?
            <>
                <span>Now playing</span>
                {p.currentTrack.title}
                {p.currentTrack.artist ? ` · ${p.currentTrack.artist}` : ""}
              </> :
            "Scan to join and build the shared queue together."}
          </p>
        </div>

        {/* QR */}
        <div className="profile-qr-code connect-qr-code">
          {qrFailed ? <div className="profile-qr-retry"><p>QR code couldn’t load</p><button type="button" onClick={() => {setQrFailed(false);setQrAttempt((value) => value + 1);}}><RefreshCw size={16} />Retry</button></div> : <img key={qrAttempt} src={qrImageUrl(url, 480)} alt="Scan to join this Connect session" width="280" height="280" onError={() => setQrFailed(true)} />}
        </div>
        <p className="profile-qr-caption connect-qr-caption">Scan to join this Connect session<span>Then add songs to the shared queue.</span></p>
        <div className="profile-qr-actions connect-qr-actions">
          <button type="button" className="profile-qr-share" onClick={share}><Share2 size={17} />Share invite</button>
          <button type="button" onClick={copy} aria-label={copied ? "Invite link copied" : "Copy invite link"}>{copied ? <Check size={17} /> : <Copy size={17} />}<span>{copied ? "Copied" : "Copy link"}</span></button>
        </div>

        {/* Pending requests */}
        <section className="connect-approval" aria-label="Connect join approval">
          <div className="connect-approval-heading"><div><strong>Who can join?</strong><span>Choose how guests enter your shared session.</span></div></div>
          <div className="connect-approval-options">
            <button type="button" aria-pressed={(session.join_approval_mode || "manual") === "auto"} disabled={approvalBusy} onClick={async () => {setApprovalBusy(true);const ok=await updateApprovalMode("auto");setApprovalBusy(false);toast(ok?{title:"Anyone with the invite can join"}:{title:"Couldn’t update approval",variant:"destructive"});}}>
              <Check size={15} /><span><b>Approve everyone</b><small>Let invitees join right away</small></span>
            </button>
            <button type="button" aria-pressed={(session.join_approval_mode || "manual") === "manual"} disabled={approvalBusy} onClick={async () => {setApprovalBusy(true);const ok=await updateApprovalMode("manual");setApprovalBusy(false);toast(ok?{title:"Join requests need your approval"}:{title:"Couldn’t update approval",variant:"destructive"});}}>
              <Users size={15} /><span><b>Ask for approval</b><small>Review each join request</small></span>
            </button>
          </div>
        </section>

        {/* Pending requests */}
        <div className="connect-qr-members">
          <div className="flex items-center gap-2 text-[11px] uppercase tracking-wider text-foreground/40 mb-2">
            <Users size={12} /> Join requests {pending.length ? `· ${pending.length}` : ""}
          </div>
          {pending.length === 0 ?
          <p className="text-xs text-white/70 px-1">No one waiting. Share your QR to invite friends.</p> :
          <div className="space-y-2">
              <div className="connect-approve-all-row"><span>{pending.length} waiting for access</span><button type="button" disabled={approvalBusy} onClick={async () => {setApprovalBusy(true);const count=await approveAll();setApprovalBusy(false);toast(count===pending.length?{title:"Approved "+count+" "+(count===1?"person":"people")}:{title:"Some requests couldn’t be approved",variant:"destructive"});}}>Approve all</button></div>
              {pending.map((m) =>
            <div key={m.id} className="connect-qr-member flex items-center gap-2 px-2 py-2 rounded-xl">
                  <div className="w-8 h-8 rounded-full bg-white/15 grid place-items-center text-xs font-bold shrink-0">
                    {(m.name || "?").charAt(0)}
                  </div>
                  <span className="text-sm truncate flex-1">{m.name || "Someone"}</span>
                  <button
                onClick={() => approve(m)}
                className="w-11 h-11 rounded-full bg-foreground text-background grid place-items-center active:scale-90 transition"
                aria-label="Approve">
                
                    <Check size={15} />
                  </button>
                  <button
                onClick={() => reject(m)}
                className="w-11 h-11 rounded-full border border-border grid place-items-center active:scale-90 transition"
                aria-label="Decline">
                
                    <X size={15} />
                  </button>
                </div>
            )}
            </div>
          }
        </div>

        {/* Approved guests */}
        {approvedGuests.length > 0 &&
        <div className="mb-4">
            <div className="text-[11px] uppercase tracking-wider text-white/75 mb-2">In Connect</div>
            <div className="flex flex-wrap gap-2">
              {approvedGuests.map((m) =>
            <span
              key={m.id}
              className="connect-qr-chip">
              
                  {m.name || "Guest"}
                </span>
            )}
            </div>
          </div>
        }

        <button
          onClick={() => setScanning(true)}
          className="profile-qr-scan connect-qr-scan">
          
          <ScanLine size={15} /> Scan to join Connect
        </button>

        <button
          onClick={async () => {
            if (ending) return;
            setEnding(true);
            try {if (await endSession()) onClose();} finally {setEnding(false);}
          }}
          disabled={ending}
          className="connect-qr-end">
          <Power size={15} /> {ending ? "Ending Connect…" : "End Connect"}
        </button>
        {user && <div className="connect-host-identity connect-host-footer"><Avatar user={user} size={42} active={!scanning} /><span>{user.display_name || user.full_name || "Host"}</span></div>}
      </section>
      {scanning && <QRScannerModal onClose={() => setScanning(false)} />}
    </div>);

}