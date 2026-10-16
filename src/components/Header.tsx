import { NavLink } from 'react-router-dom'
import { useTheme } from '../theme'

export function Header() {
  const { theme, toggleTheme } = useTheme()
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
