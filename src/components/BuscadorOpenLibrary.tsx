import { useState } from 'react'
import { BookCover } from './BookCover'
import { GutenbergHtmlReader } from '../readers/GutenbergHtmlReader'
import { buscarOpenLibrary, OPEN_LIBRARY_POR_PAGINA, type LibroOpenLibrary } from '../services/openLibraryApi'

interface BuscadorOpenLibraryProps {
  onAgregar: (libro: LibroOpenLibrary) => Promise<void>
}

export function BuscadorOpenLibrary({ onAgregar }: BuscadorOpenLibraryProps) {
  const [consulta, setConsulta] = useState('')
  const [soloPrestables, setSoloPrestables] = useState(false)
  const [pagina, setPagina] = useState(1)
  const [libros, setLibros] = useState<LibroOpenLibrary[]>([])
  const [total, setTotal] = useState(0)
  const [cargando, setCargando] = useState(false)
  const [busquedaHecha, setBusquedaHecha] = useState(false)
  const [agregandoId, setAgregandoId] = useState<string | null>(null)
  const [leyendo, setLeyendo] = useState<LibroOpenLibrary | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function buscar(nuevaPagina = 1, filtrarPrestables = soloPrestables) {
    if (consulta.trim().length < 2) {
      setError('Escribí al menos dos caracteres para buscar.')
      return
    }
    setCargando(true)
    setBusquedaHecha(true)
    setError(null)
    try {
      const resultado = await buscarOpenLibrary(consulta, nuevaPagina, filtrarPrestables)
      setLibros(resultado.libros)
      setTotal(resultado.total)
      setPagina(nuevaPagina)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo buscar en Open Library.')
      setLibros([])
      setTotal(0)
    } finally {
      setCargando(false)
    }
  }

  async function agregar(libro: LibroOpenLibrary) {
    setAgregandoId(libro.id)
    setError(null)
    try {
      await onAgregar(libro)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo agregar el libro.')
    } finally {
      setAgregandoId(null)
    }
  }

  const paginas = Math.ceil(total / OPEN_LIBRARY_POR_PAGINA)

  return (
    <div className="gutenberg-buscador">
      <form className="gutenberg-toolbar" onSubmit={(event) => { event.preventDefault(); void buscar(1) }}>
        <input
          type="search"
          value={consulta}
          onChange={(event) => { setConsulta(event.target.value); setLibros([]); setTotal(0); setBusquedaHecha(false) }}
          placeholder="Buscar por título o autor"
          aria-label="Buscar libros por título o autor en Open Library"
        />
        <button type="submit" className="button secondary" disabled={cargando}>
          {cargando ? 'Buscando…' : 'Buscar'}
        </button>
        <label className="open-library-loan-filter">
          <input type="checkbox" checked={soloPrestables} onChange={(event) => { setSoloPrestables(event.target.checked); if (consulta.trim().length >= 2) void buscar(1, event.target.checked) }} />
          Solo disponibles para préstamo
        </label>
      </form>

      {error && <div className="alert" role="alert">{error}</div>}
      {!cargando && total > 0 && <p className="muted">Se encontraron {total.toLocaleString('es-AR')} resultados.</p>}
      {cargando && <p className="muted placeholder" role="status">Buscando en Open Library…</p>}
      {!cargando && busquedaHecha && libros.length === 0 && !error && (
        <p className="muted">{soloPrestables ? 'No se encontraron préstamos disponibles para esta búsqueda.' : 'No se encontraron libros con esa búsqueda.'}</p>
      )}

      {libros.length > 0 && (
        <>
          <ul className="gutenberg-grid">
            {libros.map((libro) => (
              <li key={libro.id} className="gutenberg-card">
                <BookCover src={libro.portadaUrl} title={libro.titulo} />
                <div className="gutenberg-body">
                  <h3 className="gutenberg-titulo">{libro.titulo}</h3>
                  <p className="gutenberg-autor">{libro.autores.join(', ') || 'Autor desconocido'}</p>
                  {libro.anioPublicacion && <p className="gutenberg-fecha">{libro.anioPublicacion}</p>}
                </div>
                {libro.urlLectura && (
                  <button type="button" className="button secondary gutenberg-usar" onClick={() => setLeyendo(libro)}>
                    Leer en línea
                  </button>
                )}
                {libro.urlPrestamo && (
                  <a className="button secondary gutenberg-usar" href={libro.urlPrestamo} target="_blank" rel="noreferrer">
                    Pedir prestado
                  </a>
                )}
                {!libro.urlLectura && !libro.urlPrestamo && (
                  <a className="link" href={libro.urlCatalogo} target="_blank" rel="noreferrer">
                    Ver opciones de lectura
                  </a>
                )}
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
          {leyendo && (
            <section className="reader-shell" style={{ height: '70vh', marginTop: 20 }}>
              <div className="reader-bar">
                <span className="reader-title">{leyendo.titulo}</span>
                <button type="button" className="btn-square" onClick={() => setLeyendo(null)} aria-label="Cerrar lector">
                  ×
                </button>
              </div>
              <GutenbergHtmlReader src={leyendo.urlLectura!} title={`Leer ${leyendo.titulo} en Open Library`} />
            </section>
          )}
          <nav aria-label="Paginación de resultados de Open Library" className="gutenberg-toolbar">
            <button
              type="button"
              className="button secondary"
              onClick={() => void buscar(pagina - 1)}
              disabled={pagina <= 1 || cargando}
            >
              Anterior
            </button>
            <span className="muted">Página {pagina} de {paginas}</span>
            <button
              type="button"
              className="button secondary"
              onClick={() => void buscar(pagina + 1)}
              disabled={pagina >= paginas || cargando}
            >
              Siguiente
            </button>
          </nav>
        </>
      )}
      <p className="hint">Open Library es un catálogo bibliográfico. Estos resultados completan los datos del libro; no implican que haya una versión digital disponible para leer.</p>
    </div>
  )
}
