import {
  Fragment,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import * as authApi from './services/authApi'
import { getToken, setToken } from './services/authToken'
import { setStorageProfile } from './services/storage'
import type { Usuario } from './types'

interface AuthContextValue {
  user: Usuario | null
  ready: boolean
  login: (email: string, password: string) => Promise<void>
  register: (nombre: string, email: string, password: string) => Promise<void>
  logout: () => void
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<Usuario | null>(null)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    let cancelled = false

    async function loadUser() {
      if (!getToken()) {
        setStorageProfile(null)
        if (!cancelled) setReady(true)
        return
      }
      try {
        const current = await authApi.me()
        if (!cancelled) {
          setStorageProfile(current.id)
          setUser(current)
        }
      } catch {
        setToken(null)
        if (!cancelled) {
          setStorageProfile(null)
          setUser(null)
        }
      } finally {
        if (!cancelled) setReady(true)
      }
    }

    void loadUser()
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    const onUnauthorized = () => {
      setStorageProfile(null)
      setUser(null)
    }
    window.addEventListener('libros:unauthorized', onUnauthorized)
    return () => window.removeEventListener('libros:unauthorized', onUnauthorized)
  }, [])

  const login = useCallback(async (email: string, password: string) => {
    const response = await authApi.login(email, password)
    setToken(response.accessToken)
    setStorageProfile(response.usuario.id)
    setUser(response.usuario)
  }, [])

  const register = useCallback(async (nombre: string, email: string, password: string) => {
    const response = await authApi.register(nombre, email, password)
    setToken(response.accessToken)
    setStorageProfile(response.usuario.id)
    setUser(response.usuario)
  }, [])

  const logout = useCallback(() => {
    setToken(null)
    setStorageProfile(null)
    setUser(null)
  }, [])

  const value = useMemo(
    () => ({ user, ready, login, register, logout }),
    [user, ready, login, register, logout],
  )

  return (
    <AuthContext.Provider value={value}>
      {ready ? (
        <Fragment key={user ? `usuario-${user.id}` : 'invitado'}>{children}</Fragment>
      ) : (
        <p className="muted placeholder">Verificando sesión...</p>
      )}
    </AuthContext.Provider>
  )
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth debe usarse dentro de AuthProvider')
  }
  return context
}
