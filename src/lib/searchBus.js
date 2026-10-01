// A tiny bridge so any button (sidebar, mobile header, shortcuts) can open the
// global search overlay without threading props through the whole layout.
export const OPEN_GLOBAL_SEARCH = "globalsearch:open";

export function openGlobalSearch() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(OPEN_GLOBAL_SEARCH));
}