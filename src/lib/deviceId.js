// Stable per-browser identity, so cross-device playback sync can tell "this
// device" apart from "my other device".

const KEY = "public:device_id";

export function getDeviceId() {
  try {
    let v = localStorage.getItem(KEY);
    if (!v) {
      v = `d_${Math.random().toString(36).slice(2)}${Date.now().toString(36)}`;
      localStorage.setItem(KEY, v);
    }
    return v;
  } catch {
    return "d_ephemeral";
  }
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