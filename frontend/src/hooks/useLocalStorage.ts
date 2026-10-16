import { useCallback, useState } from 'react'
import { readStore, writeStore } from '../services/storage'

/** Estado persistido en localStorage bajo el prefijo de la app. */
export function useLocalStorage<T>(key: string, initial: T) {
  const [value, setValue] = useState<T>(() => readStore<T>(key, initial))

  const update = useCallback(
    (next: T | ((previous: T) => T)) => {
      setValue((previous) => {
        const resolved = typeof next === 'function' ? (next as (p: T) => T)(previous) : next
        writeStore(key, resolved)
        return resolved
      })
    },
    [key],
  )

  return [value, update] as const
}
