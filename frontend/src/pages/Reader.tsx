import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, useLocation, useParams } from 'react-router-dom'
import ePub from 'epubjs'
import type { Book, NavItem } from 'epubjs'
import type { Location as RenditionLocation } from 'epubjs'
import { api, errorMessage } from '../api'
import { useTheme } from '../theme'

type Rendition = Book['rendition']
type ReadingMode = 'paginated' | 'scrolled'

// CSS del contenido del libro. Se inyecta con `addStylesheetCss` (que reemplaza
// el nodo <style>), así el cambio de tema se aplica al instante mientras se lee.
const READER_THEMES: Record<string, string> = {
  light: `
    html, body { background: #ffffff !important; }
    body { color: #26221d !important; }
    a { color: #6f3a1f !important; }
    ::selection { background: #f3e7de; }
  `,
  night: `
    html, body { background: #14110d !important; }
    body { color: #ece1cd !important; }
    a { color: #f0b878 !important; }
    ::selection { background: #5a4326; }
  `,
}

function applyReaderTheme(rendition: Rendition, theme: string) {
  const css = READER_THEMES[theme] ?? READER_THEMES.light
  const contents = rendition.getContents() as unknown as ReaderContent[]
  contents.forEach((content) => content.addStylesheetCss(css, 'reader-theme'))
}

interface ReaderContent {
  addStylesheetCss: (css: string, key: string) => boolean
}

interface Progress {
  href: string
  chapterLabel: string
  page: number
  total: number
  percent: number
  cfi: string | null
}

interface SpineEntry {
  index: number
  href: string
}

const FONT_KEY = 'libros:reader.fontSize'
const MODE_KEY = 'libros:reader.mode'
const progressKeyFor = (bookId: string) => `libros:reader.progress.${bookId}`

function readStoredNumber(key: string, fallback: number, min: number, max: number): number {
  const raw = window.localStorage.getItem(key)
  if (!raw) return fallback
  const value = Number(raw)
  if (Number.isNaN(value)) return fallback
  return Math.min(max, Math.max(min, value))
}

function readStoredMode(): ReadingMode {
  return window.localStorage.getItem(MODE_KEY) === 'scrolled' ? 'scrolled' : 'paginated'
}

function readLocalPosition(bookId: string): { cfi: string; percent: number } | null {
  try {
    const raw = window.localStorage.getItem(progressKeyFor(bookId))
    if (!raw) return null
    const parsed = JSON.parse(raw) as { cfi?: string; percent?: number }
    if (!parsed.cfi) return null
    return { cfi: parsed.cfi, percent: typeof parsed.percent === 'number' ? parsed.percent : 0 }
  } catch {
    return null
  }
}

function writeLocalPosition(bookId: string, cfi: string, percent: number): void {
  try {
    window.localStorage.setItem(progressKeyFor(bookId), JSON.stringify({ cfi, percent, at: Date.now() }))
  } catch {
    /* almacenamiento no disponible */
  }
}

function spineSections(spine: unknown): SpineEntry[] {
  const items: SpineEntry[] = []
  const anySpine = spine as {
    spineItems?: Array<{ index: number; href?: string }>
    each?: (fn: (section: { index: number; href?: string }) => void) => void
  }
  if (Array.isArray(anySpine)) {
    for (const section of anySpine as Array<unknown>) {
      items.push({ index: (section as { index: number; href?: string }).index, href: (section as { index: number; href?: string }).href ?? '' })
    }
  } else if (anySpine.spineItems) {
    for (const section of anySpine.spineItems) {
      items.push({ index: section.index, href: section.href ?? '' })
    }
  } else if (anySpine.each) {
    anySpine.each((section) => items.push({ index: section.index, href: section.href ?? '' }))
  }
  return items
}

