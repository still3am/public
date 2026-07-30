import { useEffect, useState } from "react";
import {
  getTransitionSettings,
  setTransitionSettings,
  TRANSITION_MODES,
} from "@/lib/transitions";

export function useTransitions() {
  const [settings, setSettings] = useState(getTransitionSettings);

  useEffect(() => {
    const onChange = (e) => setSettings(e.detail || getTransitionSettings());
    window.addEventListener("transitions:change", onChange);
    return () => window.removeEventListener("transitions:change", onChange);
  }, []);

  const update = (next) => {
    setSettings((prev) => {
      const merged = setTransitionSettings({ ...prev, ...next });
      return merged;
    });
  };

  return {
    mode: settings.mode,
    crossfadeSeconds: settings.crossfadeSeconds,
    setMode: (mode) => update({ mode }),
    setCrossfadeSeconds: (crossfadeSeconds) => update({ crossfadeSeconds }),
    isAutoMix: settings.mode === TRANSITION_MODES.AUTOMIX,
    isCrossfade: settings.mode === TRANSITION_MODES.CROSSFADE,
  };
}