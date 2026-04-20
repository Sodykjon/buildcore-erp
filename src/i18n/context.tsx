'use client'

import React, { createContext, useContext, useState, useEffect } from 'react'
import { translations, type Locale, type Translations } from './translations'

type LangCtx = {
  locale:    Locale
  t:         Translations
  setLocale: (l: Locale) => void
}

const LangContext = createContext<LangCtx>({
  locale:    'en',
  t:         translations.en,
  setLocale: () => {},
})

const STORAGE_KEY = 'buildcore-locale'

export function LangProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>('en')

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY) as Locale | null
    if (stored && stored in translations) setLocaleState(stored)
  }, [])

  function setLocale(l: Locale) {
    setLocaleState(l)
    localStorage.setItem(STORAGE_KEY, l)
  }

  return (
    <LangContext.Provider value={{ locale, t: translations[locale], setLocale }}>
      {children}
    </LangContext.Provider>
  )
}

export function useLang() {
  return useContext(LangContext)
}
