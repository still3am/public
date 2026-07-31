import { useEffect, useState } from "react";
import {
  getTransitionSettings,
  setTransitionSettings,
  TRANSITION_MODES,
} from "@/lib/transitions";

export function useTransitions() {
  const [settings, setSettings] = useState(getTransitionSettings);

  useEffect(() => {
    const reread = () => setSettings(getTransitionSettings());
    const onChange = (e) => setSettings(e.detail || getTransitionSettings());
    const onStorage = (e) => {
      if (e.key === "public:transitions") reread();
    };
    window.addEventListener("transitions:change", onChange);
    window.addEventListener("storage", onStorage);
    window.addEventListener("pageshow", reread);
    return () => {
      window.removeEventListener("transitions:change", onChange);
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("pageshow", reread);
    };
  }, []);

  const update = (next) => {
    const merged = setTransitionSettings(next);
    setSettings(merged);
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