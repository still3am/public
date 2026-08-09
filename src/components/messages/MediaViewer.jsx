import { X } from "lucide-react";

export default function MediaViewer({ url, type, onClose }) {
  return (
    <div className="fixed inset-0 z-[80] bg-black/95 flex items-center justify-center" onClick={onClose}>
      <button
        className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/10 grid place-items-center z-10"
        onClick={onClose}
        aria-label="Close"
      >
        <X size={22} className="text-white" />
      </button>
      {type === "video" ? (
        <video
          src={url}
          controls
          autoPlay
          playsInline
          className="max-w-full max-h-full"
          onClick={(e) => e.stopPropagation()}
        />
      ) : (
        <img
          src={url}
          alt=""
          className="max-w-full max-h-full object-contain"
          onClick={(e) => e.stopPropagation()}
        />
      )}
    </div>
  );
}