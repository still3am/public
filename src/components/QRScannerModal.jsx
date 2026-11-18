import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { X, Loader2, ScanLine, RefreshCw } from "lucide-react";

export default function QRScannerModal({ onClose }) {
  const nav = useNavigate();
  const scannerRef = useRef(null);
  const handledRef = useRef(false);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;
  const [error, setError] = useState("");
  const [starting, setStarting] = useState(true);
  const [attempt, setAttempt] = useState(0);

  const handle = useCallback((decoded) => {
    if (!decoded || handledRef.current) return;
    let pathname = "";
    try {
      pathname = new URL(decoded.trim(), window.location.origin).pathname;
    } catch {
      setError("That QR code isn’t a valid PUBLIC link. Try another code.");
      return;
    }

    const profile = pathname.match(/^\/profile\/([a-zA-Z0-9_-]+)\/?$/i);
    const connect = pathname.match(/^\/(?:connect|lounge)\/([A-Z2-9]{5})\/?$/i);
    if (profile) {
      handledRef.current = true;
      onCloseRef.current?.();
      nav(`/profile/${profile[1]}`);
      return;
    }
    if (connect) {
      handledRef.current = true;
      onCloseRef.current?.();
      nav(`/connect/${connect[1].toUpperCase()}`);
      return;
    }
    setError("That QR code isn’t a PUBLIC profile or Connect invite.");
  }, [nav]);

  useEffect(() => {
    let cancelled = false;
    handledRef.current = false;
    setStarting(true);
    setError("");

    (async () => {
      let scanner;
      try {
        if (!navigator.mediaDevices?.getUserMedia) {
          throw new Error("Camera access requires a secure browser connection.");
        }
        const mod = await import("html5-qrcode");
        const Html5Qrcode = mod.Html5Qrcode;
        if (typeof Html5Qrcode !== "function") throw new Error("Scanner unavailable");
        if (cancelled) return;

        scanner = new Html5Qrcode("qr-reader", { verbose: false });
        scannerRef.current = scanner;
        await scanner.start(
          { facingMode: "environment" },
          { fps: 12, qrbox: { width: 250, height: 250 }, aspectRatio: 1 },
          (decoded) => handle(decoded),
          () => {}
        );
        if (cancelled) {
          await scanner.stop().catch(() => {});
          await scanner.clear().catch(() => {});
          return;
        }
        setStarting(false);
      } catch (cause) {
        if (cancelled) return;
        setError(
          window.isSecureContext
            ? "Couldn’t open the camera. Allow camera access for PUBLIC, then try again."
            : "Camera scanning needs a secure connection. Open PUBLIC in its secure web address and try again."
        );
        setStarting(false);
      }
    })();

    return () => {
      cancelled = true;
      const scanner = scannerRef.current;
      scannerRef.current = null;
      if (scanner) {
        let stopped;
        try {
          stopped = scanner.isScanning ? scanner.stop() : Promise.resolve();
        } catch {
          stopped = Promise.resolve();
        }
        Promise.resolve(stopped).catch(() => {}).finally(() => {
          try { scanner.clear(); } catch {}
        });
      }
    };
  }, [attempt, handle]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Scan a PUBLIC QR"
      data-public-dialog
      tabIndex={-1}
      onKeyDown={(event) => {
        if (event.key === "Escape") {
          event.stopPropagation();
          onClose?.();
        }
      }}
      className="fixed inset-0 z-[130] bg-black/85 backdrop-blur-md grid place-items-center p-4"
      onClick={onClose}
    >
      <div className="bg-card rounded-3xl w-full max-w-sm p-5 relative" onClick={(event) => event.stopPropagation()}>
        <button
          type="button"
          onClick={onClose}
          className="absolute right-3 top-3 w-10 h-10 rounded-full grid place-items-center hover:bg-foreground/10"
          aria-label="Close scanner"
        >
          <X size={20} />
        </button>
        <h3 className="font-extrabold text-center mb-1 pr-9">Scan a PUBLIC QR</h3>
        <p className="text-xs text-foreground/50 text-center mb-3">
          Point your camera at a profile or Connect invite.
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
        {error && (
          <div className="mt-3 text-center" role="alert">
            <p className="text-xs text-red-500">{error}</p>
            {!starting && /camera/i.test(error) && (
              <button
                type="button"
                onClick={() => setAttempt((value) => value + 1)}
                className="inline-flex items-center justify-center gap-2 mt-3 min-h-10 px-4 rounded-full border border-border text-xs font-semibold"
              >
                <RefreshCw size={14} /> Try again
              </button>
            )}
          </div>
        )}
        <p className="text-[10px] text-foreground/40 text-center mt-3 flex items-center justify-center gap-1">
          <ScanLine size={10} /> Opens profiles and Connect invites.
        </p>
      </div>
    </div>
  );
}
