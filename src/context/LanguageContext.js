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
        console.log('🔍 AsyncStorage saved language value:', JSON.stringify(saved));
        if (saved && LANGUAGES.includes(saved)) {
          console.log('🔍 Found valid saved language — skipping LanguageSelect');
          setLanguageState(saved);
          setHasSelectedLanguage(true);
        } else {
          console.log('🔍 No valid saved language — LanguageSelect should show');
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

  const value = {
    language,
    setLanguage,
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