import { useEffect, useState } from "react";
import {useCoverUrl} from "@/hooks/useCoverUrl";
import { CloudOff } from "lucide-react";

// Renders a downloaded track's cover art from the locally-cached image blob so
// it still shows offline; falls back to the remote URL while online, and to a
// placeholder if neither is available.
/** @param {any} props */
export default function DownloadCover({ record, size = 16 }) {
  const remote=useCoverUrl(record?.cover_art_url);
  const [src, setSrc] = useState(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setFailed(false);
    let blobUrl = null;
    if (record?._coverBlob?.size>0) {
      blobUrl = URL.createObjectURL(record._coverBlob);
      setSrc(blobUrl);
    } else if (remote) {
      setSrc(remote);
    } else {
      setSrc(null);
    }
    return () => {
      if (blobUrl) URL.revokeObjectURL(blobUrl);
    };
  }, [record?.id, record?._coverBlob, remote]);

  if (!src || failed) {
    return <CloudOff size={size} className="text-foreground/40" />;
  }
  return (
    <img
      src={src}
      alt=""
      onError={() => {if(src?.startsWith('blob:')&&remote&&src!==remote)setSrc(remote);else setFailed(true);}}
      className="w-full h-full object-cover"
    />
  );
}