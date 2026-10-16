import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  api,
  ApiError,
  errorMessage,
  type Genre,
  type ReadingProgress,
  type Recommendation,
} from '../api'
import { BookCover } from '../components/BookCover'
import { LANGUAGES, useLanguage } from '../language'

const BATCH_SIZE = 4

function percentLabel(value?: number): number {
  if (typeof value !== 'number' || Number.isNaN(value)) return 0
  return Math.min(100, Math.max(0, Math.round(value)))
}

export default function Home() {
  const navigate = useNavigate()
  const { language, setLanguage } = useLanguage()

  const [continueReading, setContinueReading] = useState<ReadingProgress[] | null>(null)
  const [homeError, setHomeError] = useState<string | null>(null)

  const [recs, setRecs] = useState<Recommendation[]>([])
  const [recGenres, setRecGenres] = useState<Genre[]>([])
  const [recHasMore, setRecHasMore] = useState(false)
  const [recLoading, setRecLoading] = useState(true)
  const [recError, setRecError] = useState<string | null>(null)
  const genresRef = useRef<string[]>([])

  const [notice, setNotice] = useState<string | null>(null)
  const [imported, setImported] = useState<number[]>([])
  const [busyId, setBusyId] = useState<number | null>(null)

  useEffect(() => {
    let cancelled = false

    api
      .home()
      .then((data) => {
        if (!cancelled) setContinueReading(data.continueReading)
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setHomeError(errorMessage(err))
          setContinueReading([])
        }
      })

    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    let cancelled = false
    api
      .recommendations(0, BATCH_SIZE, [], language)
      .then((data) => {
        if (cancelled) return
        genresRef.current = data.genres.map((genre) => genre.slug)
        setRecGenres(data.genres)
        setRecs(data.items)
        setRecHasMore(data.hasMore)
      })
      .catch((err: unknown) => {
        if (!cancelled) setRecError(errorMessage(err))
      })
      .finally(() => {
        if (!cancelled) setRecLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [language])

  function changeLanguage(value: string) {
    if (value === language) return
    setRecLoading(true)
    setRecError(null)
    setRecs([])
    setRecGenres([])
    setRecHasMore(false)
    genresRef.current = []
    setLanguage(value)
  }

  const loadMore = useCallback(async () => {
    setRecLoading(true)
    setRecError(null)
    try {
      const data = await api.recommendations(recs.length, BATCH_SIZE, genresRef.current, language)
      setRecs((previous) => [...previous, ...data.items])
      setRecHasMore(data.hasMore)
    } catch (err) {
      setRecError(errorMessage(err))
    } finally {
      setRecLoading(false)
    }
  }, [recs.length, language])

  async function importBook(book: Recommendation) {
    setBusyId(book.externalId)
    setNotice(null)
    try {
      await api.importBook({
        externalId: book.externalId,
        title: book.title,
        authors: book.authors,
        language: book.language,
        coverUrl: book.coverUrl,
        description: book.sourceDescription ?? book.description,
        downloadCount: 0,
        epubAvailable: book.epubAvailable,
      })
      setImported((previous) => [...previous, book.externalId])
      setNotice('Libro guardado en tu biblioteca (Project Gutenberg, dominio público).')
    } catch (err) {
      const suffix =
        err instanceof ApiError && err.status === 502
          ? ' El servicio externo tardó demasiado: volvé a intentar.'
          : ''
      setRecError(errorMessage(err) + suffix)
    } finally {
      setBusyId(null)
    }
  }

  const genreLabel = recGenres.map((genre) => genre.label).join(' y ')
  const showContinue = continueReading !== null && continueReading.length > 0

  return (
    <section>
      <header className="page-header">
        <h1>Inicio</h1>
        <p className="muted">Retomá tus lecturas y descubrí títulos sugeridos para vos.</p>
      </header>

      {homeError && <div className="alert">{homeError}</div>}
      {notice && (
        <div className="alert success">
          {notice} <Link to="/biblioteca">Ir a la biblioteca</Link>
        </div>
      )}

      {showContinue && (
        <>
          <h2 className="home-heading">Continuar leyendo</h2>
          <ul className="grid">
            {continueReading.map((item) => {
              const percent = percentLabel(item.progressPercent)
              return (
                <li key={item.bookId} className="card">
                  <BookCover src={item.coverUrl} title={item.title} />
                  <div className="card-body">
                    <h2>{item.title}</h2>
                    <p className="authors">{item.authors.join(', ') || 'Autor desconocido'}</p>
                    <div className="reading-progress" aria-label={`${percent}% leído`}>
                      <div className="reading-progress-track">
                        <span style={{ width: `${percent}%` }} />
                      </div>
                      <span className="reading-progress-label">{percent}%</span>
                    </div>
                    <div className="card-actions">
                      <button
                        type="button"
                        disabled={!item.fileId}
                        onClick={() =>
                          item.fileId &&
                          navigate(`/leer/${item.bookId}/${item.fileId}`, { state: { title: item.title } })
                        }
                      >
                        Seguir leyendo
                      </button>
                    </div>
                  </div>
                </li>
              )
            })}
          </ul>
        </>
      )}

      <h2 className="home-heading">{showContinue ? 'Recomendados para vos' : 'Descubrí libros'}</h2>
      {genreLabel ? (
        <p className="muted">Tendencia en {genreLabel}.</p>
      ) : (
        <p className="muted">Sugerencias populares de Project Gutenberg.</p>
      )}

      <div className="chips-row">
        <span className="chips-label">Idioma:</span>
        <div className="genre-chips" role="group" aria-label="Idioma de las recomendaciones">
          {LANGUAGES.map((option) => (
            <button
              key={option.value}
              type="button"
              className={`chip${language === option.value ? ' chip-active' : ''}`}
              aria-pressed={language === option.value}
              onClick={() => changeLanguage(option.value)}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      {recError && <div className="alert">{recError}</div>}

      {recLoading && recs.length === 0 && (
        <p className="muted placeholder">
          <span className="spinner" /> Buscando recomendaciones…
        </p>
      )}

      {recs.length > 0 && (
        <>
          <ul className="grid grid-two">
            {recs.map((book) => {
              const isImported = imported.includes(book.externalId)
              return (
                <li key={book.externalId} className="card">
                  <BookCover src={book.coverUrl} title={book.title} />
                  <div className="card-body">
                    <h2>{book.title}</h2>
                    <p className="authors">{book.authors.join(', ') || 'Autor desconocido'}</p>
                    {book.description && <p className="description">{book.description}</p>}
                    <div className="card-actions">
                      {isImported ? (
                        <Link className="button secondary" to="/biblioteca">
                          En biblioteca ✓
                        </Link>
                      ) : (
                        <button
                          type="button"
                          onClick={() => void importBook(book)}
                          disabled={busyId === book.externalId || !book.epubAvailable}
                        >
                          {busyId === book.externalId
                            ? 'Guardando…'
                            : book.epubAvailable
                              ? 'Importar EPUB'
                              : 'Sin EPUB'}
                        </button>
                      )}
                    </div>
                  </div>
                </li>
              )
            })}
          </ul>

          {recHasMore && (
            <div className="load-more">
              <button type="button" onClick={() => void loadMore()} disabled={recLoading}>
                {recLoading ? 'Cargando siguiente tanda…' : 'Cargar más'}
              </button>
            </div>
          )}

          {!recHasMore && recs.length > 0 && (
            <p className="muted placeholder">No hay más recomendaciones por ahora.</p>
          )}
        </>
      )}

      {!recLoading && recs.length === 0 && !recError && (
        <p className="muted placeholder">
          No pudimos traer recomendaciones en este momento. Probá más tarde o{' '}
          <Link to="/buscar">buscá un libro</Link>.
        </p>
      )}
    </section>
  )
}
