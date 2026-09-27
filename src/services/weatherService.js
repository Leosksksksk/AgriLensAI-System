// src/services/weatherService.js
import * as Location from 'expo-location';
import AsyncStorage from '@react-native-async-storage/async-storage';

const DEFAULT_COORDS = { latitude: 11.0474, longitude: 124.0051 };
const OPENWEATHER_API_KEY = 'f62d5ddae8ba892c756cbec5931b2feb';

async function fetchJsonWithTimeout(url, timeoutMs = 8000) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, { signal: controller.signal });
    if (!response.ok) throw new Error(`Weather API error: HTTP ${response.status}`);
    return await response.json();
  } finally {
    clearTimeout(timeout);
  }
}

function calculateRisk({ temperature, humidity, rainProbability, windSpeedKmh }) {
  let score = (humidity / 100) * 0.35 + (rainProbability / 100) * 0.25;

  if (temperature >= 35) score += 0.3;
  else if (temperature >= 30) score += 0.2;
  else if (temperature >= 25) score += 0.1;

  if (windSpeedKmh >= 20) score += 0.15;
  else if (windSpeedKmh >= 10) score += 0.1;

  score = Math.min(score, 1);
  return score >= 0.65 ? 'High' : score >= 0.4 ? 'Moderate' : 'Low';
}

