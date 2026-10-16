import { useCallback } from 'react'
import { Link } from 'react-router-dom'
import { LibroCard } from '../components/LibroCard'
import { useAsync } from '../hooks/useAsync'
import { useLocalStorage } from '../hooks/useLocalStorage'
import { listarLibros } from '../services/librosApi'
import { listarTodas } from '../services/lecturasApi'
import type { EstadoLectura, FormatoLectura, Lectura, Libro } from '../types'
import { ESTADOS, ESTADO_LABEL, FORMATOS, FORMATO_LABEL } from '../types'

type FiltroFormato = 'TODOS' | FormatoLectura
type FiltroEstado = 'TODOS' | EstadoLectura

interface BibliotecaData {
  libros: Libro[]
  lecturas: Lectura[]
}

export default function Biblioteca() {
  const loader = useCallback(async (): Promise<BibliotecaData> => {
    const [libros, lecturas] = await Promise.all([listarLibros(), listarTodas()])
    return { libros, lecturas }
  }, [])
  const { data, loading, error, reload } = useAsync(loader)

  const [query, setQuery] = useLocalStorage('biblioteca.query', '')
  const [formato, setFormato] = useLocalStorage<FiltroFormato>('biblioteca.formato', 'TODOS')
  const [estado, setEstado] = useLocalStorage<FiltroEstado>('biblioteca.estado', 'TODOS')

  const libros = data?.libros ?? []
  const lecturas = data?.lecturas ?? []
  const lecturasDe = (libroId: string) => lecturas.filter((lectura) => lectura.libroId === libroId)

  const termino = query.trim().toLowerCase()
  const filtrados = libros.filter((libro) => {
    if (termino && !libro.titulo.toLowerCase().includes(termino) && !libro.autor.toLowerCase().includes(termino)) {
      return false
    }
    const suyas = lecturasDe(libro.id)
    if (formato !== 'TODOS' && !suyas.some((lectura) => lectura.formato === formato)) return false
    if (estado !== 'TODOS' && !suyas.some((lectura) => lectura.estado === estado)) return false
    return true
  })

  return (
    <section>
      <header className="page-header">
        <h1>Biblioteca</h1>
        <p className="muted">
          Una sola biblioteca para libros físicos y digitales. Filtrá por formato, estado o buscá por título y autor.
        </p>
      </header>

      <div className="biblioteca-toolbar">
        <input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Buscar por título o autor…"
          aria-label="Buscar en la biblioteca"
        />
        <Link className="button" to="/agregar">
          + Agregar libro
        </Link>
      </div>

      <div className="chips-row">
        <span className="chips-label">Formato:</span>
        <div className="genre-chips" role="group" aria-label="Filtrar por formato">
          <button
            type="button"
            className={`chip${formato === 'TODOS' ? ' chip-active' : ''}`}
            onClick={() => setFormato('TODOS')}
          >
            Todos
          </button>
          {FORMATOS.map((option) => (
            <button
              key={option}
              type="button"
              className={`chip${formato === option ? ' chip-active' : ''}`}
              onClick={() => setFormato(option)}
            >
              {FORMATO_LABEL[option]}
            </button>
          ))}
        </div>
      </div>

      <div className="chips-row">
        <span className="chips-label">Estado:</span>
        <div className="genre-chips" role="group" aria-label="Filtrar por estado">
          <button
            type="button"
            className={`chip${estado === 'TODOS' ? ' chip-active' : ''}`}
            onClick={() => setEstado('TODOS')}
          >
            Todos
          </button>
          {ESTADOS.map((option) => (
            <button
              key={option}
              type="button"
              className={`chip${estado === option ? ' chip-active' : ''}`}
              onClick={() => setEstado(option)}
            >
              {ESTADO_LABEL[option]}
            </button>
          ))}
        </div>
      </div>

      {loading && (
        <p className="muted placeholder">
          <span className="spinner" /> Cargando tu biblioteca…
        </p>
      )}
      {error && (
        <div className="alert">
          {error} <button type="button" className="link" onClick={reload}>Reintentar</button>
        </div>
      )}

      {!loading && !error && libros.length === 0 && (
        <div className="empty">
          <p>Tu biblioteca está vacía.</p>
          <Link className="button" to="/agregar">
            Agregar el primer libro
          </Link>
        </div>
      )}

      {!loading && !error && libros.length > 0 && filtrados.length === 0 && (
        <p className="muted placeholder">No hay libros que coincidan con la búsqueda o los filtros.</p>
      )}

      {filtrados.length > 0 && (
        <ul className="grid">
          {filtrados.map((libro) => (
            <LibroCard key={libro.id} libro={libro} lecturas={lecturasDe(libro.id)} />
          ))}
        </ul>
      )}
    </section>
  )
}