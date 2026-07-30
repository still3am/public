import { useEffect, useState } from "react";

// Maps an Open-Meteo WMO weather code to a visual effect condition.
function codeToCondition(code) {
  if (code === 0) return "clear";
  if (code <= 2) return "partly";
  if (code === 3) return "cloudy";
  if (code === 45 || code === 48) return "fog";
  if (code >= 71 && code <= 77) return "snow";
  if (code === 85 || code === 86) return "snow";
  if (code >= 95) return "thunder";
  if (code >= 51) return "rain";
  return "partly";
}

function getPosition() {
  return new Promise((resolve) => {
    if (!navigator.geolocation) return resolve(null);
    navigator.geolocation.getCurrentPosition(
      (p) => resolve({ lat: p.coords.latitude, lon: p.coords.longitude }),
      () => resolve(null),
      { timeout: 8000, maximumAge: 900000 }
    );
  });
}

// Live local weather used to drive the hero's Apple-Weather-style animations.
export function useLiveWeather() {
  const [weather, setWeather] = useState(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      const pos = await getPosition();
      if (!pos || !alive) return;
      const res = await fetch(
        `https://api.open-meteo.com/v1/forecast?latitude=${pos.lat}&longitude=${pos.lon}` +
          `&current=temperature_2m,weather_code,cloud_cover,wind_speed_10m,is_day`
      ).catch(() => null);
      if (!res || !res.ok || !alive) return;
      const json = await res.json().catch(() => null);
      const c = json?.current;
      if (!c || !alive) return;
      setWeather({
        condition: codeToCondition(c.weather_code),
        temperature: Math.round(c.temperature_2m),
        cloudCover: c.cloud_cover ?? 0,
        wind: c.wind_speed_10m ?? 0,
        isDay: c.is_day === 1,
      });
    })();
    return () => {
      alive = false;
    };
  }, []);

  return weather;
}