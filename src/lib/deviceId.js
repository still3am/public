// Stable per-browser identity, so cross-device playback sync can tell "this
// device" apart from "my other device".

const KEY = "public:device_id";
let sessionId = null;
const newId = () => `d_${globalThis.crypto?.randomUUID?.() || Math.random().toString(36).slice(2)+Date.now().toString(36)}`;

export function getDeviceId() {
  if(sessionId)return sessionId;
  try {
    const saved=localStorage.getItem(KEY);
    sessionId=typeof saved==='string'&&saved.startsWith('d_')&&saved.length>2?saved:newId();
    if(sessionId!==saved)localStorage.setItem(KEY,sessionId);
  } catch { sessionId=sessionId||newId(); }
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