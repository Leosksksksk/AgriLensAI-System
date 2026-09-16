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

export async function fetch7DayForecast() {
  try {
    const { latitude, longitude } = await getCurrentCoords();

    const url =
      `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}` +
      `&daily=temperature_2m_max,temperature_2m_min,precipitation_probability_max,weathercode,relative_humidity_2m_mean` +
      `&timezone=auto`;

    const response = await fetch(url);
    if (!response.ok) throw new Error(`Weather API error: HTTP ${response.status}`);

    const data = await response.json();
    const daily = data.daily ?? {};

    const days = (daily.time ?? []).map((dateStr, i) => {
      const tempMax = daily.temperature_2m_max?.[i] ?? 28;
      const tempMin = daily.temperature_2m_min?.[i] ?? 22;
      const rainProb = daily.precipitation_probability_max?.[i] ?? 0;
      const humidity = daily.relative_humidity_2m_mean?.[i] ?? 70;
      const weatherCode = daily.weathercode?.[i] ?? 0;

      // Calculate risk score for this day
      let score = (humidity / 100) * 0.35 + (rainProb / 100) * 0.25;

      if (tempMax >= 35) score += 0.3;
      else if (tempMax >= 30) score += 0.2;
      else if (tempMax >= 25) score += 0.1;

      score = Math.min(score, 1);

      const riskLevel = score >= 0.65 ? 'High' : score >= 0.4 ? 'Moderate' : 'Low';

      // Map weather code to icon
      const icon = getWeatherIcon(weatherCode);

      return {
        date: dateStr,
        tempMax: Math.round(tempMax),
        tempMin: Math.round(tempMin),
        rainProbability: rainProb,
        humidity,
        riskLevel,
        icon,
      };
    });

    return days.slice(0, 7);
  } catch (e) {
    console.warn('7-day forecast fetch error, using fallback:', e);
    return getFallbackForecast();
  }
}

function getWeatherIcon(code) {
  // WMO weather codes
  if (code === 0) return 'sunny-outline';
  if ([1, 2, 3].includes(code)) return 'partly-sunny-outline';
  if ([45, 48].includes(code)) return 'cloud-outline';
  if ([51, 53, 55, 56, 57, 61, 63, 65, 66, 67, 80, 81, 82].includes(code)) return 'rainy-outline';
  if ([71, 73, 75, 77, 85, 86].includes(code)) return 'snow-outline';
  if ([95, 96, 99].includes(code)) return 'thunderstorm-outline';
  return 'cloud-outline';
}

function getFallbackForecast() {
  const today = new Date();
  return Array.from({ length: 7 }, (_, i) => {
    const date = new Date(today);
    date.setDate(today.getDate() + i);
    const dateStr = date.toISOString().split('T')[0];
    const dayName = i === 0 ? 'today' : i === 1 ? 'tomorrow' : date.toLocaleDateString('en-US', { weekday: 'short' });
    return {
      date: dateStr,
      tempMax: 32,
      tempMin: 24,
      rainProbability: 30,
      humidity: 80,
      riskLevel: i === 0 ? 'High' : i === 1 ? 'Low' : 'Moderate',
      icon: i === 0 ? 'rainy-outline' : i === 1 ? 'sunny-outline' : 'cloudy-outline',
      dayName,
    };
  });
}