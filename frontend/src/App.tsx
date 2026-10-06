import { type ReactNode } from 'react'
import {
  BrowserRouter,
  NavLink,
  Navigate,
  Route,
  Routes,
  useNavigate,
} from 'react-router-dom'
import { AuthProvider, useAuth } from './auth'
import Login from './pages/Login'
import Register from './pages/Register'
import Search from './pages/Search'
import Library from './pages/Library'

function RequireAuth({ children }: { children: ReactNode }) {
  const { user, ready } = useAuth()
  if (!ready) return <p className="muted placeholder">Cargando…</p>
  if (!user) return <Navigate to="/login" replace />
  return children
}

function GuestOnly({ children }: { children: ReactNode }) {
  const { user, ready } = useAuth()
  if (!ready) return <p className="muted placeholder">Cargando…</p>
  if (user) return <Navigate to="/buscar" replace />
  return children
}

function Header() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  return (
    <header className="topbar">
      <NavLink to="/buscar" className="brand">
        Libros Tracker
      </NavLink>
      {user && (
        <nav className="nav">
          <NavLink to="/buscar">Buscar</NavLink>
          <NavLink to="/biblioteca">Biblioteca</NavLink>
        </nav>
      )}
      {user && (
        <div className="user">
          <span className="muted">{user.username}</span>
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
    </header>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <div className="app">
          <Header />
          <main className="main">
            <Routes>
              <Route path="/" element={<Navigate to="/buscar" replace />} />
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
              <Route path="*" element={<Navigate to="/buscar" replace />} />
            </Routes>
          </main>
        </div>
      </BrowserRouter>
    </AuthProvider>
  )
}
