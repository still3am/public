import { useEffect, useState } from "react";
import { ImageOff, Loader2 } from "lucide-react";
import { Image } from "@/components/ui/image";
import { signedMediaUrl } from "@/lib/messageMedia";

function Placeholder({ children }) {
  return (
    <div className="w-52 h-11 rounded-xl grid place-items-center bg-foreground/10 text-foreground/45">
      {children}
    </div>
  );
}

export default function MessageMedia({ fileUri, mediaType = "image" }) {
  const [url, setUrl] = useState("");
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    if (!fileUri) return;
    signedMediaUrl(fileUri).then((signed) => {
      if (cancelled) return;
      if (signed) setUrl(signed);
      else setFailed(true);
    });
    return () => {
      cancelled = true;
    };
  }, [fileUri]);

  if (failed) {
    return (
      <Placeholder>
        <ImageOff size={18} />
      </Placeholder>
    );
  }

  if (!url) {
    return (
      <Placeholder>
        <Loader2 size={16} className="animate-spin" />
      </Placeholder>
    );
  }

  if (mediaType === "audio") {
    return (
      <audio
        controls
        preload="metadata"
        src={url}
        className="w-52 max-w-full h-11"
      />
    );
  }

  return (
    <button
      onClick={() => window.open(url, "_blank", "noopener")}
      className="block max-w-[15rem] rounded-xl overflow-hidden"
      aria-label="Open attachment"
    >
      <Image src={url} alt="" fittingType="fill" className="w-full max-h-72 object-cover" />
    </button>
  );
}