import { useCallback, useEffect, useState } from 'react'
import { errorMessage } from '../services/apiClient'

interface AsyncState<T> {
  data: T | null
  loading: boolean
  error: string | null
}

/**
 * Ejecuta una carga asíncrona y expone estado (loading/error/data) + reload().
 * `loader` debe ser estable (useCallback) para evitar bucles.
 */
export function useAsync<T>(loader: () => Promise<T>) {
  const [state, setState] = useState<AsyncState<T>>({ data: null, loading: true, error: null })
  const [nonce, setNonce] = useState(0)

  const reload = useCallback(() => setNonce((n) => n + 1), [])

  useEffect(() => {
    let cancelled = false
    setState((previous) => ({ ...previous, loading: true, error: null }))
    loader()
      .then((data) => {
        if (!cancelled) setState({ data, loading: false, error: null })
      })
      .catch((error: unknown) => {
        if (!cancelled) setState({ data: null, loading: false, error: errorMessage(error) })
      })
    return () => {
      cancelled = true
    }
  }, [loader, nonce])

  return { ...state, reload }
}
