// Remembers the most recent uncaught error so the "Report a problem" sheet can
// attach it automatically, plus a short description of the device.
let lastError = null;

export function initErrorCapture() {
  if (typeof window === "undefined" || window.__publicErrorCapture) return;
  window.__publicErrorCapture = true;

  window.addEventListener("error", (e) => {
    lastError = {
      message: e?.message || String(e?.error || "Unknown error"),
      at: new Date().toISOString(),
    };
  });

  window.addEventListener("unhandledrejection", (e) => {
    const reason = e?.reason;
    lastError = {
      message:
        (reason && (reason.message || String(reason))) || "Unhandled promise rejection",
      at: new Date().toISOString(),
    };
  });
}

export function getLastError() {
  return lastError;
}

export function clearLastError() {
  lastError = null;
}

export function deviceSummary() {
  const ua = typeof navigator === "undefined" ? "" : navigator.userAgent || "";
  const browser = /Edg\//.test(ua)
    ? "Edge"
    : /OPR\//.test(ua)
      ? "Opera"
      : /Chrome\//.test(ua)
        ? "Chrome"
        : /Firefox\//.test(ua)
          ? "Firefox"
          : /Safari\//.test(ua)
            ? "Safari"
            : "Browser";
  const os = /iPhone|iPad|iPod/.test(ua)
    ? "iOS"
    : /Android/.test(ua)
      ? "Android"
      : /Mac OS X/.test(ua)
        ? "macOS"
        : /Windows/.test(ua)
          ? "Windows"
          : /Linux/.test(ua)
            ? "Linux"
            : "";
  const width = typeof window === "undefined" ? 0 : window.innerWidth || 0;
  return [browser, os].filter(Boolean).join(" · ") + (width ? ` · ${width}px` : "");
}