function formatWeatherTime(value) {
  if (!value) return '';
  return new Date(value).toLocaleTimeString([], {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

function getWeatherCondition(code) {
  const conditions = {
    0: ['Clear sky', 'weatherClearSky'],
    1: ['Mainly clear', 'weatherMainlyClear'],
    2: ['Partly cloudy', 'weatherPartlyCloudy'],
    3: ['Overcast', 'weatherOvercast'],
    45: ['Fog', 'weatherFog'],
    48: ['Fog', 'weatherFog'],
    51: ['Drizzle', 'weatherDrizzle'],
    53: ['Drizzle', 'weatherDrizzle'],
    55: ['Drizzle', 'weatherDrizzle'],
    56: ['Drizzle', 'weatherDrizzle'],
    57: ['Drizzle', 'weatherDrizzle'],
    61: ['Light rain', 'weatherLightRain'],
    63: ['Rain', 'weatherRain'],
    65: ['Heavy rain', 'weatherHeavyRain'],
    66: ['Freezing rain', 'weatherFreezingRain'],
    67: ['Freezing rain', 'weatherFreezingRain'],
    71: ['Snow', 'weatherSnow'],
    73: ['Snow', 'weatherSnow'],
    75: ['Heavy snow', 'weatherHeavySnow'],
    77: ['Snow grains', 'weatherSnow'],
    80: ['Rain showers', 'weatherRainShowers'],
    81: ['Rain showers', 'weatherRainShowers'],
    82: ['Heavy rain showers', 'weatherHeavyRainShowers'],
    85: ['Snow showers', 'weatherSnowShowers'],
    86: ['Heavy snow showers', 'weatherHeavySnowShowers'],
    95: ['Thunderstorm', 'weatherThunderstorm'],
    96: ['Thunderstorm with hail', 'weatherThunderstormHail'],
    99: ['Thunderstorm with heavy hail', 'weatherThunderstormHail'],
  };
  return conditions[code] ?? ['Current conditions', 'weatherCurrentConditions'];
}

function getOpenWeatherConditionKey(main, description) {
  const normalized = (description || '').toLowerCase();
  if (normalized.includes('few clouds')) return 'weatherFewClouds';
  if (normalized.includes('scattered clouds')) return 'weatherScatteredClouds';
  if (normalized.includes('broken clouds')) return 'weatherBrokenClouds';
  if (normalized.includes('overcast clouds')) return 'weatherOvercast';
  if (normalized.includes('heavy intensity rain') || normalized.includes('heavy rain')) return 'weatherHeavyRain';
  if (normalized.includes('light rain')) return 'weatherLightRain';
  if (normalized.includes('shower')) return 'weatherRainShowers';

  if (main === 'Clear') return 'weatherClearSky';
  if (main === 'Clouds') return 'weatherPartlyCloudy';
  if (main === 'Drizzle') return 'weatherDrizzle';
  if (main === 'Rain') return 'weatherRain';
  if (main === 'Snow') return 'weatherSnow';
  if (main === 'Thunderstorm') return 'weatherThunderstorm';
  if (['Mist', 'Fog', 'Smoke'].includes(main)) return 'weatherFog';
  if (main === 'Haze') return 'weatherHaze';
  return 'weatherCurrentConditions';
}

async function getAreaEstimate() {
  try {
    const barangay = await AsyncStorage.getItem('user_barangay');
    if (barangay) {
      const [match] = await Location.geocodeAsync(`${barangay}, Cebu, Philippines`);
      if (match) {
        return {
          latitude: match.latitude,
          longitude: match.longitude,
          accuracy: null,
          locationName: barangay,
          locationSource: 'Barangay estimate',
          isApproximate: true,
        };
      }
    }
  } catch {
    // Use the configured regional estimate if the saved area cannot be geocoded.
  }

  return {
    ...DEFAULT_COORDS,
    accuracy: null,
    locationName: 'Bogo City',
    locationSource: 'Regional estimate',
    isApproximate: true,
  };
}

export async function getCurrentLocation() {
  try {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') return getAreaEstimate();

    const position = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.High,
      mayShowUserSettingsDialog: true,
    });

    const { latitude, longitude, accuracy } = position.coords;
    let locationName = `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`;
    try {
      const [place] = await Location.reverseGeocodeAsync({ latitude, longitude });
      const locality = [place?.district, place?.city, place?.subregion, place?.region]
        .filter(Boolean)
        .filter((value, index, values) =>
          values.findIndex((candidate) => candidate.toLowerCase() === value.toLowerCase()) === index
        );
      if (locality.length) locationName = locality.slice(0, 2).join(', ');
    } catch {
      // GPS coordinates remain the location label if reverse geocoding fails.
    }

    return {
      latitude,
      longitude,
      accuracy,
      locationName,
      locationSource: 'GPS',
      isApproximate: false,
    };
  } catch {
    return getAreaEstimate();
  }
}

export async function getCurrentCoords() {
  const { latitude, longitude } = await getCurrentLocation();
  return { latitude, longitude };
}

export async function fetchWeatherRisk(location = null) {
  const currentLocation = location ?? await getCurrentLocation();
  const { latitude, longitude } = currentLocation;
  const openMeteoUrl =
    `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}` +
    `&current=temperature_2m,relative_humidity_2m,precipitation_probability,wind_speed_10m,weather_code` +
    `&timezone=auto`;

  try {
    const data = await fetchJsonWithTimeout(openMeteoUrl);
    const current = data.current ?? {};

    const [condition, conditionKey] = getWeatherCondition(current.weather_code);
    const weather = {
      temperature: current.temperature_2m,
      humidity: current.relative_humidity_2m,
      rainProbability: current.precipitation_probability,
      windSpeedKmh: current.wind_speed_10m,
      condition,
      conditionKey,
    };
    if ([weather.temperature, weather.humidity, weather.rainProbability, weather.windSpeedKmh]
      .some((value) => typeof value !== 'number')) {
      throw new Error('Open-Meteo returned incomplete current conditions');
    }
    return {
      ...currentLocation,
      ...weather,
      riskLevel: calculateRisk(weather),
      observedAt: formatWeatherTime(current.time),
      checkedAt: formatWeatherTime(Date.now()),
      provider: 'Open-Meteo',
    };
  } catch {
    try {
      const url = `https://api.openweathermap.org/data/2.5/weather?lat=${latitude}&lon=${longitude}&units=metric&appid=${OPENWEATHER_API_KEY}`;
      const data = await fetchJsonWithTimeout(url);
      const condition = data.weather?.[0]?.main;
      const rainProbability = condition === 'Rain' || condition === 'Thunderstorm'
        ? 80
        : condition === 'Drizzle'
          ? 60
          : 0;
      const weather = {
        temperature: data.main?.temp,
        humidity: data.main?.humidity,
        rainProbability,
        windSpeedKmh: (data.wind?.speed ?? 0) * 3.6,
        condition: data.weather?.[0]?.description || 'Current conditions',
        conditionKey: getOpenWeatherConditionKey(condition, data.weather?.[0]?.description),
      };
      if (typeof weather.temperature !== 'number' || typeof weather.humidity !== 'number') {
        throw new Error('OpenWeatherMap returned incomplete current conditions');
      }
      return {
        ...currentLocation,
        ...weather,
        riskLevel: calculateRisk(weather),
        observedAt: formatWeatherTime(data.dt ? data.dt * 1000 : null),
        checkedAt: formatWeatherTime(Date.now()),
        provider: 'OpenWeatherMap',
      };
    } catch {
      // Keep an offline estimate available when neither weather provider can be reached.
    }

    return {
      ...currentLocation,
      temperature: 28,
      humidity: 70,
      rainProbability: 0,
      windSpeedKmh: 0,
      condition: 'Weather unavailable',
      conditionKey: 'weatherUnavailable',
      riskLevel: 'Moderate',
      isOffline: true,
      provider: 'offline-estimate',
    };
  }
}

export async function fetch7DayForecast(location = null) {
  try {
    const currentLocation = location ?? await getCurrentLocation();
    const { latitude, longitude } = currentLocation;

    const url =
      `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}` +
      `&daily=temperature_2m_max,temperature_2m_min,precipitation_probability_max,weathercode,relative_humidity_2m_mean` +
      `&timezone=auto`;

    const data = await fetchJsonWithTimeout(url);
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
  } catch {
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