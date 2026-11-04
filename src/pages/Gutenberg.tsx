import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { buscarPaginaGutenberg, type GutenbergLibro } from '../services/gutenbergApi'
import { GutenbergReader } from '../readers/GutenbergReader'

function PortadaGutenberg({ src, titulo }: { src?: string; titulo: string }) {
  const [error, setError] = useState(false)
  if (!src || error) {
    return (
      <div role="img" aria-label={`Portada no disponible: ${titulo}`} style={{ height: 280, display: 'grid', placeItems: 'center', padding: 16, marginBottom: 8, borderRadius: 4, background: '#f1ede8', color: '#6b5c4f', textAlign: 'center' }}>
        {titulo}
      </div>
    )
  }
  return <img src={src} alt={`Portada de ${titulo}`} loading="lazy" onError={() => setError(true)} style={{ width: '100%', height: 280, objectFit: 'cover', borderRadius: 4, marginBottom: 8 }} />
}

export default function GutenbergPage() {
  const [libros, setLibros] = useState<GutenbergLibro[]>([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [idioma, setIdioma] = useState('es')
  const [busqueda, setBusqueda] = useState('')
  const [pagina, setPagina] = useState(1)
  const [haySiguiente, setHaySiguiente] = useState(false)
  const [libroSeleccionado, setLibroSeleccionado] = useState<GutenbergLibro | null>(null)

  useEffect(() => {
    let activo = true
    const temporizador = window.setTimeout(() => {
      setCargando(true)
      void buscarPaginaGutenberg(idioma, busqueda, pagina)
        .then((resultado) => {
          if (!activo) return
          setLibros(resultado.libros)
          setHaySiguiente(resultado.haySiguiente)
          setError(null)
        })
        .catch((err: unknown) => {
          if (!activo) return
          setError(err instanceof Error ? err.message : 'No se pudo cargar el catálogo de Gutenberg')
          setLibros([])
          setHaySiguiente(false)
        })
        .finally(() => {
          if (activo) setCargando(false)
        })
    }, busqueda ? 300 : 0)
    return () => {
      activo = false
      window.clearTimeout(temporizador)
    }
  }, [idioma, busqueda, pagina])

  function cambiarIdioma(nuevoIdioma: string) {
    setIdioma(nuevoIdioma)
    setPagina(1)
  }

  function cambiarBusqueda(nuevaBusqueda: string) {
    setBusqueda(nuevaBusqueda)
    setPagina(1)
  }

  return (
    <section style={{ padding: 20, maxWidth: 1000, margin: '0 auto' }}>
      <h1>Catálogo Gutenberg (Argentina)</h1>
      <p style={{ color: '#666', marginBottom: 20 }}>
        Libros en dominio público según la legislación argentina (vida del autor + 70 años).
      </p>

      <div style={{ display: 'flex', gap: 12, marginBottom: 24, flexWrap: 'wrap' }}>
        <input
          type="search"
          placeholder="Buscar por título o autor..."
          value={busqueda}
          onChange={(event) => cambiarBusqueda(event.target.value)}
          style={{ padding: 8, width: 300 }}
        />
        <select value={idioma} onChange={(event) => cambiarIdioma(event.target.value)} style={{ padding: 8 }}>
          <option value="es">Español</option>
          <option value="en">Inglés</option>
          <option value="fr">Francés</option>
        </select>
        <Link to="/biblioteca" style={{ marginLeft: 'auto', padding: 8, textDecoration: 'none', color: '#0066cc' }}>
          Volver a la biblioteca
        </Link>
      </div>

      {cargando && <p role="status">Cargando libros...</p>}
      {error && <p role="alert" style={{ color: '#c00' }}>{error}</p>}
      {!cargando && !error && libros.length === 0 && <p>No se encontraron libros con los filtros actuales.</p>}

      {!cargando && !error && libros.length > 0 && (
        <>
          <ul style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 20, listStyle: 'none', padding: 0, margin: 0 }}>
            {libros.map((libro) => (
              <li key={libro.id} style={{ border: '1px solid #ddd', borderRadius: 8, padding: 12, background: '#fff' }}>
                <PortadaGutenberg src={libro.portadaUrl} titulo={libro.titulo} />
                <h3 style={{ margin: '0 0 4px', fontSize: 16, color: '#333' }}>{libro.titulo}</h3>
                <p style={{ margin: '0 0 4px', fontSize: 14, color: '#666' }}>{libro.autores.map((autor) => autor.name).join(', ')}</p>
                <p style={{ margin: 0, fontSize: 12, color: '#999' }}>{libro.idioma.toUpperCase()} • {libro.fechaPublicacion ?? ''}</p>
                <button type="button" onClick={() => setLibroSeleccionado(libro)} style={{ marginTop: 8, padding: '6px 12px', background: '#0066cc', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer' }}>
                  Leer
                </button>
              </li>
            ))}
          </ul>
          <nav aria-label="Paginación del catálogo" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 16, margin: '24px 0' }}>
            <button type="button" onClick={() => setPagina((actual) => Math.max(1, actual - 1))} disabled={pagina === 1 || cargando}>Anterior</button>
            <span>Página {pagina}</span>
            <button type="button" onClick={() => setPagina((actual) => actual + 1)} disabled={!haySiguiente || cargando}>Siguiente</button>
          </nav>
        </>
      )}

      {libroSeleccionado && (
        <GutenbergReader libro={libroSeleccionado} onCerrar={() => setLibroSeleccionado(null)} />
      )}
    </section>
  )
}
