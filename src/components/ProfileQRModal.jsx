import { X } from "lucide-react";

export default function ProfileQRModal({ url, name, onClose }) {
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&margin=10&data=${encodeURIComponent(
    url
  )}`;
  return (
    <div
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm grid place-items-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl w-full max-w-sm p-6 shadow-2xl text-center"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-lg font-extrabold">Share profile</h3>
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-foreground/5"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>
        <p className="text-sm text-foreground/50 mb-4">
          Scan with a phone camera to open {name}'s profile on PUBLIC.
        </p>
        <div className="inline-block p-3 bg-white rounded-2xl border border-border">
          <img
            src={qrUrl}
            alt={`QR code for ${name}`}
            width={240}
            height={240}
            className="rounded-lg"
          />
        </div>
        <div className="mt-5 flex flex-col gap-2">
          <a
            href={qrUrl}
            download={`public-${name}-qr.png`}
            className="px-4 py-2 rounded-full bg-foreground text-background text-sm font-semibold"
          >
            Download QR
          </a>
          <button
            onClick={() => navigator.clipboard?.writeText(url)}
            className="px-4 py-2 rounded-full border border-border text-sm font-semibold"
          >
            Copy link
          </button>
        </div>
      </div>
    </div>
  );
}