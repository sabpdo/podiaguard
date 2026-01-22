'use client'

import React, { createContext, useContext, useState, useEffect } from 'react'
import { Language, translations } from './translations'

type LanguageContextType = {
  language: Language
  setLanguage: (lang: Language) => void
  t: typeof translations.en
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined)

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState<Language>('en')

  // Load language from localStorage on mount (client-side only)
  useEffect(() => {
    try {
      const savedLanguage = localStorage.getItem('language') as Language
      if (savedLanguage === 'en' || savedLanguage === 'ar') {
        setLanguageState(savedLanguage)
      }
    } catch (error) {
      // localStorage might not be available (e.g., in incognito mode or SSR)
      // Use default 'en'
    }
  }, [])

  // Update document direction and lang attribute
  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.documentElement.lang = language
      document.documentElement.dir = language === 'ar' ? 'rtl' : 'ltr'
    }
  }, [language])

  const setLanguage = (lang: Language) => {
    setLanguageState(lang)
    try {
      if (typeof window !== 'undefined') {
        localStorage.setItem('language', lang)
      }
    } catch (error) {
      console.warn('Failed to save language to localStorage:', error)
    }
  }

  const t = translations[language]

  // Always provide the context, even during SSR (use default 'en')
  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  )
}

export function useLanguage() {
  const context = useContext(LanguageContext)
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider')
  }
  return context
}
