import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import type { Libro, VersionGutenberg } from '../types'
import { buscarPaginaGutenberg, type GutenbergLibro } from '../services/gutenbergApi'
import { vincularVersionGutenberg } from '../services/librosApi'

interface Props {
  libro: Libro
  onActualizar: () => void
}

function versionesDelLibro(libro: Libro): VersionGutenberg[] {
  const versiones = [...(libro.versionesGutenberg ?? [])]
  if (libro.gutenbergId && !versiones.some((version) => version.id === libro.gutenbergId)) {
    versiones.unshift({
      id: libro.gutenbergId,
      titulo: libro.titulo,
      autor: libro.autor,
      idioma: libro.idiomaGutenberg ?? 'es',
      urlEpub: libro.gutenbergUrlEpub,
      urlHtml: libro.gutenbergUrlHtml,
    })
  }
  return versiones
}

export function VersionesLibro({ libro, onActualizar }: Props) {
  const [idioma, setIdioma] = useState('es')
  const [consulta, setConsulta] = useState(`${libro.titulo} ${libro.autor}`.trim())
  const [pagina, setPagina] = useState(1)
  const [resultados, setResultados] = useState<GutenbergLibro[]>([])
  const [haySiguiente, setHaySiguiente] = useState(false)
  const [buscando, setBuscando] = useState(false)
  const [vinculandoId, setVinculandoId] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [aviso, setAviso] = useState('')
  const versiones = versionesDelLibro(libro)

  async function buscar(event?: FormEvent, paginaBusqueda = pagina) {
    event?.preventDefault()
    setBuscando(true)
    setError('')
    setAviso('')
    try {
      const resultado = await buscarPaginaGutenberg(idioma, consulta, paginaBusqueda)
      setPagina(paginaBusqueda)
      setResultados(resultado.libros)
      setHaySiguiente(resultado.haySiguiente)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudieron buscar versiones en Gutenberg.')
      setResultados([])
      setHaySiguiente(false)
    } finally {
      setBuscando(false)
    }
  }

  async function vincular(version: GutenbergLibro) {
    setVinculandoId(version.id)
    setError('')
    setAviso('')
    try {
      await vincularVersionGutenberg(libro.id, version)
      setAviso(`Versión de Gutenberg vinculada: ${version.titulo} (${version.idioma}).`)
      onActualizar()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo vincular esta versión.')
    } finally {
      setVinculandoId(null)
    }
  }

  return <section className="card book-versions">
    <h2 className="home-heading">Versiones y formatos disponibles</h2>
    <p className="muted">La ficha y portada de Open Library se conservan. Vincula las ediciones de Gutenberg que quieras leer.</p>

    {libro.openLibraryId && <article className="book-version open-library-version">
      <div>
        <strong>Open Library</strong>
        <p>{libro.openLibraryIdiomas?.length ? `Idiomas: ${libro.openLibraryIdiomas.join(', ')}` : 'Edición de catálogo'}</p>
        {libro.isbn && <small>ISBN {libro.isbn}</small>}
        {(libro.openLibraryEdiciones?.length ?? 0) > 0 && <div className="open-library-editions" aria-label="Ediciones de Open Library">
          <small>Ediciones de catálogo:</small>
          {libro.openLibraryEdiciones?.slice(0, 8).map((edicion, index) => <a key={edicion} href={`https://openlibrary.org/books/${encodeURIComponent(edicion)}`} target="_blank" rel="noreferrer">
            {libro.openLibraryIdiomas?.[index]?.toUpperCase() ?? 'Edición'} · {edicion}
          </a>)}
          {(libro.openLibraryEdiciones?.length ?? 0) > 8 && <small>y {libro.openLibraryEdiciones!.length - 8} más</small>}
        </div>}
      </div>
      <div className="book-version-actions">
        {libro.openLibraryReadUrl && <Link className="button secondary" to={`/leer/${libro.id}`}>Leer en Open Library</Link>}
        {libro.openLibraryBorrowUrl && <a className="button secondary" href={libro.openLibraryBorrowUrl} target="_blank" rel="noreferrer">Solicitar préstamo</a>}
        {libro.openLibraryId && <a className="text-button" href={`https://openlibrary.org${libro.openLibraryId}`} target="_blank" rel="noreferrer">Ver catálogo</a>}
      </div>
    </article>}

    {versiones.length > 0 && <div className="book-version-list">
      {versiones.map((version) => <article className="book-version gutenberg-version" key={version.id}>
        <div>
          <strong>Project Gutenberg · {version.idioma.toUpperCase()}</strong>
          <p>{version.titulo}</p>
          {version.autor && <small>{version.autor}</small>}
          <small>{version.urlEpub ? 'EPUB disponible en catálogo' : 'EPUB por comprobar al abrir'}</small>
        </div>
        <div className="book-version-actions">
          <Link className="button" to={`/leer/${libro.id}?gutenbergId=${encodeURIComponent(version.id)}`}>Leer esta versión</Link>
          <a
            className="button secondary"
            href={`/api/gutenberg/epub/${encodeURIComponent(version.id)}`}
            download={`gutenberg-${version.id}.epub`}
          >Descargar EPUB</a>
        </div>
      </article>)}
    </div>}

    <details className="version-search">
      <summary>Buscar y vincular otra versión de Gutenberg</summary>
      <form className="community-form" onSubmit={(event) => void buscar(event, 1)}>
        <label>Buscar por título o autor
          <input value={consulta} onChange={(event) => setConsulta(event.target.value)} maxLength={200} required />
        </label>
        <label>Idioma
          <select value={idioma} onChange={(event) => setIdioma(event.target.value)}>
            <option value="es">Español</option>
            <option value="en">Inglés</option>
            <option value="fr">Francés</option>
            <option value="pt">Portugués</option>
            <option value="de">Alemán</option>
            <option value="it">Italiano</option>
          </select>
        </label>
        <button type="submit" className="button secondary" disabled={buscando}>{buscando ? 'Buscando…' : 'Buscar versiones'}</button>
      </form>
      {error && <p className="error-message" role="alert">{error}</p>}
      {aviso && <p className="success-message" role="status">{aviso}</p>}
      {buscando && <p className="muted">Buscando en el catálogo…</p>}
      {!buscando && resultados.length === 0 && aviso === '' && <p className="muted">Busca por título y autor; puedes cambiar el idioma para encontrar traducciones.</p>}
      {resultados.map((resultado) => {
        const yaVinculada = versiones.some((version) => version.id === resultado.id)
        return <article className="book-version search-version" key={resultado.id}>
          <div><strong>{resultado.titulo}</strong><small>{resultado.autores.map((autor) => autor.name).join(', ') || 'Autor no indicado'} · {resultado.idioma.toUpperCase()}</small></div>
          <button type="button" className="button secondary" disabled={yaVinculada || vinculandoId === resultado.id} onClick={() => void vincular(resultado)}>
            {yaVinculada ? 'Ya vinculada' : vinculandoId === resultado.id ? 'Vinculando…' : 'Vincular versión'}
          </button>
        </article>
      })}
      {(pagina > 1 || haySiguiente) && <nav className="version-pagination" aria-label="Páginas de versiones Gutenberg">
        <button type="button" className="button secondary" disabled={pagina <= 1 || buscando} onClick={() => void buscar(undefined, Math.max(1, pagina - 1))}>Anterior</button>
        <span>Página {pagina}</span>
        <button type="button" className="button secondary" disabled={!haySiguiente || buscando} onClick={() => void buscar(undefined, pagina + 1)}>Siguiente</button>
      </nav>}
    </details>
  </section>
}
