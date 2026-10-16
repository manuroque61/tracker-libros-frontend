import { useCallback, useEffect, useRef, useState } from 'react'
import ePub from 'epubjs'
import type { Book, NavItem } from 'epubjs'
import type { Location as RenditionLocation } from 'epubjs'
import { useTheme } from '../theme'
import type { ReaderProgress } from './types'

type Rendition = Book['rendition']
type ReadingMode = 'paginated' | 'scrolled'

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

interface ReaderContent {
  addStylesheetCss: (css: string, key: string) => boolean
}

function applyReaderTheme(rendition: Rendition, theme: string) {
  const css = READER_THEMES[theme] ?? READER_THEMES.light
  const contents = rendition.getContents() as unknown as ReaderContent[]
  contents.forEach((content) => content.addStylesheetCss(css, 'reader-theme'))
}

const FONT_KEY = 'reader.fontSize'
const MODE_KEY = 'reader.mode'

function readStoredNumber(key: string, fallback: number, min: number, max: number): number {
  const raw = window.localStorage.getItem(`libros-tracker.${key}`)
  if (!raw) return fallback
  const value = Number(raw)
  if (Number.isNaN(value)) return fallback
  return Math.min(max, Math.max(min, value))
}

function readStoredMode(): ReadingMode {
  return window.localStorage.getItem(`libros-tracker.${MODE_KEY}`) === 'scrolled' ? 'scrolled' : 'paginated'
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

interface EpubReaderProps {
  data: ArrayBuffer
  initialLocation?: string | null
  onProgress: (progress: ReaderProgress) => void
  onError: (message: string) => void
}

export function EpubReader({ data, initialLocation, onProgress, onError }: EpubReaderProps) {
  const { theme } = useTheme()

  const containerRef = useRef<HTMLDivElement | null>(null)
  const bookRef = useRef<Book | null>(null)
  const renditionRef = useRef<Rendition | null>(null)
  const latestRef = useRef<{ cfi: string; percent: number } | null>(null)
  const tocRef = useRef<NavItem[]>([])
  const fontSizeRef = useRef(100)
  const themeRef = useRef(theme)
  const progressRef = useRef(onProgress)
  const errorRef = useRef(onError)

  const [toc, setToc] = useState<NavItem[]>([])
  const [progress, setProgress] = useState<ReaderProgress>({ porcentaje: 0, ubicacion: null, paginaActual: null, etiqueta: 'Página' })
  const [fontSize, setFontSize] = useState(() => readStoredNumber(FONT_KEY, 100, 80, 160))
  const [mode, setMode] = useState<ReadingMode>(() => readStoredMode())
  const [loading, setLoading] = useState(true)
  const [bookReady, setBookReady] = useState(false)

  useEffect(() => {
    progressRef.current = onProgress
  }, [onProgress])
  useEffect(() => {
    errorRef.current = onError
  }, [onError])
  useEffect(() => {
    tocRef.current = toc
  }, [toc])
  useEffect(() => {
    fontSizeRef.current = fontSize
  }, [fontSize])

  useEffect(() => {
    themeRef.current = theme
    if (renditionRef.current) applyReaderTheme(renditionRef.current, theme)
  }, [theme])

  const computePercent = useCallback((loc: RenditionLocation): number => {
    const instance = bookRef.current
    if (instance) {
      try {
        const value = instance.locations.percentageFromCfi(loc.start.cfi)
        if (typeof value === 'number' && !Number.isNaN(value) && value > 0) {
          return Math.round(Math.min(1, Math.max(0, value)) * 100)
        }
      } catch {
        /* ubicaciones aún no generadas */
      }
    }
    const fallback = loc.start.displayed
    if (fallback.total > 0) {
      return Math.min(100, Math.max(0, Math.round((fallback.page / fallback.total) * 100)))
    }
    return 0
  }, [])

  useEffect(() => {
    let cancelled = false
    const instance = ePub(data)
    bookRef.current = instance

    async function load() {
      try {
        const loadedNav = await instance.loaded.navigation
        if (cancelled) return
        setToc(flattenToc(loadedNav.toc))
        setBookReady(true)
        void instance.locations.generate(1600).catch(() => undefined)
      } catch (err) {
        if (!cancelled) errorRef.current(err instanceof Error ? err.message : 'No se pudo abrir el EPUB')
      }
    }
    void load()

    return () => {
      cancelled = true
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
  }, [data])

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
    rendition.hooks.content.register((contents: ReaderContent) => {
      contents.addStylesheetCss(READER_THEMES[themeRef.current] ?? READER_THEMES.light, 'reader-theme')
    })

    async function display() {
      try {
        await rendition.display(latestRef.current?.cfi ?? initialLocation ?? undefined)
      } catch {
        try {
          await rendition.display()
        } catch (err) {
          if (!cancelled) errorRef.current(err instanceof Error ? err.message : 'No se pudo mostrar el libro')
        }
      }
    }

    rendition.on('relocated', (loc: RenditionLocation) => {
      if (cancelled) return
      const cfi = loc.start.cfi
      const percent = computePercent(loc)
      latestRef.current = { cfi, percent }
      const next: ReaderProgress = {
        porcentaje: percent,
        ubicacion: cfi,
        paginaActual: loc.start.displayed.page || null,
        etiqueta: chapterLabelFor(loc.start.href, tocRef.current),
      }
      setProgress(next)
      progressRef.current(next)
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
  }, [bookReady, mode, computePercent, initialLocation])

  function changeFontSize(delta: number) {
    const next = Math.min(160, Math.max(80, fontSize + delta))
    setFontSize(next)
    window.localStorage.setItem(`libros-tracker.${FONT_KEY}`, String(next))
    renditionRef.current?.themes.fontSize(`${next}%`)
  }

  function toggleMode() {
    setMode((previous) => {
      const next: ReadingMode = previous === 'paginated' ? 'scrolled' : 'paginated'
      window.localStorage.setItem(`libros-tracker.${MODE_KEY}`, next)
      return next
    })
  }

  return (
    <div className="reader-component">
      <div className="reader-bar">
        <span className="muted reader-chapter">
          {progress.etiqueta}
          {progress.paginaActual != null && mode === 'paginated' && ` · ${progress.paginaActual}`}
        </span>
        <div className="reader-controls">
          <button type="button" className="btn-square" onClick={() => void renditionRef.current?.prev()} disabled={loading} aria-label="Anterior">
            ‹
          </button>
          <span className="reader-percent">{loading ? '…' : `${progress.porcentaje}%`}</span>
          <button type="button" className="btn-square" onClick={() => void renditionRef.current?.next()} disabled={loading} aria-label="Siguiente">
            ›
          </button>
          <button type="button" className="font" onClick={() => changeFontSize(-10)} aria-label="Reducir texto">
            A−
          </button>
          <button type="button" className="font" onClick={() => changeFontSize(10)} aria-label="Agrandar texto">
            A+
          </button>
          <button type="button" className="font" onClick={toggleMode} aria-label="Cambiar modo de lectura">
            {mode === 'paginated' ? 'Páginas' : 'Continuo'}
          </button>
          {toc.length > 0 && (
            <select
              aria-label="Ir a capítulo"
              value=""
              onChange={(event) => event.target.value && void renditionRef.current?.display(event.target.value)}
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
        <span style={{ width: `${loading ? 0 : progress.porcentaje}%` }} />
      </div>
      {loading && <p className="muted placeholder">Cargando el libro…</p>}
      <div className="reader-area" ref={containerRef} />
    </div>
  )
}
