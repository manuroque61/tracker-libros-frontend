import { useEffect, useState } from 'react'
import { AnotacionPanel } from '../components/AnotacionPanel'
import { readStore, writeStore } from '../services/storage'
import type { GutenbergLibro } from '../services/gutenbergApi'
import { EpubReader } from './EpubReader'
import type { ReaderProgress } from './types'

interface GutenbergReaderProps {
  libro: GutenbergLibro
  onCerrar?: () => void
}

const progresoVacio: ReaderProgress = {
  porcentaje: 0,
  ubicacion: null,
  paginaActual: null,
  etiqueta: 'Página',
}

async function descargarEpub(url: string): Promise<ArrayBuffer> {
  const controller = new AbortController()
  const timeout = window.setTimeout(() => controller.abort(), 60_000)
  try {
    const response = await fetch(url, { signal: controller.signal })
    if (!response.ok) throw new Error(`Respuesta ${response.status}`)
    const buffer = await response.arrayBuffer()
    if (!buffer.byteLength) throw new Error('El archivo llegó vacío')
    return buffer
  } finally {
    window.clearTimeout(timeout)
  }
}

export function GutenbergReader({ libro, onCerrar }: GutenbergReaderProps) {
  const progresoKey = `gutenberg-progress.${libro.id}`
  const libroKey = `gutenberg:${libro.id}`
  const progresoPrevio = readStore<ReaderProgress | null>(progresoKey, null)
  const [data, setData] = useState<ArrayBuffer | null>(null)
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [progreso, setProgreso] = useState<ReaderProgress>(() => readStore(progresoKey, progresoVacio))
  const [ubicacionInicial] = useState(() => progresoPrevio?.ubicacion ?? null)
  const [posicionLista, setPosicionLista] = useState(() => progresoPrevio != null)
  const [ubicacionSolicitada, setUbicacionSolicitada] = useState<string | null>(null)
  const [porcentajeSolicitado, setPorcentajeSolicitado] = useState<number | null>(null)
  const [solicitudSalto, setSolicitudSalto] = useState(0)

  useEffect(() => {
    let active = true
    const urls = [`/api/gutenberg/epub/${encodeURIComponent(libro.id)}`]
    void (async () => {
      let ultimoError = 'Gutenberg no ofrece un EPUB descargable para este libro.'
      for (const url of urls) {
        try {
          const buffer = await descargarEpub(url)
          if (active) {
            setData(buffer)
            setPosicionLista(true)
          }
          return
        } catch (err) {
          ultimoError = err instanceof Error ? err.message : ultimoError
        }
      }
      if (active) setError(`No se pudo cargar el EPUB de Gutenberg. ${ultimoError}`)
    })().finally(() => { if (active) setCargando(false) })
    return () => { active = false }
  }, [libro.id, libro.urlEpub])

  function guardarProgreso(siguiente: ReaderProgress) {
    setProgreso(siguiente)
    setPosicionLista(true)
    writeStore(progresoKey, siguiente)
    setUbicacionSolicitada((actual) => actual === siguiente.ubicacion ? null : actual)
    setPorcentajeSolicitado((actual) => actual != null && Math.abs(actual - siguiente.porcentaje) <= 1 ? null : actual)
  }

  return <>
    <div className="reader-shell" style={{ height: '70vh', marginTop: 16, width: '100%' }}>
      <div className="reader-bar">
        <span className="reader-title">{libro.titulo}</span>
        <div className="reader-controls">
          <a
            className="button secondary"
            href={`/api/gutenberg/epub/${encodeURIComponent(libro.id)}`}
            download={`gutenberg-${libro.id}.epub`}
          >Descargar EPUB</a>
          {(libro.urlHtml || libro.urlEpub) && <a className="button secondary" href={libro.urlHtml ?? libro.urlEpub} target="_blank" rel="noreferrer">Abrir en Gutenberg</a>}
          {onCerrar && <button type="button" className="btn-square" onClick={onCerrar} aria-label="Cerrar">×</button>}
        </div>
      </div>
      {cargando && <p className="muted placeholder">Cargando EPUB de Gutenberg…</p>}
      {error && <div className="alert" role="alert">{error}{libro.urlHtml && <> <a href={libro.urlHtml} target="_blank" rel="noreferrer">Abrir texto original</a></>}</div>}
      {data && <EpubReader
        data={data}
        initialLocation={ubicacionInicial}
        jumpToLocation={ubicacionSolicitada}
        jumpToPercentage={porcentajeSolicitado}
        jumpRequestId={solicitudSalto}
        onProgress={guardarProgreso}
        onError={setError}
      />}
    </div>
    {data && posicionLista && <section className="lector-anotaciones">
      <AnotacionPanel
        libroId={libroKey}
        ubicacionActual={progreso.ubicacion}
        porcentajeActual={progreso.porcentaje}
        requiereProgreso
        onVerUbicacion={(anotacion) => {
          setUbicacionSolicitada(anotacion.ubicacion ?? null)
          setPorcentajeSolicitado(anotacion.porcentaje ?? null)
          setSolicitudSalto((actual) => actual + 1)
        }}
      />
    </section>}
  </>
}
