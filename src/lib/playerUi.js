// Bridge between the track menus (which live anywhere in the app) and the
// full-screen player, so "Mix", "Lounge" and "Queue" reach the real player
// panels instead of each page growing its own copy.
const EVENT = "public:open-player";

let pending = null;

export function openFullPlayer(options = {}) {
  pending = options;
  window.dispatchEvent(new CustomEvent(EVENT, { detail: options }));
}

export function onOpenFullPlayer(handler) {
  const listener = (e) => handler(e.detail || {});
  window.addEventListener(EVENT, listener);
  return () => window.removeEventListener(EVENT, listener);
}

// The player mounts only after the event fires (it is opened by it), so the
// requested panel waits here until it does.
export function consumePlayerPanelRequest() {
  const request = pending;
  pending = null;
  return request;
}