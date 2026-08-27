import { z } from "zod";
import { AppError } from "@/lib/errors";
import type { GeoLocation, HourlyForecastPoint } from "@/lib/types";

const GEOCODE_URL = "https://geocoding-api.open-meteo.com/v1/search";
const FORECAST_URL = "https://api.open-meteo.com/v1/forecast";
const HOURLY_VARS =
  "temperature_2m,apparent_temperature,precipitation_probability,precipitation,wind_speed_10m,cloud_cover,is_day";
const FETCH_TIMEOUT_MS = 8000;

// Validate only the fields we actually use, not the whole Open-Meteo response.
const GeocodeResponseSchema = z.object({
  results: z
    .array(
      z.object({
        name: z.string(),
        country: z.string().optional(),
        admin1: z.string().optional(),
        latitude: z.number(),
        longitude: z.number(),
        timezone: z.string(),
      }),
    )
    .optional(),
});

const ForecastResponseSchema = z.object({
  hourly: z.object({
    time: z.array(z.string()),
    temperature_2m: z.array(z.number().nullable()),
    apparent_temperature: z.array(z.number().nullable()),
    precipitation_probability: z.array(z.number().nullable()),
    precipitation: z.array(z.number().nullable()),
    wind_speed_10m: z.array(z.number().nullable()),
    cloud_cover: z.array(z.number().nullable()),
    is_day: z.array(z.number().nullable()),
  }),
});
type ForecastHourly = z.infer<typeof ForecastResponseSchema>["hourly"];

export async function geocode(query: string): Promise<GeoLocation> {
  const url = `${GEOCODE_URL}?name=${encodeURIComponent(query)}&count=1&language=en&format=json`;
  const parsed = GeocodeResponseSchema.safeParse(await fetchJson(url));
  if (!parsed.success) {
    throw new AppError("WEATHER_UNAVAILABLE", 502, "Unexpected response from the geocoding service.");
  }
  const first = parsed.data.results?.[0];
  if (!first) {
    throw new AppError("LOCATION_NOT_FOUND", 404, `No location found for "${query}".`);
  }
  return {
    name: first.name,
    country: first.country ?? "",
    admin1: first.admin1,
    latitude: first.latitude,
    longitude: first.longitude,
    timezone: first.timezone,
  };
}

export async function fetchHourlyForecast(
  loc: Pick<GeoLocation, "latitude" | "longitude">,
): Promise<HourlyForecastPoint[]> {
  const url =
    `${FORECAST_URL}?latitude=${loc.latitude}&longitude=${loc.longitude}` +
    `&hourly=${HOURLY_VARS}&timezone=auto&forecast_days=7`;
  const parsed = ForecastResponseSchema.safeParse(await fetchJson(url));
  if (!parsed.success) {
    throw new AppError("WEATHER_UNAVAILABLE", 502, "Unexpected response from the weather service.");
  }
  return toPoints(parsed.data.hourly);
}

async function fetchJson(url: string): Promise<unknown> {
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(FETCH_TIMEOUT_MS) });
    if (!res.ok) {
      throw new AppError("WEATHER_UNAVAILABLE", 502, `The weather service returned status ${res.status}.`);
    }
    return await res.json();
  } catch (err) {
    if (err instanceof AppError) throw err;
    throw new AppError("WEATHER_UNAVAILABLE", 502, "The weather service didn't respond.");
  }
}

function toPoints(hourly: ForecastHourly): HourlyForecastPoint[] {
  const points: HourlyForecastPoint[] = [];
  for (let i = 0; i < hourly.time.length; i++) {
    const temperature = hourly.temperature_2m[i];
    if (temperature == null) continue; // an hour without a temperature is useless for scoring
    points.push({
      time: hourly.time[i],
      temperature,
      apparentTemperature: hourly.apparent_temperature[i] ?? temperature,
      precipitationProbability: hourly.precipitation_probability[i] ?? 0,
      precipitation: hourly.precipitation[i] ?? 0,
      windSpeed: hourly.wind_speed_10m[i] ?? 0,
      cloudCover: hourly.cloud_cover[i] ?? 0,
      isDay: hourly.is_day[i] === 1,
    });
  }
  return points;
}
