import { useEffect, useState } from "react";

// Creates the audio src ONCE for a given file and revokes it on unmount or
// when the file/url changes. Calling URL.createObjectURL during render (the
// previous approach) regenerated the blob URL on every state update, which
// reset the <audio> element mid-playback.
export function useStableAudioSrc(item) {
  const [src, setSrc] = useState("");
  useEffect(() => {
    if (item.audio_url) {
      setSrc(item.audio_url);
      return;
    }
    if (item.file) {
      const url = URL.createObjectURL(item.file);
      setSrc(url);
      return () => URL.revokeObjectURL(url);
    }
    setSrc("");
  }, [item.audio_url, item.file]);
  return src;
}