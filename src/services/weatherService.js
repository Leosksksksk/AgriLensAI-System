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
  try {
    const { latitude, longitude } = await getCurrentCoords();

    const url =
      `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}` +
      `&current=temperature_2m,relative_humidity_2m,precipitation_probability,wind_speed_10m` +
      `&timezone=auto`;

    const response = await fetch(url);
    if (!response.ok) throw new Error(`Weather API error: HTTP ${response.status}`);

    const data = await response.json();
    const current = data.current ?? {};

    const temperature = current.temperature_2m ?? 28;
    const humidity = current.relative_humidity_2m ?? 70;
    const rainProbability = current.precipitation_probability ?? 0;
    const windSpeedKmh = (current.wind_speed_10m ?? 0) * 3.6;

    let score = (humidity / 100) * 0.35 + (rainProbability / 100) * 0.25;

    if (temperature >= 35) score += 0.3;
    else if (temperature >= 30) score += 0.2;
    else if (temperature >= 25) score += 0.1;

    if (windSpeedKmh >= 20) score += 0.15;
    else if (windSpeedKmh >= 10) score += 0.1;

    score = Math.min(score, 1);

    const riskLevel = score >= 0.65 ? 'High' : score >= 0.4 ? 'Moderate' : 'Low';

    return { temperature, humidity, rainProbability, windSpeedKmh, riskLevel };
  } catch (e) {
    console.warn('Weather service offline/network error, using safe fallbacks:', e);
    return {
      temperature: 28,
      humidity: 70,
      rainProbability: 0,
      windSpeedKmh: 0,
      riskLevel: 'Moderate',
      isOffline: true,
    };
  }
}