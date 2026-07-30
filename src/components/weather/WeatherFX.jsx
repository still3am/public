import { Cloud, CloudRain, CloudSnow, Sun, Moon, CloudLightning, CloudFog } from "lucide-react";
import { useLiveWeather } from "@/hooks/useLiveWeather";
import CloudLayer from "@/components/weather/CloudLayer";
import PrecipCanvas from "@/components/weather/PrecipCanvas";
import LightningLayer from "@/components/weather/LightningLayer";

const TINTS = {
  clear: "from-sky-400/25 via-transparent to-amber-300/20",
  partly: "from-sky-400/20 via-transparent to-slate-400/15",
  cloudy: "from-slate-400/25 via-transparent to-slate-600/20",
  fog: "from-slate-300/30 via-slate-400/15 to-slate-500/25",
  rain: "from-sky-600/30 via-transparent to-indigo-700/25",
  snow: "from-sky-200/30 via-transparent to-slate-300/25",
  thunder: "from-indigo-800/35 via-transparent to-slate-900/30",
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
export default function WeatherFX() {
  const weather = useLiveWeather();
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
        <div className="absolute -top-16 right-6 w-56 h-56 rounded-full bg-amber-300/25 blur-3xl animate-sun-pulse pointer-events-none" />
      )}
      {condition !== "clear" && <CloudLayer density={density} />}
      {(condition === "rain" || condition === "thunder") && (
        <PrecipCanvas type="rain" intensity={condition === "thunder" ? 1.3 : 1} wind={wind} />
      )}
      {condition === "snow" && <PrecipCanvas type="snow" intensity={1} wind={wind} />}
      {condition === "thunder" && <LightningLayer />}

      <div className="absolute top-4 right-4 z-10 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-background/55 backdrop-blur border border-foreground/10 text-[11px] font-bold text-foreground/70">
        <Icon size={13} /> {temperature}° · {LABELS[condition]}
      </div>
    </>
  );
}