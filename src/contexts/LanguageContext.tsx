
'use client';

import type { PropsWithChildren } from 'react';
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

type Language = 'en' | 'sw';
export type Translations = Record<string, any>; // Can be more specific, e.g., nested string records

interface LanguageContextType {
  language: Language;
  setLanguage: (language: Language) => void;
  t: (key: string, params?: Record<string, string | number>) => string;
  translations: Translations;
  isLoading: boolean; // To indicate if a language switch or initial load is in progress
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

async function loadTranslations(lang: Language): Promise<Translations> {
  try {
    const response = await fetch(`/locales/${lang}.json`);
    if (!response.ok) {
      console.error(`Failed to load ${lang}.json: ${response.statusText}`);
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
  const [language, setLanguageState] = useState<Language>('en');
  const [translations, setTranslations] = useState<Translations>({});
  const [contextIsLoading, setContextIsLoading] = useState(true); 
  const [initialTranslationsLoaded, setInitialTranslationsLoaded] = useState(false);

  useEffect(() => {
    const storedLang = localStorage.getItem('appLanguage') as Language | null;
    const initialLang = storedLang && ['en', 'sw'].includes(storedLang) ? storedLang : 'en';
    setLanguageState(initialLang);
  }, []);

  useEffect(() => {
    let active = true;
    setContextIsLoading(true); 

    loadTranslations(language).then(loadedTranslations => {
      if (active) {
        setTranslations(loadedTranslations);
      }
    }).catch((error) => {
      console.error("Failed to load translations in LanguageProvider effect:", error);
      if (active) {
        setTranslations({}); // Set to empty on error to avoid using stale translations
      }
    }).finally(() => {
      if (active) {
        setContextIsLoading(false);
        // Only set initialTranslationsLoaded to true once, after the first attempt
        // (success or failure) to load translations is complete and contextIsLoading is false.
        if (!initialTranslationsLoaded) {
          setInitialTranslationsLoaded(true);
        }
      }
    });

    return () => { active = false; }; // Cleanup function to prevent state updates on unmounted component
  }, [language]); // Effect runs when language changes. initialTranslationsLoaded is not a dependency here.

  const setLanguage = useCallback((lang: Language) => {
    localStorage.setItem('appLanguage', lang);
    setLanguageState(lang);
  }, []);

  const t = useCallback((key: string, params?: Record<string, string | number>): string => {
    const keys = key.split('.');
    let value: any = translations;
    try {
      for (const k of keys) {
        if (value && typeof value === 'object' && k in value) {
          value = value[k];
        } else {
          return key; // Key not found
        }
      }
    } catch (e) {
      return key; // Error accessing key
    }

    if (typeof value === 'string' && params) {
      return value.replace(/\{\{(\w+)\}\}/g, (_, paramName) => {
        return params[paramName]?.toString() || `{{${paramName}}}`;
      });
    }
    return typeof value === 'string' ? value : key;
  }, [translations]); // Depends only on the translations object

  if (!initialTranslationsLoaded) {
    // Prevents children from rendering and calling t()
    // before the first set of translations has been attempted and context states updated.
    return null;
  }
  
  return (
    <LanguageContext.Provider value={{ language, setLanguage, t, translations, isLoading: contextIsLoading }}>
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
