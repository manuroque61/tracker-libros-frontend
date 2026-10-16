import { useCallback, useEffect, useRef, useState } from 'react'
import * as pdfjs from 'pdfjs-dist'
import type { PDFDocumentProxy } from 'pdfjs-dist'
import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url'
import type { ReaderProgress } from './types'

pdfjs.GlobalWorkerOptions.workerSrc = workerUrl

interface RenderTaskLike {
  cancel: () => void
  promise: Promise<void>
}

interface PdfReaderProps {
  data: ArrayBuffer
  initialLocation?: string | null
  onProgress: (progress: ReaderProgress) => void
  onError: (message: string) => void
}

export function PdfReader({ data, initialLocation, onProgress, onError }: PdfReaderProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const docRef = useRef<PDFDocumentProxy | null>(null)
  const taskRef = useRef<ReturnType<typeof pdfjs.getDocument> | null>(null)
  const renderTaskRef = useRef<RenderTaskLike | null>(null)

  const [numPages, setNumPages] = useState(0)
  const [page, setPage] = useState(() => {
    const parsed = Number.parseInt(initialLocation ?? '', 10)
    return Number.isNaN(parsed) || parsed < 1 ? 1 : parsed
  })
  const [scale, setScale] = useState(1.2)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)

    const task = pdfjs.getDocument({ data: new Uint8Array(data.slice(0)) })
    taskRef.current = task
    task.promise
      .then((doc) => {
        if (cancelled) {
          void task.destroy()
          return
        }
        docRef.current = doc
        setNumPages(doc.numPages)
        setPage((current) => Math.min(Math.max(1, current), doc.numPages))
        setLoading(false)
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          const message = err instanceof Error ? err.message : 'No se pudo abrir el PDF'
          setError(message)
          setLoading(false)
          onError(message)
        }
      })

    return () => {
      cancelled = true
      renderTaskRef.current?.cancel()
      void taskRef.current?.destroy()
      taskRef.current = null
      docRef.current = null
    }
  }, [data, onError])

  useEffect(() => {
    const doc = docRef.current
    const canvas = canvasRef.current
    if (!doc || !canvas || numPages === 0) return

    let cancelled = false
    renderTaskRef.current?.cancel()

    void (async () => {
      try {
        const pdfPage = await doc.getPage(page)
        if (cancelled) return
        const viewport = pdfPage.getViewport({ scale })
        const task = pdfPage.render({ canvas, viewport }) as unknown as RenderTaskLike
        renderTaskRef.current = task
        await task.promise
      } catch (err) {
        if (!cancelled && err instanceof Error && err.name !== 'RenderingCancelledException') {
          onError(err.message)
        }
      }
    })()

    onProgress({
      porcentaje: Math.round((page / numPages) * 100),
      ubicacion: String(page),
      paginaActual: page,
      etiqueta: `Página ${page} de ${numPages}`,
    })

    return () => {
      cancelled = true
    }
  }, [page, scale, numPages, onProgress, onError])

  const goTo = useCallback(
    (next: number) => setPage((current) => Math.min(Math.max(1, next), numPages || current)),
    [numPages],
  )

  return (
    <div className="reader-component">
      <div className="reader-bar">
        <span className="muted reader-chapter">
          {numPages > 0 ? `Página ${page} de ${numPages}` : 'Cargando…'}
        </span>
        <div className="reader-controls">
          <button type="button" className="btn-square" onClick={() => goTo(page - 1)} disabled={page <= 1} aria-label="Anterior">
            ‹
          </button>
          <span className="reader-percent">{numPages > 0 ? `${Math.round((page / numPages) * 100)}%` : '…'}</span>
          <button type="button" className="btn-square" onClick={() => goTo(page + 1)} disabled={page >= numPages} aria-label="Siguiente">
            ›
          </button>
          <button type="button" className="font" onClick={() => setScale((s) => Math.max(0.6, s - 0.2))} aria-label="Alejar">
            A−
          </button>
          <button type="button" className="font" onClick={() => setScale((s) => Math.min(3, s + 0.2))} aria-label="Acercar">
            A+
          </button>
        </div>
      </div>
      <div className="reader-progress">
        <span style={{ width: numPages > 0 ? `${(page / numPages) * 100}%` : '0%' }} />
      </div>
      {loading && (
        <p className="muted placeholder">
          <span className="spinner" /> Cargando el PDF…
        </p>
      )}
      {error && <p className="reader-error">{error}</p>}
      <div className="reader-area pdf-area">
        <canvas ref={canvasRef} className="pdf-canvas" />
      </div>
    </div>
  )
}
