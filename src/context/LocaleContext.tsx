import { createContext, useCallback, useContext, useMemo, useState } from 'react';

export type Language = 'pl' | 'en';

type LocaleContextValue = {
  language: Language;
  setLanguage: (lang: Language) => void;
  translate: (polish: string, english?: string) => string;
};

const LocaleContext = createContext<LocaleContextValue | undefined>(undefined);
const STORAGE_KEY = 'restaurant-lang';

// eslint-disable-next-line react-refresh/only-export-components
export function LocaleProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState<Language>(() => {
    if (typeof window === 'undefined') return 'pl';
    const stored = window.localStorage.getItem(STORAGE_KEY);
    return stored === 'en' ? 'en' : 'pl';
  });

  const setLanguage = useCallback((lang: Language) => {
    setLanguageState(lang);
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(STORAGE_KEY, lang);
    }
  }, []);

  const translate = useCallback(
    (polish: string, english?: string) => (language === 'pl' ? polish : english ?? polish),
    [language],
  );

  const value = useMemo<LocaleContextValue>(() => ({
    language,
    setLanguage,
    translate,
  }), [language, setLanguage, translate]);

  return (
    <LocaleContext.Provider value={value}>
      {children}
    </LocaleContext.Provider>
  );
}

export function useLocale() {
  const ctx = useContext(LocaleContext);
  if (!ctx) {
    throw new Error('useLocale must be used inside LocaleProvider');
  }
  return ctx;
}

export function useTranslate() {
  const { translate } = useLocale();
  return translate;
}
