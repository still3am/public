// Stable per-browser identity, so cross-device playback sync can tell "this
// device" apart from "my other device".

const KEY = "public:device_id";

// Held for the lifetime of the page. This device must keep ONE identity even
// when the browser refuses to persist storage (private windows, or Safari's
// blocked third-party storage inside the preview frame, where every read comes
// back empty). Re-reading storage on each render handed out a new id every
// time, so the app stopped recognising the playback row it had just written —
// it read it back as "another device", handed playback over, wrote another row,
// and looped: the app froze, no audio played, and rows piled up in the database.
let sessionId = null;

export function getDeviceId() {
  if (sessionId) return sessionId;
  const fresh = () => `d_${Math.random().toString(36).slice(2)}${Date.now().toString(36)}`;
  try {
    let v = localStorage.getItem(KEY);
    if (!v) {
      v = fresh();
      localStorage.setItem(KEY, v);
    }
    sessionId = v;
  } catch {
    sessionId = fresh();
  }
  return sessionId;
}

export function getDeviceLabel() {
  const ua = navigator.userAgent || "";
  const platform =
    /iPhone/.test(ua) ? "iPhone" :
    /iPad/.test(ua) ? "iPad" :
    /Android/.test(ua) ? "Android" :
    /Macintosh/.test(ua) ? "Mac" :
    /Windows/.test(ua) ? "Windows" :
    /Linux/.test(ua) ? "Linux" : "Device";
  const browser =
    /Edg\//.test(ua) ? "Edge" :
    /OPR\//.test(ua) ? "Opera" :
    /Chrome\//.test(ua) ? "Chrome" :
    /Firefox\//.test(ua) ? "Firefox" :
    /Safari\//.test(ua) ? "Safari" : "";
  return browser ? `${platform} · ${browser}` : platform;
}