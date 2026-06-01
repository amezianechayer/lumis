// Weather + UV based skincare advice. Uses Open-Meteo (free, no API key).

export interface WeatherData {
  temp: number;
  humidity: number;
  uvIndex: number;
  city?: string;
}

export interface WeatherAdvice {
  uvLevel: string;
  uvColor: string;
  tips: string[];
}

export async function fetchWeather(lat: number, lon: number): Promise<WeatherData> {
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m&daily=uv_index_max&timezone=auto&forecast_days=1`;
  const res = await fetch(url);
  if (!res.ok) throw new Error("weather fetch failed");
  const json = await res.json();
  return {
    temp: Math.round(json.current?.temperature_2m ?? 20),
    humidity: Math.round(json.current?.relative_humidity_2m ?? 50),
    uvIndex: Math.round(json.daily?.uv_index_max?.[0] ?? 3),
  };
}

export function buildAdvice(w: WeatherData): WeatherAdvice {
  const tips: string[] = [];

  // UV-based
  let uvLevel: string;
  let uvColor: string;
  if (w.uvIndex >= 8) {
    uvLevel = "Très élevé";
    uvColor = "#f87171";
    tips.push("☀️ UV très élevé : SPF 50+ obligatoire, réapplique toutes les 2h. Évite le soleil 12h-16h.");
  } else if (w.uvIndex >= 6) {
    uvLevel = "Élevé";
    uvColor = "#fb923c";
    tips.push("🧴 UV élevé : applique un SPF 50 ce matin, n'oublie pas le cou et les oreilles.");
  } else if (w.uvIndex >= 3) {
    uvLevel = "Modéré";
    uvColor = "#fbbf24";
    tips.push("🧴 UV modéré : un SPF 30 protège ta peau et prévient les taches.");
  } else {
    uvLevel = "Faible";
    uvColor = "#4ade80";
    tips.push("🧴 UV faible, mais un SPF 30 reste recommandé même par temps couvert.");
  }

  // Humidity-based
  if (w.humidity < 40) {
    tips.push("💧 Air sec : ajoute un sérum à l'acide hyaluronique et une crème plus riche aujourd'hui.");
  } else if (w.humidity > 75) {
    tips.push("✨ Humidité élevée : privilégie des textures légères et matifiantes pour éviter l'excès de sébum.");
  }

  // Temperature-based
  if (w.temp <= 8) {
    tips.push("🥶 Froid : renforce ta barrière cutanée avec un baume protecteur, le froid déshydrate.");
  } else if (w.temp >= 28) {
    tips.push("🔥 Chaleur : nettoie en douceur le soir pour retirer sueur et sébum accumulés.");
  }

  return { uvLevel, uvColor, tips };
}
