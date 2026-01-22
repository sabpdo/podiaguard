'use client'

import { Button } from '@/components/ui/button'
import { Languages } from 'lucide-react'
import { useLanguage } from '@/lib/i18n/context'
import { cn } from '@/lib/utils'
import { useEffect, useState } from 'react'

export function LanguageSwitcher({ className }: { className?: string }) {
  const [mounted, setMounted] = useState(false)
  const { language, setLanguage } = useLanguage()

  useEffect(() => {
    setMounted(true)
  }, [])

  const toggleLanguage = () => {
    setLanguage(language === 'en' ? 'ar' : 'en')
  }
  
  // Don't render until mounted to avoid hydration mismatch
  if (!mounted) {
    return null
  }

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={toggleLanguage}
      className={cn(
        'rounded-full flex items-center gap-1.5 px-3 py-1.5 h-8 min-w-[70px]',
        'bg-background/90 backdrop-blur-sm border-2 shadow-md',
        'hover:bg-background hover:scale-105 transition-all',
        'z-50', // Ensure it's above other elements
        className
      )}
      aria-label={`Switch language (currently ${language === 'en' ? 'English' : 'Arabic'})`}
      title={`Switch to ${language === 'en' ? 'Arabic' : 'English'}`}
    >
      <Languages className="h-4 w-4 flex-shrink-0" />
      <span className="text-xs font-semibold whitespace-nowrap">{language === 'en' ? 'EN' : 'AR'}</span>
    </Button>
  )
}
