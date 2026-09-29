import { useCallback, useEffect, useState } from "react";

const KEY = "public-theme";
const EVENT = "public-theme-change";

function systemTheme() {
  try {
    return window.matchMedia?.("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  } catch {
    return "light";
  }
}

function readStored() {
  try {
    const v = localStorage.getItem(KEY);
    return v === "dark" || v === "light" ? v : null;
  } catch {
    return null;
  }
}

function getInitial() {
  return readStored() || systemTheme();
}

function applyTheme(theme) {
  const root = document.documentElement;
  if (theme === "dark") root.classList.add("dark");
  else root.classList.remove("dark");
  window.dispatchEvent(new Event(EVENT));
}

export function useTheme() {
  const [theme, setThemeState] = useState(getInitial);

  // Stay in sync with every other useTheme() instance in the app.
  useEffect(() => {
    const onChange = () => setThemeState(readStored() || systemTheme());
    window.addEventListener(EVENT, onChange);
    return () => window.removeEventListener(EVENT, onChange);
  }, []);

  // Until the user picks a theme explicitly, follow the OS setting.
  useEffect(() => {
    if (readStored()) return;
    const mq = window.matchMedia?.("(prefers-color-scheme: dark)");
    if (!mq) return;
    const onSystem = (e) => setThemeState(e.matches ? "dark" : "light");
    mq.addEventListener?.("change", onSystem);
    return () => mq.removeEventListener?.("change", onSystem);
  }, [theme]);

  // Reflect the active theme on <html>.
  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  const setTheme = useCallback((t) => {
    const next = t === "dark" ? "dark" : "light";
    try {
      localStorage.setItem(KEY, next);
    } catch {}
    setThemeState(next);
  }, []);

  const toggle = useCallback(() => {
    setThemeState((t) => {
      const next = t === "dark" ? "light" : "dark";
      try {
        localStorage.setItem(KEY, next);
      } catch {}
      return next;
    });
  }, []);

  return { theme, setTheme, toggle, isDark: theme === "dark" };
}