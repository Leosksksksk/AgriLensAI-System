// src/context/ThemeContext.js
import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { lightColors, darkColors, severityColor, riskColor } from '../theme/colors';

const defaultColors = darkColors;
const defaultContext = {
  isDark: true,
  setIsDark: () => {},
  toggleTheme: () => {},
  isLoading: true,
  colors: defaultColors,
};

const ThemeContext = createContext(defaultContext);
const STORAGE_KEY = 'agrilens_theme_mode';

export function ThemeProvider({ children }) {
  const [isDark, setIsDarkState] = useState(true);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const saved = await AsyncStorage.getItem(STORAGE_KEY);
        if (saved !== null) {
          setIsDarkState(saved === 'dark');
        }
      } catch (e) {
        console.warn('Could not load saved theme:', e);
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

  async function setIsDark(value) {
    setIsDarkState(value);
    try {
      await AsyncStorage.setItem(STORAGE_KEY, value ? 'dark' : 'light');
    } catch (e) {
      console.warn('Could not save theme:', e);
    }
  }

  async function toggleTheme() {
    const newValue = !isDark;
    setIsDarkState(newValue);
    try {
      await AsyncStorage.setItem(STORAGE_KEY, newValue ? 'dark' : 'light');
    } catch (e) {
      console.warn('Could not save theme:', e);
    }
  }

  const colors = useMemo(() => (isDark ? darkColors : lightColors), [isDark]);

  const value = useMemo(() => ({
    isDark,
    setIsDark,
    toggleTheme,
    isLoading,
    colors,
    severityColor: (level) => severityColor(level, isDark),
    riskColor: (level) => riskColor(level, isDark),
  }), [isDark, isLoading, colors]);

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}

export function useColors() {
  const { colors } = useTheme();
  return colors ?? defaultColors;
}

export function useSeverityColor() {
  const { severityColor } = useTheme();
  return severityColor;
}

export function useRiskColor() {
  const { riskColor } = useTheme();
  return riskColor;
}