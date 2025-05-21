
'use client';

import type { PropsWithChildren } from 'react';
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

type Language = 'en' | 'sw';
export type Translations = Record<string, any>; // Can be more specific, e.g., nested string records

interface LanguageContextType {
  language: Language;
  setLanguage: (language: Language) => void;
  t: (key: string, params?: Record<string, string | number>) => string;
  translations: Translations; // Expose translations if needed directly, though 't' is preferred
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

async function loadTranslations(lang: Language): Promise<Translations> {
  try {
    const response = await fetch(`/locales/${lang}.json`);
    if (!response.ok) {
      console.error(`Failed to load ${lang}.json: ${response.statusText}`);
      // Fallback to English if current language fails, or empty if English also fails
      if (lang !== 'en') {
        const fallbackResponse = await fetch(`/locales/en.json`);
        if (fallbackResponse.ok) return await fallbackResponse.json();
      }
      return {};
    }
    return await response.json();
  } catch (error) {
    console.error(`Error fetching ${lang}.json:`, error);
    if (lang !== 'en') {
        const fallbackResponse = await fetch(`/locales/en.json`);
        if (fallbackResponse.ok) return await fallbackResponse.json();
      }
    return {};
  }
}

export const LanguageProvider: React.FC<PropsWithChildren> = ({ children }) => {
  const [language, setLanguageState] = useState<Language>('en'); // Default to English
  const [translations, setTranslations] = useState<Translations>({});
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const storedLang = localStorage.getItem('appLanguage') as Language | null;
    const initialLang = storedLang && ['en', 'sw'].includes(storedLang) ? storedLang : 'en';
    setLanguageState(initialLang);
  }, []);

  useEffect(() => {
    setIsLoading(true);
    loadTranslations(language).then(loadedTranslations => {
      setTranslations(loadedTranslations);
      setIsLoading(false);
    }).catch(() => {
      setIsLoading(false); // Ensure loading is false even on error
    });
  }, [language]);

  const setLanguage = useCallback((lang: Language) => {
    localStorage.setItem('appLanguage', lang);
    setLanguageState(lang);
  }, []);

  const t = useCallback((key: string, params?: Record<string, string | number>): string => {
    // If isLoading is true AND translations are still empty (initial load scenario before splash hides)
    if (isLoading && Object.keys(translations).length === 0) {
      // This state means it's the very initial load and translations haven't been fetched yet.
      // The SplashScreen should be visible during this time. Returning keys is acceptable.
      return key;
    }

    // If not in the absolute initial loading phase (i.e., translations object is populated, 
    // even if with old language data during a switch, or if isLoading is false), proceed to translate.
    const keys = key.split('.');
    let value: any = translations; 
    try {
      for (const k of keys) {
        if (value && typeof value === 'object' && k in value) {
          value = value[k];
        } else {
          // console.warn(`Translation key not found: ${key}`);
          return key; // Return key if not found
        }
      }
    } catch (e) {
    //   console.warn(`Error accessing translation key: ${key}`, e);
      return key;
    }


    if (typeof value === 'string' && params) {
      return value.replace(/\{\{(\w+)\}\}/g, (_, paramName) => {
        return params[paramName]?.toString() || `{{${paramName}}}`; // Keep placeholder if param not found
      });
    }
    return typeof value === 'string' ? value : key;
  }, [translations, isLoading]);
  
  return (
    <LanguageContext.Provider value={{ language, setLanguage, t, translations }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = (): LanguageContextType => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};
