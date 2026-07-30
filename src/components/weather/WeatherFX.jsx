import { Cloud, CloudRain, CloudSnow, Sun, Moon, CloudLightning, CloudFog } from "lucide-react";
import { useLiveWeather } from "@/hooks/useLiveWeather";
import CloudLayer from "@/components/weather/CloudLayer";
import PrecipCanvas from "@/components/weather/PrecipCanvas";
import LightningLayer from "@/components/weather/LightningLayer";
import FogLayer from "@/components/weather/FogLayer";

// Rich, layered color tints per condition for an Apple-Weather feel.
const TINTS = {
  clear: "from-amber-300/30 via-sky-400/15 to-sky-200/20",
  partly: "from-sky-400/25 via-sky-300/12 to-slate-300/15",
  cloudy: "from-slate-400/30 via-slate-500/15 to-slate-600/20",
  fog: "from-slate-300/35 via-slate-400/20 to-slate-500/25",
  rain: "from-slate-600/30 via-slate-700/25 to-indigo-800/30",
  snow: "from-slate-200/35 via-sky-200/20 to-slate-300/25",
  thunder: "from-indigo-900/40 via-slate-900/30 to-slate-950/35",
};

const ICONS = {
  clear: Sun,
  partly: Cloud,
  cloudy: Cloud,
  fog: CloudFog,
  rain: CloudRain,
  snow: CloudSnow,
  thunder: CloudLightning,
};

const LABELS = {
  clear: "Clear",
  partly: "Partly cloudy",
  cloudy: "Cloudy",
  fog: "Fog",
  rain: "Rain",
  snow: "Snow",
  thunder: "Thunderstorm",
};

// Live, animated weather effects layered behind the hero content.
// Pass `demo` to force a specific condition for previewing.
export default function WeatherFX({ demo }) {
  const live = useLiveWeather();
  const weather = demo || live;
  if (!weather) return null;

  const { condition, cloudCover, wind, temperature, isDay } = weather;
  const Icon = condition === "clear" && !isDay ? Moon : ICONS[condition];
  const density = Math.max(0.25, Math.min(1, cloudCover / 100));

  return (
    <>
      <div
        className={`absolute inset-0 pointer-events-none bg-gradient-to-b ${TINTS[condition]}`}
      />
      {condition === "clear" && (
        <div className="absolute -top-10 right-6 w-48 h-48 rounded-full bg-amber-300/40 blur-3xl animate-sun-pulse pointer-events-none" />
      )}
      {(condition === "partly" || condition === "cloudy") && (
        <CloudLayer density={density} />
      )}
      {condition === "fog" && (
        <>
          <CloudLayer density={0.5} />
          <FogLayer />
        </>
      )}
      {(condition === "rain" || condition === "thunder" || condition === "snow") && (
        <CloudLayer density={Math.max(0.7, density)} />
      )}
      {(condition === "rain" || condition === "thunder") && (
        <PrecipCanvas type="rain" intensity={condition === "thunder" ? 1.4 : 1} wind={wind} />
      )}
      {condition === "snow" && <PrecipCanvas type="snow" intensity={1} wind={wind} />}
      {condition === "thunder" && <LightningLayer />}

      <div className="absolute top-4 right-4 z-10 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-background/55 backdrop-blur border border-foreground/10 text-[11px] font-bold text-foreground/70">
        <Icon size={13} /> {temperature}° · {LABELS[condition]}
      </div>
    </>
  );
}