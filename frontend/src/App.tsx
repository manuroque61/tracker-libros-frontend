import { lazy, Suspense, type ReactNode } from 'react'
import {
  BrowserRouter,
  NavLink,
  Navigate,
  Route,
  Routes,
  useNavigate,
} from 'react-router-dom'
import { AuthProvider, useAuth } from './auth'
import { LanguageProvider } from './language'
import { ThemeProvider, useTheme } from './theme'
import Login from './pages/Login'
import Register from './pages/Register'
import Search from './pages/Search'
import Library from './pages/Library'
import Home from './pages/Home'

const Reader = lazy(() => import('./pages/Reader'))

function RequireAuth({ children }: { children: ReactNode }) {
  const { user, ready } = useAuth()
  if (!ready) return <p className="muted placeholder">Cargando…</p>
  if (!user) return <Navigate to="/login" replace />
  return children
}

function GuestOnly({ children }: { children: ReactNode }) {
  const { user, ready } = useAuth()
  if (!ready) return <p className="muted placeholder">Cargando…</p>
  if (user) return <Navigate to="/inicio" replace />
  return children
}

function ThemeToggle() {
  const { theme, toggleTheme } = useTheme()
  const night = theme === 'night'
  return (
    <button
      type="button"
      className="theme-toggle"
      onClick={toggleTheme}
      aria-label={night ? 'Activar tema claro' : 'Activar tema noche'}
      title={night ? 'Tema claro' : 'Tema noche'}
    >
      {night ? 'Día' : 'Noche'}
    </button>
  )
}

function Header() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  return (
    <header className="topbar">
      <NavLink to="/buscar" className="brand">
        <img className="brand-logo" src="/logo.svg" alt="" width={30} height={30} />
        Libros Tracker
      </NavLink>
      {user && (
        <nav className="nav">
          <NavLink to="/inicio">Inicio</NavLink>
          <NavLink to="/buscar">Buscar</NavLink>
          <NavLink to="/biblioteca">Biblioteca</NavLink>
        </nav>
      )}
      <div className="topbar-actions">
        <ThemeToggle />
        {user && (
          <div className="user">
            <span className="user-chip">{user.username}</span>
            <button
              type="button"
              className="link"
              onClick={() => {
                logout()
                navigate('/login', { replace: true })
              }}
            >
              Salir
            </button>
          </div>
        )}
      </div>
    </header>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <ThemeProvider>
        <LanguageProvider>
          <BrowserRouter>
            <div className="app">
              <Header />
              <main className="main">
                <Routes>
                  <Route path="/" element={<Navigate to="/inicio" replace />} />
                  <Route
                    path="/inicio"
                    element={
                      <RequireAuth>
                        <Home />
                      </RequireAuth>
                    }
                  />
                  <Route
                    path="/login"
                    element={
                      <GuestOnly>
                        <Login />
                      </GuestOnly>
                    }
                  />
                  <Route
                    path="/register"
                    element={
                      <GuestOnly>
                        <Register />
                      </GuestOnly>
                    }
                  />
                  <Route
                    path="/buscar"
                    element={
                      <RequireAuth>
                        <Search />
                      </RequireAuth>
                    }
                  />
                  <Route
                    path="/biblioteca"
                    element={
                      <RequireAuth>
                        <Library />
                      </RequireAuth>
                    }
                  />
                  <Route
                    path="/leer/:bookId/:fileId"
                    element={
                      <RequireAuth>
                        <Suspense fallback={<p className="muted placeholder">Cargando…</p>}>
                          <Reader />
                        </Suspense>
                      </RequireAuth>
                    }
                  />
                  <Route path="*" element={<Navigate to="/inicio" replace />} />
                </Routes>
              </main>
            </div>
          </BrowserRouter>
        </LanguageProvider>
      </ThemeProvider>
    </AuthProvider>
  )
}
