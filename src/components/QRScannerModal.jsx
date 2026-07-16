import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { X, Loader2, ScanLine } from "lucide-react";

export default function QRScannerModal({ onClose }) {
  const nav = useNavigate();
  const instRef = useRef(null);
  const [err, setErr] = useState("");
  const [starting, setStarting] = useState(true);

  function handle(decoded) {
    if (!decoded) return;
    const m = decoded.match(/\/profile\/([a-zA-Z0-9_-]+)/);
    if (m) {
      onClose();
      nav(`/profile/${m[1]}`);
    } else {
      setErr("That QR code doesn't look like a PUBLIC profile link.");
    }
  }

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const mod = await import("html5-qrcode");
        const Html5Qrcode = mod.Html5Qrcode || mod.default;
        if (cancelled) return;
        const inst = new Html5Qrcode("qr-reader");
        instRef.current = inst;
        await inst.start(
          { facingMode: "environment" },
          { fps: 10, qrbox: { width: 250, height: 250 } },
          (decoded) => handle(decoded),
          () => {}
        );
        if (!cancelled) setStarting(false);
      } catch (e) {
        setErr(
          "Could not access your camera. Check permissions and try again."
        );
        setStarting(false);
      }
    })();
    return () => {
      cancelled = true;
      const inst = instRef.current;
      if (inst) {
        inst.stop().then(() => inst.clear()).catch(() => {});
        instRef.current = null;
      }
    };
  }, []);

  return (
    <div
      className="fixed inset-0 z-[60] bg-black/85 backdrop-blur-md grid place-items-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-card rounded-3xl w-full max-w-sm p-5 relative"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute right-3 top-3 p-2 rounded-full hover:bg-foreground/10"
          aria-label="Close"
        >
          <X size={20} />
        </button>
        <h3 className="font-extrabold text-center mb-1">Scan a PUBLIC QR</h3>
        <p className="text-xs text-foreground/50 text-center mb-3">
          Point your camera at a profile QR code.
        </p>
        <div className="relative rounded-2xl overflow-hidden bg-black aspect-square">
          <div id="qr-reader" className="w-full h-full [&_video]:object-cover [&_video]:w-full [&_video]:h-full" />
          <div className="pointer-events-none absolute inset-0 grid place-items-center">
            <div className="w-[62%] h-[62%] border-2 border-white/70 rounded-2xl" />
          </div>
          {starting && (
            <div className="absolute inset-0 grid place-items-center text-white/80">
              <Loader2 className="animate-spin" />
            </div>
          )}
        </div>
        {err && <p className="text-xs text-red-500 text-center mt-3">{err}</p>}
        <p className="text-[10px] text-foreground/40 text-center mt-3 flex items-center justify-center gap-1">
          <ScanLine size={10} /> Only used to open PUBLIC profiles.
        </p>
      </div>
    </div>
  );
}