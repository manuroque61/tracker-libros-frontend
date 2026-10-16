import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react'

export interface LanguageOption {
  value: string
  label: string
}

export const LANGUAGES: LanguageOption[] = [
  { value: 'es', label: 'Español' },
  { value: 'en', label: 'Inglés' },
  { value: 'all', label: 'Todos' },
]

const STORAGE_KEY = 'libros-tracker.language'
const DEFAULT_LANGUAGE = 'es'

interface LanguageContextValue {
  language: string
  setLanguage: (value: string) => void
}

const LanguageContext = createContext<LanguageContextValue | null>(null)

function initialLanguage(): string {
  const stored = window.localStorage.getItem(STORAGE_KEY)
  return stored && LANGUAGES.some((option) => option.value === stored) ? stored : DEFAULT_LANGUAGE
}

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<string>(initialLanguage)

  const setLanguage = useCallback((value: string) => {
    window.localStorage.setItem(STORAGE_KEY, value)
    setLanguageState(value)
  }, [])

  const value = useMemo(() => ({ language, setLanguage }), [language, setLanguage])
  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>
}

export function useLanguage(): LanguageContextValue {
  const context = useContext(LanguageContext)
  if (!context) {
    throw new Error('useLanguage debe usarse dentro de LanguageProvider')
  }
  return context
}
