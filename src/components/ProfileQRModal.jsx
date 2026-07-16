import { X, Download, Copy, Share2, ScanLine } from "lucide-react";

export default function ProfileQRModal({ url, name, avatar, onClose }) {
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=420x420&margin=8&color=000000&bgcolor=FFFFFF&qzone=2&data=${encodeURIComponent(
    url
  )}`;

  function copy() {
    navigator.clipboard?.writeText(url).then(() => {});
  }

  async function share() {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `${name} on PUBLIC`,
          text: `Listen to ${name} on PUBLIC.`,
          url
        });
      } catch {}
    } else {
      copy();
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm grid place-items-center p-4"
      onClick={onClose}>
      
      <div
        className="bg-card rounded-3xl w-full max-w-sm p-6 shadow-2xl text-center relative animate-[fadeIn_.18s_ease-out]"
        onClick={(e) => e.stopPropagation()}>
        
        <button
          onClick={onClose}
          className="absolute right-4 top-4 p-2 rounded-full hover:bg-foreground/5"
          aria-label="Close">
          
          <X size={18} />
        </button>

        <div className="text-[10px] uppercase tracking-[0.3em] text-foreground/40 mb-5 hidden">
          PUBLIC.
        </div>

        {/* Profile badge */}
        <div className="flex flex-col items-center mb-5">
          <div className="w-16 h-16 rounded-full overflow-hidden bg-foreground/10 grid place-items-center text-foreground/50 font-extrabold text-2xl mb-3 ring-1 ring-foreground/10 hidden">
            {avatar ?
            <img src={avatar} alt="" className="w-full h-full object-cover hidden" /> :

            (name || "?").charAt(0).toUpperCase()
            }
          </div>
          <h3 className="text-lg font-extrabold tracking-tight">{name}</h3>
        </div>

        {/* QR */}
        <div className="inline-block p-4 bg-white rounded-2xl shadow-sm mb-4">
          <img
            src={qrUrl}
            alt={`QR code for ${name}`}
            width="220"
            height="220"
            className="rounded-lg" />
          
        </div>

        <div className="inline-flex items-center gap-1.5 text-[11px] text-foreground/50 mb-5 hidden">
          <ScanLine size={12} />
          Scan with a phone camera to open this profile
        </div>

        <div className="flex flex-col gap-2">
          {navigator.share &&
          <button
            onClick={share}
            className="px-4 py-2.5 rounded-full bg-foreground text-background text-sm font-semibold flex items-center justify-center gap-2">
            
              <Share2 size={14} /> Share profile
            </button>
          }
          <div className="grid grid-cols-2 gap-2">
            <a
              href={qrUrl}
              download={`public-${name}-qr.png`}
              className="px-4 py-2.5 rounded-full border border-border text-sm font-semibold flex items-center justify-center gap-2 hover:bg-foreground/5 transition hidden">
              
              <Download size={14} /> QR
            </a>
            <button
              onClick={copy}
              className="rounded-full border border-border font-semibold flex items-center justify-center gap-2 hover:bg-foreground/5 transition text-sm py-2 px-4 hidden">
              
              <Copy size={14} /> Link
            </button>
          </div>
        </div>
      </div>
    </div>);

}