import { useCallback, useEffect, useMemo, useState, type ChangeEvent } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import { AnotacionPanel } from '../components/AnotacionPanel'
import { useAsync } from '../hooks/useAsync'
import { useLecturaSync } from '../hooks/useLecturaSync'
import { asociar } from '../services/archivosApi'
import { obtenerLibro } from '../services/librosApi'
import { crearLectura, listarPorLibro } from '../services/lecturasApi'
import { EpubReader } from '../readers/EpubReader'
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

  const lecturaPreferida = useMemo(() => {
    const digitales = (data?.lecturas ?? []).filter((lectura) => lectura.formato !== 'FISICO')
    const preferida = searchParams.get('lectura')
    return (
      (preferida ? digitales.find((lectura) => lectura.id === preferida) : undefined) ??
      digitales.find((lectura) => lectura.estado === 'LEYENDO') ??
      digitales[0] ??
      null
    )
  }, [data, searchParams])

  const [lecturaId, setLecturaId] = useState<string | null>(null)
  useEffect(() => {
    if (!lecturaId && lecturaPreferida) setLecturaId(lecturaPreferida.id)
  }, [lecturaPreferida, lecturaId])

  const lectura = lecturaId ? (data?.lecturas ?? []).find((item) => item.id === lecturaId) ?? null : null
  const { saving, savedAt, save } = useLecturaSync(lectura?.id)

  const [file, setFile] = useState<Archivo | null>(null)
  const [readerError, setReaderError] = useState<string | null>(null)
  const [progreso, setProgreso] = useState<ReaderProgress | null>(null)

  const onProgress = useCallback(
    (next: ReaderProgress) => {
      setProgreso(next)
      save(next.porcentaje, next.ubicacion, next.paginaActual)
    },
    [save],
  )

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

        {!file && (
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
            onProgress={onProgress}
            onError={setReaderError}
          />
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
          lecturaId={lectura?.id ?? null}
          ubicacionActual={progreso?.ubicacion ?? null}
          porcentajeActual={progreso?.porcentaje ?? lectura?.porcentaje ?? null}
        />
      </section>
    </div>
  )
}
