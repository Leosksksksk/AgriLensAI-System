// src/services/weatherService.js
import * as Location from 'expo-location';

const DEFAULT_COORDS = { latitude: 11.0474, longitude: 124.0051 };

export async function getCurrentCoords() {
  try {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') return DEFAULT_COORDS;

    const position = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Balanced,
    });
    return {
      latitude: position.coords.latitude,
      longitude: position.coords.longitude,
    };
  } catch (e) {
    console.warn('Location error, using default coords:', e);
    return DEFAULT_COORDS;
  }
}

export async function fetchWeatherRisk() {
  const { latitude, longitude } = await getCurrentCoords();

  const url =
    `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}` +
    `&current=temperature_2m,relative_humidity_2m,precipitation_probability` +
    `&timezone=auto`;

  const response = await fetch(url);
  if (!response.ok) throw new Error(`Weather API error: HTTP ${response.status}`);

  const data = await response.json();
  const current = data.current ?? {};

  const temperature = current.temperature_2m ?? 28;
  const humidity = current.relative_humidity_2m ?? 70;
  const rainProbability = current.precipitation_probability ?? 0;

  const score = (humidity / 100) * 0.6 + (rainProbability / 100) * 0.4;
  const riskLevel = score >= 0.65 ? 'High' : score >= 0.4 ? 'Moderate' : 'Low';

  return { temperature, humidity, rainProbability, riskLevel };
}