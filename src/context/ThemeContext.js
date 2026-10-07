// src/context/ThemeContext.js
import React, { createContext, useContext, useState, useEffect, useMemo, useRef } from 'react';
import { Animated } from 'react-native';
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
  const transitionOpacity = useRef(new Animated.Value(1)).current;
  const isTransitioning = useRef(false);

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

  function changeTheme(value) {
    if (value === isDark || isTransitioning.current) return;

    isTransitioning.current = true;
    Animated.timing(transitionOpacity, {
      toValue: 0.72,
      duration: 120,
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (!finished) {
        isTransitioning.current = false;
        return;
      }

      setIsDarkState(value);
      AsyncStorage.setItem(STORAGE_KEY, value ? 'dark' : 'light').catch((error) => {
        console.warn('Could not save theme:', error);
      });

      Animated.timing(transitionOpacity, {
        toValue: 1,
        duration: 220,
        useNativeDriver: true,
      }).start(() => {
        isTransitioning.current = false;
      });
    });
  }

  function setIsDark(value) {
    changeTheme(value);
  }

  function toggleTheme() {
    changeTheme(!isDark);
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
      <Animated.View style={{ flex: 1, opacity: transitionOpacity }}>
        {children}
      </Animated.View>
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