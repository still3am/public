import { useEffect, useState } from "react";

const KEY = "sidebar_collapsed";
const EVENT = "sidebar:collapsed";

export function useSidebarCollapsed() {
  const [collapsed, setCollapsed] = useState(
    () => localStorage.getItem(KEY) === "1"
  );

  useEffect(() => {
    const handler = () => setCollapsed(localStorage.getItem(KEY) === "1");
    window.addEventListener(EVENT, handler);
    window.addEventListener("storage", handler);
    return () => {
      window.removeEventListener(EVENT, handler);
      window.removeEventListener("storage", handler);
    };
  }, []);

  const toggle = () => {
    const next = localStorage.getItem(KEY) === "1" ? "0" : "1";
    localStorage.setItem(KEY, next);
    window.dispatchEvent(new Event(EVENT));
  };

  return { collapsed, toggle };
}