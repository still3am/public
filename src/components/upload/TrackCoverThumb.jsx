import { useEffect, useMemo } from "react";
import { Disc3 } from "lucide-react";

// Renders the artwork embedded in an uploaded file (or a chosen cover) as a
// small thumbnail. Manages the object URL lifecycle so embedded File thumbs
// are revoked when the item changes or the component unmounts.
export default function TrackCoverThumb({ item, size = 44 }) {
  const objectUrl = useMemo(() => {
    if (item?.cover && !item.cover_url) return URL.createObjectURL(item.cover);
    return null;
  }, [item?.cover, item?.cover_url]);

  useEffect(() => {
    if (objectUrl) return () => URL.revokeObjectURL(objectUrl);
  }, [objectUrl]);

  const src = item?.cover_url || objectUrl || "";

  if (!src) {
    return (
      <div
        style={{ width: size, height: size }}
        className="rounded-lg bg-foreground/10 shrink-0 grid place-items-center text-foreground/40"
      >
        <Disc3 size={Math.max(14, Math.round(size * 0.4))} />
      </div>
    );
  }

  return (
    <img
      src={src}
      alt=""
      style={{ width: size, height: size }}
      className="rounded-lg object-cover shrink-0"
    />
  );
}