import { useState } from "react";
import WeatherFX from "@/components/weather/WeatherFX";

const CONDITIONS = ["clear", "partly", "cloudy", "fog", "rain", "snow", "thunder"];

// Let admins preview every weather animation the hero can render.
export default function WeatherPreview() {
  const [cond, setCond] = useState("rain");

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-1.5">
        {CONDITIONS.map((c) => (
          <button
            key={c}
            onClick={() => setCond(c)}
            className={`px-3 py-1.5 rounded-full text-xs font-bold capitalize transition ${
              cond === c
                ? "bg-foreground text-background"
                : "bg-foreground/[0.05] text-foreground/60 hover:bg-foreground/10"
            }`}
          >
            {c}
          </button>
        ))}
      </div>

      <div className="relative rounded-3xl overflow-hidden border border-foreground/[0.06] h-56 md:h-64 bg-gradient-to-b from-sky-200/30 to-background">
        <WeatherFX demo={{ condition: cond, temperature: 21, cloudCover: cond === "clear" ? 5 : 80, wind: cond === "thunder" ? 32 : 14, isDay: cond !== "thunder" }} />
        <div className="absolute bottom-3 left-4 right-4 text-center text-xs font-semibold text-foreground/60 pointer-events-none">
          Preview · {cond}
        </div>
      </div>
    </div>
  );
}