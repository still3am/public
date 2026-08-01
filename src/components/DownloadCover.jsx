import { useEffect, useState } from "react";
import { CloudOff } from "lucide-react";

// Renders a downloaded track's cover art from the locally-cached image blob so
// it still shows offline; falls back to the remote URL while online, and to a
// placeholder if neither is available.
export default function DownloadCover({ record, size = 16 }) {
  const [src, setSrc] = useState(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setFailed(false);
    let blobUrl = null;
    if (record?._coverBlob) {
      blobUrl = URL.createObjectURL(record._coverBlob);
      setSrc(blobUrl);
    } else if (record?.cover_art_url) {
      setSrc(record.cover_art_url);
    } else {
      setSrc(null);
    }
    return () => {
      if (blobUrl) URL.revokeObjectURL(blobUrl);
    };
  }, [record?.id, record?._coverBlob, record?.cover_art_url]);

  if (!src || failed) {
    return <CloudOff size={size} className="text-foreground/40" />;
  }
  return (
    <img
      src={src}
      alt=""
      onError={() => setFailed(true)}
      className="w-full h-full object-cover"
    />
  );
}