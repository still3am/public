import { useEffect, useState } from "react";
import { ImageOff, Loader2 } from "lucide-react";
import { Image } from "@/components/ui/image";
import { signedMediaUrl } from "@/lib/messageMedia";

export default function MessageMedia({ fileUri }) {
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
      <div className="w-48 h-32 rounded-xl grid place-items-center bg-foreground/10 text-foreground/45">
        <ImageOff size={20} />
      </div>);

  }

  if (!url) {
    return (
      <div className="w-48 h-32 rounded-xl grid place-items-center bg-foreground/10 text-foreground/45">
        <Loader2 size={18} className="animate-spin" />
      </div>);

  }

  return (
    <button
      onClick={() => window.open(url, "_blank", "noopener")}
      className="block max-w-[15rem] rounded-xl overflow-hidden"
      aria-label="Open photo">
      
      <Image src={url} alt="" fittingType="fill" className="w-full max-h-72 object-cover" />
    </button>);

}