// Shared song-transition preferences (AutoMix / Crossfade).
// Stored in localStorage so the player can read them synchronously
// without reactive plumbing, and settings pages write through here.

const KEY = "public:transitions";

export const TRANSITION_MODES = {
  OFF: "off",
  AUTOMIX: "automix",
  CROSSFADE: "crossfade",
};

export const CROSSFADE_MIN = 1;
export const CROSSFADE_MAX = 12;

const DEFAULTS = {
  mode: TRANSITION_MODES.OFF,
  crossfadeSeconds: 4,
};

export function getTransitionSettings() {
  try {
    const v = JSON.parse(localStorage.getItem(KEY) || "null");
    if (!v || typeof v !== "object") return { ...DEFAULTS };
    return {
      mode: v.mode in TRANSITION_MODES ? v.mode : DEFAULTS.mode,
      crossfadeSeconds: Math.min(
        CROSSFADE_MAX,
        Math.max(CROSSFADE_MIN, Number(v.crossfadeSeconds) || DEFAULTS.crossfadeSeconds)
      ),
    };
  } catch {
    return { ...DEFAULTS };
  }
}

export function setTransitionSettings(next) {
  const merged = { ...getTransitionSettings(), ...next };
  try {
    localStorage.setItem(KEY, JSON.stringify(merged));
  } catch {
    /* storage unavailable/quota — keep in-memory + event so the session still works */
  }
  window.dispatchEvent(new CustomEvent("transitions:change", { detail: merged }));
  return merged;
}

// True when some transition mode is active (so the player should fade in/out).
export function isTransitionActive(settings = getTransitionSettings()) {
  return (
    settings.mode === TRANSITION_MODES.CROSSFADE ||
    settings.mode === TRANSITION_MODES.AUTOMIX
  );
}