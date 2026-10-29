import { useEffect, useState } from 'react'
import type { LibroExterno } from '../types'
import { listarLibrosGutenberg, type GutenbergLibro } from '../services/gutenbergApi'
import { BookCover } from './BookCover'

interface BuscadorGutenbergProps {
  onResultado: (externo: LibroExterno) => void
}

export function BuscadorGutenberg({ onResultado }: BuscadorGutenbergProps) {
  const [idioma, setIdioma] = useState('es')
  const [busqueda, setBusqueda] = useState('')
  const [libros, setLibros] = useState<GutenbergLibro[]>([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let activo = true
    ;(async () => {
      try {
        setCargando(true)
        setError(null)
        const data = await listarLibrosGutenberg(idioma)
        if (!activo) return
        setLibros(data)
      } catch (err: any) {
        if (!activo) return
        setError(err?.message ?? 'No se pudo cargar el catálogo de Project Gutenberg')
      } finally {
        if (activo) setCargando(false)
      }
    })()
    return () => { activo = false }
  }, [idioma])

  const filtrados = libros.filter((libro) => {
    const texto = `${libro.titulo} ${libro.autores.map((a) => a.name).join(' ')} ${libro.temas?.join(' ') ?? ''}`.toLowerCase()
    return texto.includes(busqueda.trim().toLowerCase())
  })

  function seleccionar(libro: GutenbergLibro) {
    const externo: LibroExterno = {
      isbn: libro.isbn ?? '',
      titulo: libro.titulo,
      autor: libro.autores.map((a) => a.name).join(', '),
      genero: (libro.temas ?? []).join(', ') || undefined,
      descripcion: libro.descripcion ?? undefined,
      cantidadPaginas: undefined,
      editorial: undefined,
      fechaPublicacion: libro.fechaPublicacion ?? undefined,
      portadaUrl: libro.portadaUrl ?? undefined,
    }
    onResultado(externo)
  }

  return (
    <div className="gutenberg-buscador">
      <form
        className="gutenberg-toolbar"
        onSubmit={(event) => event.preventDefault()}
      >
        <input
          type="search"
          value={busqueda}
          onChange={(event) => setBusqueda(event.target.value)}
          placeholder="Buscar por título, autor o tema…"
          aria-label="Buscar en Project Gutenberg"
        />
        <select value={idioma} onChange={(event) => setIdioma(event.target.value)}>
          <option value="es">Español</option>
          <option value="en">Inglés</option>
          <option value="fr">Francés</option>
        </select>
        <button type="submit" className="button secondary">
          Buscar
        </button>
      </form>
      {error && <div className="alert">{error}</div>}
      {cargando && (
        <p className="muted placeholder">
          <span className="spinner" /> Cargando catálogo de Project Gutenberg…
        </p>
      )}
      {!cargando && !error && (
        <>
          <p className="muted">
            {filtrados.length} libro(s) de dominio público encontrados.
          </p>
          <ul className="gutenberg-grid">
            {filtrados.length === 0 && (
              <li style={{ gridColumn: '1 / -1', textAlign: 'center', color: 'var(--muted)' }}>
                No se encontraron libros con esos filtros.
              </li>
            )}
            {filtrados.map((libro) => (
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
                  onClick={() => seleccionar(libro)}
                  className="button secondary gutenberg-usar"
                >
                  Usar este libro
                </button>
              </li>
            ))}
          </ul>
        </>
      )}
      <p className="hint">
        Project Gutenberg ofrece libros de dominio público. Al seleccionar uno se prellenan los datos en el formulario; podés editarlos antes de guardar.
      </p>
    </div>
  )
}
