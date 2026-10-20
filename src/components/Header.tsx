import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../auth'
import { useTheme } from '../theme'

export function Header() {
  const { theme, toggleTheme } = useTheme()
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const night = theme === 'night'

  return (
    <header className="topbar">
      <NavLink to="/biblioteca" className="brand">
        <img className="brand-logo" src="/logo.svg" alt="" width={30} height={30} />
        Libros Tracker
      </NavLink>
      <nav className="nav">
        <NavLink to="/biblioteca">Biblioteca</NavLink>
        <NavLink to="/agregar">Agregar</NavLink>
        <NavLink to="/estadisticas">Estadísticas</NavLink>
      </nav>
      <div className="topbar-actions">
        {user ? (
          <div className="user">
            <span className="user-chip">{user.nombre}</span>
            <button
              type="button"
              className="theme-toggle"
              onClick={() => {
                logout()
                navigate('/login', { replace: true })
              }}
            >
              Salir
            </button>
          </div>
        ) : (
          <NavLink to="/login" className="theme-toggle">
            Iniciar sesión
          </NavLink>
        )}
        <button
          type="button"
          className="theme-toggle"
          onClick={toggleTheme}
          aria-label={night ? 'Activar tema claro' : 'Activar tema noche'}
          title={night ? 'Tema claro' : 'Tema noche'}
        >
          {night ? 'Día' : 'Noche'}
        </button>
      </div>
    </header>
  )
}
