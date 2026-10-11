import { useEffect, useState } from "react";

const KEY = "sidebar_collapsed";
const EVENT = "sidebar:collapsed";

// Storage access can THROW (private windows, blocked third-party storage in the
// preview frame). This hook runs on the app's first paint, so an unguarded read
// took the whole app down before it could respond to anything. Fall back to an
// in-memory value: the app always renders, and the toggle still works.
let fallback = "0";

function read() {
  try {
    const v = localStorage.getItem(KEY);
    return v === null ? fallback : v;
  } catch {
    return fallback;
  }
}

function write(v) {
  fallback = v;
  try {
    localStorage.setItem(KEY, v);
  } catch {
    /* storage unavailable — keep the session value */
  }
}

export function useSidebarCollapsed() {
  const [collapsed, setCollapsed] = useState(() => read() === "1");

  useEffect(() => {
    const handler = () => setCollapsed(read() === "1");
    window.addEventListener(EVENT, handler);
    window.addEventListener("storage", handler);
    return () => {
      window.removeEventListener(EVENT, handler);
      window.removeEventListener("storage", handler);
    };
  }, []);

  const toggle = () => {
    write(read() === "1" ? "0" : "1");
    window.dispatchEvent(new Event(EVENT));
  };

  return { collapsed, toggle };
}