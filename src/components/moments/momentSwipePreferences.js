import { useSyncExternalStore } from 'react';

export const PHOTO_SPEEDS = [
  { id: 'fast', label: 'Fast', delay: 2500 },
  { id: 'normal', label: 'Normal', delay: 4000 },
  { id: 'slow', label: 'Slow', delay: 6500 },
  { id: 'off', label: 'Off', delay: 0 },
];
const key = 'public.moments.photo-speed';
const fallback = { speed: 'normal', menuOpen: false };
let snapshot = fallback;
try {
  const saved = localStorage.getItem(key);
  if (PHOTO_SPEEDS.some((option) => option.id === saved)) snapshot = { ...fallback, speed: saved };
} catch {}
const listeners = new Set();
const subscribe = (listener) => { listeners.add(listener); return () => listeners.delete(listener); };
function update(patch) {
  if (Object.keys(patch).every((key) => snapshot[key] === patch[key])) return;
  snapshot = { ...snapshot, ...patch };
  for (const listener of listeners) listener();
}
export function setPhotoSpeed(speed) {
  if (!PHOTO_SPEEDS.some((option) => option.id === speed)) return;
  try { localStorage.setItem(key, speed); } catch {}
  update({ speed });
}
export function setPhotoSpeedMenuOpen(menuOpen) { update({ menuOpen }); }
export function useMomentSwipePreferences() {
  const state = useSyncExternalStore(subscribe, () => snapshot, () => fallback);
  return { ...state, delay: PHOTO_SPEEDS.find((option) => option.id === state.speed).delay };
}
