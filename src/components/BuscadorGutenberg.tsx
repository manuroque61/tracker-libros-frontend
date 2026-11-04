import { useEffect, useState } from 'react'
import { buscarPaginaGutenberg, type GutenbergLibro } from '../services/gutenbergApi'
import { BookCover } from './BookCover'

interface BuscadorGutenbergProps {
  onAgregar: (libro: GutenbergLibro) => Promise<void>
}

export function BuscadorGutenberg({ onAgregar }: BuscadorGutenbergProps) {
  const [idioma, setIdioma] = useState('es')
  const [busqueda, setBusqueda] = useState('')
  const [libros, setLibros] = useState<GutenbergLibro[]>([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [pagina, setPagina] = useState(1)
  const [haySiguiente, setHaySiguiente] = useState(false)
  const [agregandoId, setAgregandoId] = useState<string | null>(null)
  const [errorAgregar, setErrorAgregar] = useState<string | null>(null)

  useEffect(() => {
    let activo = true
    ;(async () => {
      try {
        setCargando(true)
        setError(null)
        const data = await buscarPaginaGutenberg(idioma, busqueda, pagina)
        if (!activo) return
        setLibros(data.libros)
        setHaySiguiente(data.haySiguiente)
      } catch (err: any) {
        if (!activo) return
        setError(err?.message ?? 'No se pudo cargar el catálogo de Project Gutenberg')
      } finally {
        if (activo) setCargando(false)
      }
    })()
    return () => { activo = false }
  }, [idioma, busqueda, pagina])

  async function agregar(libro: GutenbergLibro) {
    setAgregandoId(libro.id)
    setErrorAgregar(null)
    try {
      await onAgregar(libro)
    } catch (err) {
      setErrorAgregar(err instanceof Error ? err.message : 'No se pudo agregar el libro')
    } finally {
      setAgregandoId(null)
    }
  }

  return (
    <div className="gutenberg-buscador">
      <form
        className="gutenberg-toolbar"
        onSubmit={(event) => { event.preventDefault(); setPagina(1) }}
      >
        <input
          type="search"
          value={busqueda}
          onChange={(event) => { setBusqueda(event.target.value); setPagina(1) }}
          placeholder="Buscar por título, autor o tema…"
          aria-label="Buscar en Project Gutenberg"
        />
        <select value={idioma} onChange={(event) => { setIdioma(event.target.value); setPagina(1) }}>
          <option value="es">Español</option>
          <option value="en">Inglés</option>
          <option value="fr">Francés</option>
        </select>
        <button type="submit" className="button secondary">
          Buscar
        </button>
      </form>
      {error && <div className="alert">{error}</div>}
      {errorAgregar && <div className="alert">{errorAgregar}</div>}
      {cargando && (
        <p className="muted placeholder">
          <span className="spinner" /> Cargando catálogo de Project Gutenberg…
        </p>
      )}
      {!cargando && !error && (
        <>
          <p className="muted">
            {libros.length} libro(s) en esta página.
          </p>
          <ul className="gutenberg-grid">
            {libros.length === 0 && (
              <li style={{ gridColumn: '1 / -1', textAlign: 'center', color: 'var(--muted)' }}>
                No se encontraron libros con esos filtros.
              </li>
            )}
            {libros.map((libro) => (
              <li key={libro.id} className="gutenberg-card">
                <BookCover src={libro.portadaUrl} title={libro.titulo} />
                <div className="gutenberg-body">
                  <h3 className="gutenberg-titulo">{libro.titulo}</h3>
                  <p className="gutenberg-autor">
                    {libro.autores.map((a) => a.name).join(', ')}
                  </p>
                  {libro.fechaPublicacion && (
                    <p className="gutenberg-fecha">{libro.fechaPublicacion}</p>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => void agregar(libro)}
                  disabled={agregandoId !== null}
                  className="button secondary gutenberg-usar"
                >
                  {agregandoId === libro.id ? 'Agregando…' : 'Agregar a biblioteca'}
                </button>
              </li>
            ))}
          </ul>
          <nav aria-label="Paginación de resultados" className="gutenberg-toolbar">
            <button type="button" className="button secondary" onClick={() => setPagina((actual) => Math.max(1, actual - 1))} disabled={pagina === 1 || cargando}>Anterior</button>
            <span className="muted">Página {pagina}</span>
            <button type="button" className="button secondary" onClick={() => setPagina((actual) => actual + 1)} disabled={!haySiguiente || cargando}>Siguiente</button>
          </nav>
        </>
      )}
      <p className="hint">
        Project Gutenberg ofrece libros de dominio público. Al agregar uno, se guarda en tu biblioteca y podés abrirlo desde allí.
      </p>
    </div>
  )
}
