import { useEffect, useRef, useState } from 'react'
import { Link, useLocation, useParams } from 'react-router-dom'
import ePub from 'epubjs'
import type { Book, NavItem } from 'epubjs'
import type { Location as RenditionLocation } from 'epubjs'
import { api, errorMessage } from '../api'

interface Progress {
  href: string
  chapterLabel: string
  page: number
  total: number
}

interface SpineEntry {
  index: number
  href: string
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
  const stateTitle = (location.state as { title?: string } | null)?.title

  const containerRef = useRef<HTMLDivElement | null>(null)
  const renditionRef = useRef<Book['rendition'] | null>(null)

  const [bookTitle, setBookTitle] = useState<string | null>(stateTitle ?? null)
  const [toc, setToc] = useState<NavItem[]>([])
  const [spine, setSpine] = useState<SpineEntry[]>([])
  const [progress, setProgress] = useState<Progress>({ href: '', chapterLabel: 'Página', page: 0, total: 0 })
  const [fontSize, setFontSize] = useState(100)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    async function open() {
      if (!bookId || !fileId) {
        setLoading(false)
        return
      }
      setLoading(true)
      setError(null)
      try {
        const { blob } = await api.getFile(bookId, fileId)
        const data = await blob.arrayBuffer()
        const instance = ePub(data)

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

        if (!containerRef.current) return

        const rendition = instance.renderTo(containerRef.current, {
          width: '100%',
          height: '100%',
          flow: 'paginated',
          spread: 'none',
        })
        renditionRef.current = rendition
        await rendition.display()

        rendition.on('relocated', (location: RenditionLocation) => {
          if (cancelled) return
          setProgress({
            href: location.start.href,
            chapterLabel: chapterLabelFor(location.start.href, flatToc),
            page: location.start.displayed.page,
            total: location.start.displayed.total,
          })
        })
      } catch (err) {
        if (!cancelled) setError(errorMessage(err))
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    void open()

    return () => {
      cancelled = true
      renditionRef.current?.destroy()
      renditionRef.current = null
    }
  }, [bookId, fileId, stateTitle])

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
    renditionRef.current?.themes.fontSize(`${next}%`)
  }

  const percent = Math.min(100, Math.max(0, Math.round((progress.page / Math.max(1, progress.total)) * 100)))

  return (
    <div className="reader-shell">
      <div className="reader-bar">
        <Link to="/biblioteca" className="back-link">
          ← Biblioteca
        </Link>
        <span className="reader-title">{bookTitle ?? 'Lector'}</span>
        <div className="reader-controls">
          <span className="muted reader-chapter">
            {progress.chapterLabel} {progress.total > 0 && `· ${progress.page}/${progress.total}`}
          </span>
          <button type="button" onClick={previousPage} disabled={loading || !!error} aria-label="Anterior">
            ‹
          </button>
          <span className="reader-percent">{loading ? '…' : `${percent}%`}</span>
          <button type="button" onClick={nextPage} disabled={loading || !!error} aria-label="Siguiente">
            ›
          </button>
          <button type="button" onClick={() => changeFontSize(-10)} aria-label="Reducir texto" className="font">
            A−
          </button>
          <button type="button" onClick={() => changeFontSize(10)} aria-label="Agrandar texto" className="font">
            A+
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