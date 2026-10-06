import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { api, errorMessage, type BookDetail, type BookFileInfo } from '../api'
import { BookCover } from '../components/BookCover'

function formatSize(bytes: number): string {
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  return `${Math.max(1, Math.round(bytes / 1024))} KB`
}

export default function Library() {
  const navigate = useNavigate()
  const [books, setBooks] = useState<BookDetail[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [downloading, setDownloading] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    api
      .library()
      .then((items) => {
        if (!cancelled) setBooks(items)
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(errorMessage(err))
      })
    return () => {
      cancelled = true
    }
  }, [])

  async function download(book: BookDetail, file: BookFileInfo) {
    setDownloading(file.id)
    setError(null)
    try {
      await api.download(book.id, file)
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setDownloading(null)
    }
  }

  return (
    <section>
      <header className="page-header">
        <h1>Mi biblioteca</h1>
        <p className="muted">Libros importados desde Project Gutenberg.</p>
        {books !== null && books.length > 0 && (
          <p className="stats">
            <span>
              <strong>{books.length}</strong> {books.length === 1 ? 'libro' : 'libros'}
            </span>
            <span>
              <strong>{books.reduce((count, book) => count + book.files.length, 0)}</strong> archivos
            </span>
          </p>
        )}
      </header>

      {error && <div className="alert">{error}</div>}

      {books === null && !error && (
        <p className="muted placeholder">
          <span className="spinner" /> Cargando tu biblioteca…
        </p>
      )}

      {books !== null && books.length === 0 && (
        <div className="empty">
          <p>Todavía no guardaste ningún libro.</p>
          <Link className="button" to="/buscar">
            Buscar libros libres
          </Link>
        </div>
      )}

      {books !== null && books.length > 0 && (
        <ul className="grid">
          {books.map((book) => (
            <li key={book.id} className="card">
              <BookCover src={book.coverUrl} title={book.title} />
              <div className="card-body">
                <h2>{book.title}</h2>
                <p className="authors">{book.authors.join(', ') || 'Autor desconocido'}</p>
                {book.description && <p className="description">{book.description}</p>}
                <ul className="files">
                  {book.files.map((file) => (
                    <li key={file.id}>
                      <span className="file-kind">{file.kind}</span>
                      <span className="muted">{formatSize(file.size)}</span>
                      <span className="files-actions">
                        {file.kind === 'EPUB' && (
                          <button
                            type="button"
                            className="secondary"
                            onClick={() =>
                              navigate(`/leer/${book.id}/${file.id}`, { state: { title: book.title } })
                            }
                          >
                            Leer
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => void download(book, file)}
                          disabled={downloading === file.id}
                        >
                          {downloading === file.id ? 'Bajando…' : 'Descargar'}
                        </button>
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
