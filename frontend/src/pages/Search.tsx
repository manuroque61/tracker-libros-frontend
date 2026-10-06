import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { api, ApiError, errorMessage, type BookSearchResult } from '../api'
import { BookCover } from '../components/BookCover'

export default function Search() {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<BookSearchResult[] | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [imported, setImported] = useState<number[]>([])
  const [busyId, setBusyId] = useState<number | null>(null)

  const trimmedQuery = query.trim()
  const tooShort = trimmedQuery.length > 0 && trimmedQuery.length < 3

  async function onSubmit(event: FormEvent) {
    event.preventDefault()
    if (!trimmedQuery || trimmedQuery.length < 3) return

    setLoading(true)
    setError(null)
    setNotice(null)
    try {
      setResults(await api.search(trimmedQuery))
    } catch (err) {
      const suffix =
        err instanceof ApiError && err.status === 502
          ? ' El servicio de búsqueda tardó demasiado: probá con un título o autor más específico (ej. Austen, Verne) y volvé a intentar.'
          : ''
      setError(errorMessage(err) + suffix)
      setResults([])
    } finally {
      setLoading(false)
    }
  }

  async function importBook(book: BookSearchResult) {
    setBusyId(book.externalId)
    setError(null)
    setNotice(null)
    try {
      await api.importBook(book)
      setImported((previous) => [...previous, book.externalId])
      setNotice('Libro guardado en tu biblioteca (Project Gutenberg, dominio público).')
    } catch (err) {
      const suffix =
        err instanceof ApiError && err.status === 502
          ? ' El servicio externo tardó demasiado: volvé a intentar.'
          : ''
      setError(errorMessage(err) + suffix)
    } finally {
      setBusyId(null)
    }
  }

  return (
    <section>
      <header className="page-header">
        <h1>Buscar libros libres</h1>
        <p className="muted">
          Resultados de Project Gutenberg: dominio público y descargas en EPUB, sin costo.
        </p>
      </header>

      <form onSubmit={onSubmit} className="search-form">
        <input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Título, autor o tema… por ejemplo: Austen"
          aria-label="Buscar libros"
          minLength={3}
        />
        <button type="submit" disabled={loading || !trimmedQuery || trimmedQuery.length < 3}>
          {loading ? 'Buscando…' : 'Buscar'}
        </button>
      </form>
      <p className="hint search-hint">
        Escribí al menos 3 caracteres. Los términos muy cortos (ej. "hi") saturan la búsqueda;
        usá un título o autor completo.
      </p>
      {tooShort && (
        <p className="hint search-hint">
          El término debe tener al menos 3 caracteres para buscar.
        </p>
      )}

      {error && <div className="alert">{error}</div>}
      {notice && (
        <div className="alert success">
          {notice} <Link to="/biblioteca">Ir a la biblioteca</Link>
        </div>
      )}

      {loading && (
        <p className="muted placeholder">
          <span className="spinner" /> Buscando en Project Gutenberg…
        </p>
      )}

      {results !== null && results.length === 0 && !loading && (
        <p className="muted">Sin resultados para esa búsqueda.</p>
      )}

      {results !== null && results.length > 0 && (
        <ul className="grid">
          {results.map((book) => {
            const isImported = imported.includes(book.externalId)
            return (
              <li key={book.externalId} className="card">
                <BookCover src={book.coverUrl} title={book.title} />
                <div className="card-body">
                  <h2>{book.title}</h2>
                  <p className="authors">{book.authors.join(', ') || 'Autor desconocido'}</p>
                  <p className="meta">
                    {book.language && <span>{book.language.toUpperCase()}</span>}
                    <span>{book.downloadCount.toLocaleString('es')} descargas</span>
                  </p>
                  <div className="card-actions">
                    {isImported ? (
                      <Link className="button secondary" to="/biblioteca">
                        En biblioteca ✓
                      </Link>
                    ) : book.epubAvailable ? (
                      <button
                        type="button"
                        onClick={() => void importBook(book)}
                        disabled={busyId === book.externalId}
                      >
                        {busyId === book.externalId ? 'Guardando…' : 'Importar EPUB'}
                      </button>
                    ) : (
                      <button type="button" disabled>
                        Sin EPUB
                      </button>
                    )}
                  </div>
                </div>
              </li>
            )
          })}
        </ul>
      )}

      {results === null && !loading && (
        <p className="muted placeholder">Escribí un título o autor para empezar a buscar.</p>
      )}
    </section>
  )
}
