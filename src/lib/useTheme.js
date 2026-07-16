import { useCallback, useEffect, useState } from "react";

const KEY = "public-theme";
const EVENT = "public-theme-change";

function getInitial() {
  try {
    return localStorage.getItem(KEY) === "dark" ? "dark" : "light";
  } catch {
    return "light";
  }
}

export function useTheme() {
  const [theme, setThemeState] = useState(getInitial);

  useEffect(() => {
    const onChange = () => {
      try {
        const t = localStorage.getItem(KEY);
        setThemeState(t === "dark" ? "dark" : "light");
      } catch {}
    };
    window.addEventListener(EVENT, onChange);
    return () => window.removeEventListener(EVENT, onChange);
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    if (theme === "dark") root.classList.add("dark");
    else root.classList.remove("dark");
    try {
      localStorage.setItem(KEY, theme);
    } catch {}
    window.dispatchEvent(new Event(EVENT));
  }, [theme]);

  const setTheme = useCallback((t) => {
    setThemeState(t === "dark" ? "dark" : "light");
  }, []);
  const toggle = useCallback(() => {
    setThemeState((t) => (t === "dark" ? "light" : "dark"));
  }, []);

  return { theme, setTheme, toggle, isDark: theme === "dark" };
}