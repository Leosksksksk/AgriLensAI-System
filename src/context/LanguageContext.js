// src/context/LanguageContext.js
import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { t as translate, LANGUAGES, LANGUAGE_LABELS } from '../utils/translations';

const LanguageContext = createContext(null);
const STORAGE_KEY = 'agrilens_selected_language';

export function LanguageProvider({ children }) {
  const [language, setLanguageState] = useState('en');
  const [hasSelectedLanguage, setHasSelectedLanguage] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const saved = await AsyncStorage.getItem(STORAGE_KEY);
        if (saved && LANGUAGES.includes(saved)) {
          setLanguageState(saved);
          setHasSelectedLanguage(true);
        }
      } catch (e) {
        console.warn('Could not load saved language:', e);
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

  async function setLanguage(lang) {
    setLanguageState(lang);
    setHasSelectedLanguage(true);
    try {
      await AsyncStorage.setItem(STORAGE_KEY, lang);
    } catch (e) {
      console.warn('Could not save language:', e);
    }
  }

  // Clears the saved language choice entirely, so the next launch (or
  // an immediate re-visit to LanguageSelect) starts genuinely fresh —
  // used on logout.
  async function resetLanguageSelection() {
    setHasSelectedLanguage(false);
    try {
      await AsyncStorage.removeItem(STORAGE_KEY);
    } catch (e) {
      console.warn('Could not reset saved language:', e);
    }
  }

  const value = {
    language,
    setLanguage,
    resetLanguageSelection,
    hasSelectedLanguage,
    isLoading,
    languages: LANGUAGES,
    languageLabels: LANGUAGE_LABELS,
    t: (key) => translate(key, language),
  };

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const ctx = useContext(LanguageContext);
  if (!ctx) {
    throw new Error('useLanguage must be used inside a <LanguageProvider>');
  }
  return ctx;
}