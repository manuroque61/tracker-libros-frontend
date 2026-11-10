import { useCallback, useEffect, useMemo, useRef, useState, type ChangeEvent } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import { AnotacionPanel } from '../components/AnotacionPanel'
import { ComentariosClub } from '../components/ComentariosClub'
import { useAsync } from '../hooks/useAsync'
import { useLecturaSync } from '../hooks/useLecturaSync'
import { asociar } from '../services/archivosApi'
import { claveClubLibro, obtenerLibro } from '../services/librosApi'
import { crearLectura, listarPorLibro } from '../services/lecturasApi'
import { EpubReader } from '../readers/EpubReader'
import { GutenbergHtmlReader } from '../readers/GutenbergHtmlReader'
import { PdfReader } from '../readers/PdfReader'
import type { ReaderProgress } from '../readers/types'
import type { Lectura, Libro } from '../types'
import { FORMATO_LABEL } from '../types'

interface LectorData {
  libro: Libro | null
  lecturas: Lectura[]
}

interface Archivo {
  data: ArrayBuffer
  formato: 'PDF' | 'EPUB'
  nombre: string
}

export default function Lector() {
  const { bookId } = useParams()
  const [searchParams] = useSearchParams()

  const loader = useCallback(async (): Promise<LectorData> => {
    if (!bookId) return { libro: null, lecturas: [] }
    const [libro, lecturas] = await Promise.all([obtenerLibro(bookId), listarPorLibro(bookId)])
    return { libro, lecturas }
  }, [bookId])
  const { data, loading, error, reload } = useAsync(loader)
  const lecturaCreacionRef = useRef<{ libroId: string; promise: Promise<Lectura> } | null>(null)

  const lecturaPreferida = useMemo(() => {
    const digitales = (data?.lecturas ?? []).filter((lectura) => lectura.formato !== 'FISICO')
    const preferida = searchParams.get('lectura')
    const versionPreferida = searchParams.get('gutenbergId')
    const lecturaExplicita = preferida ? digitales.find((lectura) => lectura.id === preferida) : undefined
    if (lecturaExplicita) return lecturaExplicita
    if (versionPreferida) {
      return digitales.find((lectura) => lectura.versionId === versionPreferida) ?? null
    }
    return (
      digitales.find((lectura) => lectura.estado === 'LEYENDO') ??
      digitales[0] ??
      null
    )
  }, [data, searchParams])

  const [lecturaId, setLecturaId] = useState<string | null>(null)
  useEffect(() => {
    if (lecturaPreferida) setLecturaId(lecturaPreferida.id)
    else if (searchParams.get('gutenbergId')) setLecturaId(null)
  }, [lecturaPreferida, searchParams])

  const lectura = lecturaId ? (data?.lecturas ?? []).find((item) => item.id === lecturaId) ?? null : null
  const { saving, savedAt, save } = useLecturaSync(lectura?.id ?? lecturaId ?? undefined)

  const [file, setFile] = useState<Archivo | null>(null)
  const [readerError, setReaderError] = useState<string | null>(null)
  const [progreso, setProgreso] = useState<ReaderProgress | null>(null)
  const [ubicacionAnotacion, setUbicacionAnotacion] = useState<string | null>(null)
  const [porcentajeAnotacion, setPorcentajeAnotacion] = useState<number | null>(null)
  const [solicitudSalto, setSolicitudSalto] = useState(0)
  const [gutenbergCargando, setGutenbergCargando] = useState(false)
  const [usarHtmlGutenberg, setUsarHtmlGutenberg] = useState(false)
  const selectedGutenbergId = searchParams.get('gutenbergId') ?? lecturaPreferida?.versionId ?? data?.libro?.gutenbergId ?? null
  const selectedGutenbergVersion = data?.libro?.versionesGutenberg?.find((version) => version.id === selectedGutenbergId)
  const gutenbergParam = searchParams.get('gutenbergUrl') ?? selectedGutenbergVersion?.urlEpub ?? data?.libro?.gutenbergUrlEpub ?? (selectedGutenbergId ? `https://www.gutenberg.org/ebooks/${selectedGutenbergId}.epub3.images` : null)
  const gutenbergEpubUrl = selectedGutenbergVersion?.urlEpub ?? data?.libro?.gutenbergUrlEpub ?? undefined
  const gutenbergHtmlUrl = selectedGutenbergVersion?.urlHtml ?? (selectedGutenbergId
      ? `https://www.gutenberg.org/cache/epub/${selectedGutenbergId}/pg${selectedGutenbergId}-images.html`
      : undefined)

  const onProgress = useCallback(
    (next: ReaderProgress) => {
      setProgreso(next)
      setUbicacionAnotacion((actual) => actual === next.ubicacion ? null : actual)
      setPorcentajeAnotacion((actual) => actual != null && Math.abs(actual - next.porcentaje) <= 1 ? null : actual)
      save(next.porcentaje, next.ubicacion, next.paginaActual)
    },
    [save],
  )

  useEffect(() => {
    let activo = true
    const gutenbergUrl = gutenbergParam
    if (!gutenbergUrl || file || !bookId) return
    ;(async () => {
      try {
        setGutenbergCargando(true)
        setReaderError(null)
        setUsarHtmlGutenberg(false)
        const esPdf = gutenbergUrl.toLowerCase().includes('.pdf')
        const urlProxy = selectedGutenbergId && !esPdf
          ? `/api/gutenberg/epub/${selectedGutenbergId}`
          : null
        const urls = urlProxy ? [urlProxy] : [gutenbergUrl]
        for (const url of urls) {
          try {
            const response = await fetch(url, { mode: 'cors' })
            if (!response.ok) continue
            const buffer = await response.arrayBuffer()
            if (!buffer.byteLength) continue
            const formato: 'PDF' | 'EPUB' = esPdf ? 'PDF' : 'EPUB'
            const nombre = gutenbergUrl.split('/').pop() ?? 'libro'
            if (!activo) return
            const lecturaExistente = lectura ?? lecturaPreferida
            if (lecturaExistente) {
              setLecturaId(lecturaExistente.id)
            } else {
              if (!lecturaCreacionRef.current || lecturaCreacionRef.current.libroId !== bookId) {
                lecturaCreacionRef.current = {
                  libroId: bookId,
                  promise: crearLectura(bookId, formato, null, selectedGutenbergId),
                }
              }
              const nuevaLectura = await lecturaCreacionRef.current.promise
              if (!activo) return
              setLecturaId(nuevaLectura.id)
              reload()
            }
            setFile({ data: buffer, formato, nombre })
            void asociar(bookId, new File([buffer], nombre, { type: formato === 'PDF' ? 'application/pdf' : 'application/epub+zip' }))
            return
          } catch {
            // Continúa con el proxy local si el navegador no puede descargar la URL externa.
          }
        }
        if (gutenbergHtmlUrl) {
          setUsarHtmlGutenberg(true)
          return
        }
        throw new Error('No se pudo descargar el archivo')
      } catch {
        if (!activo) return
        setReaderError('No se pudo descargar el libro de Project Gutenberg. Probá abrirlo manualmente con "Abrir archivo".')
      } finally {
        if (activo) setGutenbergCargando(false)
      }
    })()
    return () => { activo = false }
  }, [gutenbergParam, gutenbergHtmlUrl, file, bookId, selectedGutenbergId, lectura, lecturaPreferida, reload])

  async function onOpenFile(event: ChangeEvent<HTMLInputElement>) {
    const selected = event.target.files?.[0]
    if (!selected || !bookId) return
    setReaderError(null)
    const formato: 'PDF' | 'EPUB' = selected.name.toLowerCase().endsWith('.pdf') ? 'PDF' : 'EPUB'
    try {
      const buffer = await selected.arrayBuffer()
      setFile({ data: buffer, formato, nombre: selected.name })
      void asociar(bookId, selected)
      if (!lectura) {
        const nueva = await crearLectura(bookId, formato, null)
        setLecturaId(nueva.id)
        reload()
      }
    } catch {
      setReaderError('No se pudo leer el archivo seleccionado.')
    }
  }

  if (loading) {
    return (
      <p className="muted placeholder">
        <span className="spinner" /> Cargando el lector…
      </p>
    )
  }

  if (error || !data?.libro) {
    return (
      <div className="alert">
        {error ?? 'No encontramos este libro.'}{' '}
        <Link className="link" to="/biblioteca">
          Volver a la biblioteca
        </Link>
      </div>
    )
  }

  const libro = data.libro
  return (
    <div className="lector">
      <div className="reader-shell">
        <div className="reader-bar lector-bar">
          <Link to={`/libro/${libro.id}`} className="back-link">
            ← {libro.titulo}
          </Link>
          <span className="reader-title">
            {lectura ? `Lectura ${FORMATO_LABEL[lectura.formato]}` : 'Lector'}
          </span>
          <div className="reader-controls">
            <span className={`sync-state${saving ? ' sync-saving' : ''}`}>
              {saving ? 'Guardando…' : savedAt ? 'Guardado' : ''}
            </span>
            <label className="button secondary file-open">
              Abrir PDF/EPUB
              <input type="file" accept=".pdf,.epub" onChange={(event) => void onOpenFile(event)} hidden />
            </label>
          </div>
        </div>

        {readerError && <div className="alert">{readerError}</div>}

        {gutenbergCargando && !file && (
          <div className="empty lector-empty">
            <p>Descargando libro de Project Gutenberg…</p>
            <p className="muted">
              Esperá un momento mientras se prepara la lectura.
            </p>
          </div>
        )}
        {!file && !gutenbergCargando && !gutenbergHtmlUrl && !gutenbergEpubUrl && !libro.openLibraryReadUrl && !libro.openLibraryBorrowUrl && (
          <div className="empty lector-empty">
            <p>Elegí un archivo EPUB o PDF para empezar a leer.</p>
            <p className="muted">
              El lector funciona de forma local: el archivo no se sube a ningún servidor. Tu posición se guarda en este
              dispositivo y se restaura al volver.
            </p>
            <label className="button">
              Abrir archivo
              <input type="file" accept=".pdf,.epub" onChange={(event) => void onOpenFile(event)} hidden />
            </label>
          </div>
        )}

        {file?.formato === 'EPUB' && (
          <EpubReader
            data={file.data}
            initialLocation={lectura?.ubicacionDigital ?? null}
            jumpToLocation={ubicacionAnotacion}
            jumpToPercentage={porcentajeAnotacion}
            jumpRequestId={solicitudSalto}
            onProgress={onProgress}
            onError={setReaderError}
          />
        )}
        {!file && gutenbergHtmlUrl && (!gutenbergEpubUrl || usarHtmlGutenberg) && (
          <GutenbergHtmlReader src={gutenbergHtmlUrl} title={`Leer ${libro.titulo}`} />
        )}
        {!file && !gutenbergHtmlUrl && gutenbergEpubUrl && (
          <div className="empty lector-empty">
            <p>Gutenberg no ofrece una versión HTML para leer este título dentro de la app.</p>
            <a className="button" href={gutenbergEpubUrl}>Abrir EPUB de Gutenberg</a>
          </div>
        )}
        {!file && libro.openLibraryReadUrl && (
          <GutenbergHtmlReader src={libro.openLibraryReadUrl} title={`Leer ${libro.titulo} en Open Library`} />
        )}
        {!file && !libro.openLibraryReadUrl && libro.openLibraryBorrowUrl && (
          <div className="empty lector-empty">
            <p>Este libro requiere un préstamo de Open Library para leerlo.</p>
            <p className="muted">La disponibilidad puede cambiar y es posible que tengas que iniciar sesión o esperar.</p>
            <a className="button" href={libro.openLibraryBorrowUrl} target="_blank" rel="noreferrer">
              Pedir prestado en Open Library
            </a>
          </div>
        )}
        {file?.formato === 'PDF' && (
          <PdfReader
            data={file.data}
            initialLocation={lectura?.ubicacionDigital ?? null}
            onProgress={onProgress}
            onError={setReaderError}
          />
        )}
      </div>

      <section className="lector-anotaciones">
        <AnotacionPanel
          libroId={libro.id}
          lecturaId={lectura?.id ?? lecturaId}
          ubicacionActual={progreso?.ubicacion ?? lectura?.ubicacionDigital ?? null}
          porcentajeActual={progreso?.porcentaje ?? lectura?.porcentaje ?? 0}
          requiereProgreso
          onVerUbicacion={(anotacion) => {
            setUbicacionAnotacion(anotacion.ubicacion ?? null)
            setPorcentajeAnotacion(anotacion.porcentaje ?? null)
            setSolicitudSalto((actual) => actual + 1)
          }}
        />
      </section>
      {(file?.formato === 'EPUB' || lectura?.formato === 'EPUB') && <ComentariosClub bookKey={claveClubLibro(libro)} titulo={libro.titulo} porcentaje={progreso?.porcentaje ?? lectura?.porcentaje ?? 0} ubicacion={progreso?.ubicacion ?? lectura?.ubicacionDigital ?? null} />}
    </div>
  )
}
