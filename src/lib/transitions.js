// Shared song-transition preferences (AutoMix / Crossfade).
// Stored in localStorage so the player can read them synchronously
// without reactive plumbing, and settings pages write through here.

const KEY = "public:transitions";

export const TRANSITION_MODES = {
  OFF: "off",
  AUTOMIX: "automix",
  CROSSFADE: "crossfade",
  GAPLESS: "gapless",
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
      mode: Object.values(TRANSITION_MODES).includes(v.mode)
        ? v.mode
        : DEFAULTS.mode,
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

// True when a BLENDING mode is active (so the player should fade in/out).
// Gapless is deliberately excluded — it's a hard butt-join, not a fade.
export function isTransitionActive(settings = getTransitionSettings()) {
  return (
    settings.mode === TRANSITION_MODES.CROSSFADE ||
    settings.mode === TRANSITION_MODES.AUTOMIX
  );
}

// Gapless: no fade at all, the next track starts the instant this one ends.
export function isGapless(settings = getTransitionSettings()) {
  return settings.mode === TRANSITION_MODES.GAPLESS;
}