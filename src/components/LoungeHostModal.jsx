import { useEffect, useState } from "react";
import { Users, Check, X, Loader2, Speaker, Power, Copy, ScanLine } from "lucide-react";
import { loungeUrl, qrImageUrl } from "@/lib/lounge";
import QRScannerModal from "@/components/QRScannerModal";

export default function LoungeHostModal({ lounge, onClose }) {
  const { session, members, loading, ensureSession, approve, reject, endSession } = lounge;
  const [copied, setCopied] = useState(false);
  const [scanning, setScanning] = useState(false);

  useEffect(() => {
    ensureSession();
  }, [ensureSession]);

  if (loading && !session) {
    return (
      <div className="fixed inset-0 z-[60] bg-black/70 backdrop-blur-sm grid place-items-center p-4" onClick={onClose}>
        <div className="bg-card rounded-3xl w-full max-w-sm p-8 text-center" onClick={(e) => e.stopPropagation()}>
          <Loader2 className="animate-spin mx-auto mb-3" />
          <p className="text-sm text-foreground/60">Starting your lounge…</p>
        </div>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="fixed inset-0 z-[60] bg-black/70 backdrop-blur-sm grid place-items-center p-4" onClick={onClose}>
        <div className="bg-card rounded-3xl w-full max-w-sm p-8 text-center" onClick={(e) => e.stopPropagation()}>
          <p className="text-sm text-foreground/60">Couldn't start your lounge. Try again.</p>
        </div>
      </div>
    );
  }

  const url = loungeUrl(session.code);
  const pending = members.filter((m) => m.status === "pending" && m.role !== "host");
  const approvedGuests = members.filter((m) => m.status === "approved" && m.role !== "host");

  function copy() {
    navigator.clipboard?.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  }

  return (
    <div className="fixed inset-0 z-[60] bg-black/80 backdrop-blur-md flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="bg-card text-foreground rounded-3xl w-full max-w-md max-h-[90vh] overflow-y-auto p-6 relative shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute right-4 top-4 p-2 rounded-full hover:bg-foreground/5"
          aria-label="Close"
        >
          <X size={20} />
        </button>

        <div className="text-center mb-5">
          <div className="inline-flex items-center gap-2 text-[10px] uppercase tracking-[0.3em] text-foreground/50 mb-1">
            <Speaker size={12} /> Public Lounge
          </div>
          <h2 className="text-xl font-extrabold tracking-tight">{session.host_name || "Your"} Lounge</h2>
          <p className="text-xs text-foreground/50 mt-1">
            Friends scan this to join and add songs straight to your play queue.
          </p>
        </div>

        {/* QR */}
        <div className="flex flex-col items-center mb-4">
          <div className="inline-block p-4 rounded-3xl shadow-sm" style={{ backgroundColor: "white" }}>
            <img src={qrImageUrl(url, 480)} alt="Lounge QR" width="240" height="240" className="rounded-xl" />
          </div>
          <div className="mt-3 flex items-center gap-2">
            <span className="text-sm font-bold tracking-[0.2em]">{session.code}</span>
            <button
              onClick={copy}
              className="p-1.5 rounded-full hover:bg-foreground/5 active:scale-90 transition"
              aria-label="Copy link"
            >
              {copied ? <Check size={14} /> : <Copy size={14} />}
            </button>
          </div>
        </div>

        {/* Pending requests */}
        <div className="mb-3">
          <div className="flex items-center gap-2 text-[11px] uppercase tracking-wider text-foreground/40 mb-2">
            <Users size={12} /> Join requests {pending.length ? `· ${pending.length}` : ""}
          </div>
          {pending.length === 0 ? (
            <p className="text-xs text-foreground/40 px-1">No one waiting. Share your QR to invite friends.</p>
          ) : (
            <div className="space-y-2">
              {pending.map((m) => (
                <div key={m.id} className="flex items-center gap-2 px-2 py-2 rounded-xl bg-foreground/[0.03]">
                  <div className="w-8 h-8 rounded-full bg-foreground/10 grid place-items-center text-xs font-bold shrink-0">
                    {(m.name || "?").charAt(0)}
                  </div>
                  <span className="text-sm truncate flex-1">{m.name || "Someone"}</span>
                  <button
                    onClick={() => approve(m)}
                    className="w-8 h-8 rounded-full bg-foreground text-background grid place-items-center active:scale-90 transition"
                    aria-label="Approve"
                  >
                    <Check size={15} />
                  </button>
                  <button
                    onClick={() => reject(m)}
                    className="w-8 h-8 rounded-full border border-border grid place-items-center active:scale-90 transition"
                    aria-label="Decline"
                  >
                    <X size={15} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Approved guests */}
        {approvedGuests.length > 0 && (
          <div className="mb-4">
            <div className="text-[11px] uppercase tracking-wider text-foreground/40 mb-2">In the lounge</div>
            <div className="flex flex-wrap gap-2">
              {approvedGuests.map((m) => (
                <span
                  key={m.id}
                  className="chip"
                >
                  {m.name || "Guest"}
                </span>
              ))}
            </div>
          </div>
        )}

        <button
          onClick={() => setScanning(true)}
          className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-2xl border border-border text-sm font-semibold mb-3"
        >
          <ScanLine size={15} /> Scan to join a lounge
        </button>

        <button
          onClick={async () => {
            await endSession();
            onClose();
          }}
          className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-2xl border border-dashed border-border text-sm font-semibold text-foreground/70 hover:text-red-600 hover:border-red-600/40 transition"
        >
          <Power size={15} /> End lounge
        </button>
      </div>
      {scanning && <QRScannerModal onClose={() => setScanning(false)} />}
    </div>
  );
}