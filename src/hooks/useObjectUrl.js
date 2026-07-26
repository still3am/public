import { useEffect, useState } from "react";

// Creates a stable object URL for a File (or "" when none), revoking the
// previous URL when the file changes or the component unmounts. Calling
// URL.createObjectURL during render regenerates the URL on every state update,
// which forces <img> to reload — the image visibly "restarts" on each keystroke.
export function useObjectUrl(file) {
  const [url, setUrl] = useState("");
  useEffect(() => {
    if (!file) {
      setUrl("");
      return;
    }
    const u = URL.createObjectURL(file);
    setUrl(u);
    return () => URL.revokeObjectURL(u);
  }, [file]);
  return url;
}