function normalizeHref(href: string): string {
  return href.replace(/^\.\//, '')
}

function flattenToc(items: NavItem[]): NavItem[] {
  const flat: NavItem[] = []
  for (const item of items) {
    flat.push(item)
    if (item.subitems && item.subitems.length > 0) {
      flat.push(...flattenToc(item.subitems))
    }
  }
  return flat
}

function chapterLabelFor(href: string, toc: NavItem[]): string {
  const match = toc.find((item) => item.href && href.endsWith(normalizeHref(item.href)))
  return match ? match.label : 'Página'
}

export default function Reader() {
  const { bookId, fileId } = useParams()
  const location = useLocation()
  const { theme } = useTheme()
  const stateTitle = (location.state as { title?: string } | null)?.title

  const containerRef = useRef<HTMLDivElement | null>(null)
  const bookRef = useRef<Book | null>(null)
  const renditionRef = useRef<Rendition | null>(null)
  const latestRef = useRef<{ cfi: string; percent: number } | null>(null)
  const restoredCfiRef = useRef<string | null>(null)
  const locationsReadyRef = useRef(false)
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const tocRef = useRef<NavItem[]>([])
  const fontSizeRef = useRef(100)
  const themeRef = useRef(theme)

  const [bookTitle, setBookTitle] = useState<string | null>(stateTitle ?? null)
  const [toc, setToc] = useState<NavItem[]>([])
  const [spine, setSpine] = useState<SpineEntry[]>([])
  const [progress, setProgress] = useState<Progress>({ href: '', chapterLabel: 'Página', page: 0, total: 0, percent: 0, cfi: null })
  const [fontSize, setFontSize] = useState(() => readStoredNumber(FONT_KEY, 100, 80, 160))
  const [mode, setMode] = useState<ReadingMode>(() => readStoredMode())
  const [loading, setLoading] = useState(true)
  const [bookReady, setBookReady] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    tocRef.current = toc
  }, [toc])

  useEffect(() => {
    fontSizeRef.current = fontSize
  }, [fontSize])

  // Aplica el tema al contenido del libro sin recrear la rendition.
  useEffect(() => {
    themeRef.current = theme
    const rendition = renditionRef.current
    if (rendition) applyReaderTheme(rendition, theme)
  }, [theme])

  const computePercent = useCallback((loc: RenditionLocation): number => {
    const instance = bookRef.current
    if (instance && locationsReadyRef.current) {
      try {
        const value = instance.locations.percentageFromCfi(loc.start.cfi)
        if (typeof value === 'number' && !Number.isNaN(value)) {
          return Math.round(Math.min(1, Math.max(0, value)) * 100)
        }
      } catch {
        /* ubicación aún no disponible */
      }
    }
    const fallback = loc.start.displayed
    if (fallback.total > 0) {
      return Math.min(100, Math.max(0, Math.round((fallback.page / fallback.total) * 100)))
    }
    return 0
  }, [])

  const flushProgress = useCallback(
    (keepalive = false) => {
      const latest = latestRef.current
      if (!latest || !bookId || !fileId) return
      writeLocalPosition(bookId, latest.cfi, latest.percent)
      void api.saveProgress(bookId, fileId, latest.percent, latest.cfi, keepalive).catch(() => undefined)
    },
    [bookId, fileId],
  )

  // Carga del archivo, metadatos, índice, posición guardada y ubicaciones.
  useEffect(() => {
    let cancelled = false

    async function open() {
      if (!bookId || !fileId) {
        setLoading(false)
        return
      }
      setLoading(true)
      setBookReady(false)
      setError(null)
      latestRef.current = null
      restoredCfiRef.current = null
      locationsReadyRef.current = false

      try {
        const { blob } = await api.getFile(bookId, fileId)
        const data = await blob.arrayBuffer()
        const instance = ePub(data)
        bookRef.current = instance

        const [loadedSpine, loadedNav, metadata] = await Promise.all([
          instance.loaded.spine,
          instance.loaded.navigation,
          instance.loaded.metadata,
        ])
        if (cancelled) return

        setBookTitle(metadata.title ?? stateTitle ?? 'Libro')
        const flatToc = flattenToc(loadedNav.toc)
        setToc(flatToc)
        setSpine(spineSections(loadedSpine))

        // Posición guardada: primero localStorage (instantáneo), luego el servidor.
        const local = readLocalPosition(bookId)
        if (local) {
          restoredCfiRef.current = local.cfi
        } else {
          try {
            const saved = await api.getProgress(bookId)
            if (!cancelled && saved?.locationCfi) {
              restoredCfiRef.current = saved.locationCfi
            }
          } catch {
            /* sin progreso guardado */
          }
        }

        bookRef.current = instance
        if (!cancelled) setBookReady(true)

        // Genera las ubicaciones para calcular el porcentaje real (en segundo plano).
        void instance.locations
          .generate(1600)
          .then(() => {
            locationsReadyRef.current = true
          })
          .catch(() => undefined)
      } catch (err) {
        if (!cancelled) {
          setError(errorMessage(err))
          setLoading(false)
        }
      }
    }

    void open()

    return () => {
      cancelled = true
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
      try {
        renditionRef.current?.destroy()
      } catch {
        /* ya destruida */
      }
      renditionRef.current = null
      try {
        bookRef.current?.destroy()
      } catch {
        /* ya destruido */
      }
      bookRef.current = null
    }
  }, [bookId, fileId, stateTitle])

  // Crea (o recrea) la rendition según el modo: paginado o scroll continuo.
  useEffect(() => {
    if (!bookReady || !bookRef.current || !containerRef.current) return

    let cancelled = false
    const instance = bookRef.current

    const options =
      mode === 'scrolled'
        ? { width: '100%', height: '100%', flow: 'scrolled', manager: 'continuous', allowScriptedContent: true }
        : { width: '100%', height: '100%', flow: 'paginated', spread: 'none', allowScriptedContent: true }

    const rendition = instance.renderTo(containerRef.current, options as never)
    renditionRef.current = rendition
    rendition.themes.fontSize(`${fontSizeRef.current}%`)
    applyReaderTheme(rendition, themeRef.current)
    // Aplica el tema a cada nuevo contenido (páginas en scroll continuo).
    rendition.hooks.content.register((contents: ReaderContent) => {
      contents.addStylesheetCss(READER_THEMES[themeRef.current] ?? READER_THEMES.light, 'reader-theme')
    })

    async function display() {
      const start = latestRef.current?.cfi ?? restoredCfiRef.current ?? null
      try {
        await rendition.display(start ?? undefined)
      } catch {
        try {
          await rendition.display()
        } catch (err) {
          if (!cancelled) setError(errorMessage(err))
        }
      }
    }

    rendition.on('relocated', (loc: RenditionLocation) => {
      if (cancelled) return
      const cfi = loc.start.cfi
      const percent = computePercent(loc)
      latestRef.current = { cfi, percent }
      if (bookId) writeLocalPosition(bookId, cfi, percent)
      setProgress({
        href: loc.start.href,
        chapterLabel: chapterLabelFor(loc.start.href, tocRef.current),
        page: loc.start.displayed.page,
        total: loc.start.displayed.total,
        percent,
        cfi,
      })
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
      saveTimerRef.current = setTimeout(() => flushProgress(false), 900)
    })

    void display().finally(() => {
      if (!cancelled) setLoading(false)
    })

    return () => {
      cancelled = true
      if (renditionRef.current === rendition) {
        try {
          rendition.destroy()
        } catch {
          /* ya destruida */
        }
        renditionRef.current = null
      }
    }
  }, [bookReady, mode, flushProgress, computePercent, bookId])

  // Guarda la posición al salir o al ocultar la pestaña.
  useEffect(() => {
    const onVisibility = () => {
      if (document.visibilityState === 'hidden') flushProgress(true)
    }
    const onBeforeUnload = () => flushProgress(true)
    document.addEventListener('visibilitychange', onVisibility)
    window.addEventListener('beforeunload', onBeforeUnload)
    return () => {
      document.removeEventListener('visibilitychange', onVisibility)
      window.removeEventListener('beforeunload', onBeforeUnload)
      flushProgress(true)
    }
  }, [flushProgress])

  function gotoHref(href: string) {
    const entry = spine.find((section) => section.href && href.endsWith(normalizeHref(section.href)))
    if (entry) {
      void renditionRef.current?.display(entry.index)
    } else {
      void renditionRef.current?.display(href)
    }
  }

  function nextPage() {
    void renditionRef.current?.next()
  }

  function previousPage() {
    void renditionRef.current?.prev()
  }

  function changeFontSize(delta: number) {
    const next = Math.min(160, Math.max(80, fontSize + delta))
    setFontSize(next)
    window.localStorage.setItem(FONT_KEY, String(next))
    renditionRef.current?.themes.fontSize(`${next}%`)
  }

  function toggleMode() {
    setMode((previous) => {
      const next: ReadingMode = previous === 'paginated' ? 'scrolled' : 'paginated'
      window.localStorage.setItem(MODE_KEY, next)
      return next
    })
  }

  return (
    <div className="reader-shell">
      <div className="reader-bar">
        <Link to="/biblioteca" className="back-link">
          ← Biblioteca
        </Link>
        <span className="reader-title">{bookTitle ?? 'Lector'}</span>
        <div className="reader-controls">
          <span className="muted reader-chapter">
            {progress.chapterLabel} {progress.total > 0 && mode === 'paginated' && `· ${progress.page}/${progress.total}`}
          </span>
          <button type="button" className="btn-square" onClick={previousPage} disabled={loading || !!error} aria-label="Anterior">
            ‹
          </button>
          <span className="reader-percent">{loading ? '…' : `${progress.percent}%`}</span>
          <button type="button" className="btn-square" onClick={nextPage} disabled={loading || !!error} aria-label="Siguiente">
            ›
          </button>
          <button type="button" onClick={() => changeFontSize(-10)} aria-label="Reducir texto" className="font">
            A−
          </button>
          <button type="button" onClick={() => changeFontSize(10)} aria-label="Agrandar texto" className="font">
            A+
          </button>
          <button
            type="button"
            className="font"
            onClick={toggleMode}
            disabled={loading || !!error}
            aria-label="Cambiar modo de lectura"
            title={mode === 'paginated' ? 'Cambiar a scroll continuo' : 'Cambiar a páginas'}
          >
            {mode === 'paginated' ? 'Páginas' : 'Continuo'}
          </button>
          {toc.length > 0 && (
            <select
              aria-label="Ir a capítulo"
              value=""
              onChange={(event) => event.target.value && gotoHref(event.target.value)}
            >
              <option value="">Capítulos…</option>
              {toc.map((item, index) => (
                <option key={`${item.href ?? index}-${index}`} value={item.href}>
                  {item.label}
                </option>
              ))}
            </select>
          )}
        </div>
      </div>

      <div className="reader-progress">
        <span style={{ width: `${loading ? 0 : progress.percent}%` }} />
      </div>

      {error && (
        <div className="reader-error">
          <p>{error}</p>
          <Link className="button" to="/biblioteca">
            Volver a la biblioteca
          </Link>
        </div>
      )}

      {loading && <p className="muted placeholder">Cargando el libro…</p>}

      <div className="reader-area" ref={containerRef} />
    </div>
  )
}
