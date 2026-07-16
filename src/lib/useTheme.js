import { useCallback, useEffect, useState } from "react";

const KEY = "public-theme";

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
    const root = document.documentElement;
    if (theme === "dark") root.classList.add("dark");
    else root.classList.remove("dark");
    try {
      localStorage.setItem(KEY, theme);
    } catch {}
  }, [theme]);

  const setTheme = useCallback(
    (t) => setThemeState(t === "dark" ? "dark" : "light"),
    []
  );
  const toggle = useCallback(
    () => setThemeState((t) => (t === "dark" ? "light" : "dark")),
    []
  );

  return { theme, setTheme, toggle, isDark: theme === "dark" };
}