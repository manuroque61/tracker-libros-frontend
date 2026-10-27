import { useCallback, useState, type FormEvent } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { AnotacionPanel } from '../components/AnotacionPanel'
import { BookCover } from '../components/BookCover'
import { Progreso } from '../components/Progreso'
import { ResenaLibro } from '../components/ResenaLibro'
import { useAsync } from '../hooks/useAsync'
import { errorMessage } from '../services/apiClient'
import { listarPorLibro as listarArchivos } from '../services/archivosApi'
import { eliminarLibro, obtenerLibro } from '../services/librosApi'
import { crearLectura, eliminarLectura, listarPorLibro as listarLecturas } from '../services/lecturasApi'
import type { ArchivoDigital, FormatoLectura, Lectura, Libro } from '../types'
import { ESTADO_LABEL, FORMATOS, FORMATO_LABEL } from '../types'

interface Detalle {
  libro: Libro | null
  lecturas: Lectura[]
  archivos: ArchivoDigital[]
}

function formatoArchivo(tamano: number): string {
  if (tamano < 1024) return `${tamano} B`
  if (tamano < 1024 * 1024) return `${(tamano / 1024).toFixed(0)} KB`
  return `${(tamano / (1024 * 1024)).toFixed(1)} MB`
}

export default function LibroDetalle() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [nuevoFormato, setNuevoFormato] = useState<FormatoLectura>('FISICO')
  const [nuevasPaginas, setNuevasPaginas] = useState('')
  const [accionError, setAccionError] = useState<string | null>(null)
  const [ocupado, setOcupado] = useState(false)

  const loader = useCallback(async (): Promise<Detalle> => {
    if (!id) return { libro: null, lecturas: [], archivos: [] }
    const [libro, lecturas, archivos] = await Promise.all([
      obtenerLibro(id),
      listarLecturas(id),
      listarArchivos(id),
    ])
    return { libro, lecturas, archivos }
  }, [id])
  const { data, loading, error, reload } = useAsync(loader)

  async function agregarLectura(event: FormEvent) {
    event.preventDefault()
    if (!id) return
    setOcupado(true)
    setAccionError(null)
    try {
      const paginas = Number.parseInt(nuevasPaginas, 10)
      await crearLectura(id, nuevoFormato, Number.isNaN(paginas) ? data?.libro?.cantidadPaginas ?? null : paginas)
      setNuevasPaginas('')
      reload()
    } catch (err) {
      setAccionError(errorMessage(err))
    } finally {
      setOcupado(false)
    }
  }

  async function borrarLectura(lecturaId: string) {
    setOcupado(true)
    setAccionError(null)
    try {
      await eliminarLectura(lecturaId)
      reload()
    } catch (err) {
      setAccionError(errorMessage(err))
    } finally {
      setOcupado(false)
    }
  }

  async function borrarLibro() {
    if (!id || !data?.libro) return
    if (!window.confirm(`¿Eliminar «${data.libro.titulo}» y todas sus lecturas?`)) return
    setOcupado(true)
    try {
      await Promise.all(data.lecturas.map((lectura) => eliminarLectura(lectura.id)))
      await eliminarLibro(id)
      navigate('/biblioteca')
    } catch (err) {
      setAccionError(errorMessage(err))
      setOcupado(false)
    }
  }

  if (loading) {
    return (
      <p className="muted placeholder">
        <span className="spinner" /> Cargando el libro…
      </p>
    )
  }

  if (error) {
    return (
      <div className="alert">
        {error} <button type="button" className="link" onClick={reload}>Reintentar</button>
      </div>
    )
  }

  const libro = data?.libro
  if (!libro) {
    return (
      <div className="empty">
        <p>No encontramos este libro.</p>
        <Link className="button" to="/biblioteca">
          Volver a la biblioteca
        </Link>
      </div>
    )
  }

  const lecturas = data?.lecturas ?? []
  const archivos = data?.archivos ?? []

  return (
    <section>
      <p>
        <Link to="/biblioteca" className="back-link">
          ← Biblioteca
        </Link>
      </p>

      <header className="detalle-header">
        <BookCover src={libro.portadaUrl ?? undefined} title={libro.titulo} />
        <div className="detalle-info">
          <h1>{libro.titulo}</h1>
          <p className="authors">{libro.autor}</p>
          <p className="meta">
            {libro.genero && <span>{libro.genero}</span>}
            {libro.editorial && <span>{libro.editorial}</span>}
            {libro.fechaPublicacion && <span>{libro.fechaPublicacion}</span>}
            {libro.cantidadPaginas != null && <span>{libro.cantidadPaginas} págs.</span>}
            {libro.isbn && <span>ISBN {libro.isbn}</span>}
          </p>
          {libro.descripcion && <p className="description detalle-descripcion">{libro.descripcion}</p>}
          <div className="detalle-actions">
            <button type="button" className="link" onClick={() => void borrarLibro()} disabled={ocupado}>
              Eliminar libro
            </button>
          </div>
        </div>
      </header>

      <ResenaLibro key={libro.id} libroId={libro.id} />

      <h2 className="home-heading">Lecturas</h2>
      {lecturas.length === 0 && <p className="muted">Este libro todavía no tiene lecturas registradas.</p>}

      <ul className="lectura-list">
        {lecturas.map((lectura) => (
          <li key={lectura.id} className="lectura-item">
            <div className="lectura-head">
              <span className={`badge-formato badge-${lectura.formato.toLowerCase()}`}>{FORMATO_LABEL[lectura.formato]}</span>
              <span className={`badge-estado estado-${lectura.estado.toLowerCase()}`}>{ESTADO_LABEL[lectura.estado]}</span>
              {lectura.totalPaginas != null && (
                <span className="muted">
                  {lectura.formato === 'EPUB' ? '' : `${lectura.paginaActual ?? 0}/${lectura.totalPaginas} págs.`}
                </span>
              )}
            </div>
            <Progreso value={lectura.porcentaje} />
            <div className="lectura-actions">
              {lectura.formato === 'FISICO' ? (
                <Link className="button secondary" to={`/libro/${libro.id}/seguimiento?lectura=${lectura.id}`}>
                  Seguimiento físico
                </Link>
              ) : (
                <Link className="button secondary" to={`/leer/${libro.id}?lectura=${lectura.id}`}>
                  Continuar leyendo
                </Link>
              )}
              <button type="button" className="link" onClick={() => void borrarLectura(lectura.id)} disabled={ocupado}>
                Quitar
              </button>
            </div>
          </li>
        ))}
      </ul>

      <form className="form lectura-form" onSubmit={agregarLectura}>
        <h3>Agregar lectura</h3>
        <div className="lectura-form-row">
          <label htmlFor="nuevo-formato">Formato</label>
          <select
            id="nuevo-formato"
            value={nuevoFormato}
            onChange={(event) => setNuevoFormato(event.target.value as FormatoLectura)}
          >
            {FORMATOS.map((formato) => (
              <option key={formato} value={formato}>
                {FORMATO_LABEL[formato]}
              </option>
            ))}
          </select>

          <label htmlFor="nuevas-paginas">Páginas totales</label>
          <input
            id="nuevas-paginas"
            inputMode="numeric"
            value={nuevasPaginas}
            placeholder={libro.cantidadPaginas != null ? String(libro.cantidadPaginas) : 'Opcional'}
            onChange={(event) => setNuevasPaginas(event.target.value)}
          />

          <button type="submit" className="button secondary" disabled={ocupado}>
            Agregar
          </button>
        </div>
      </form>

      {archivos.length > 0 && (
        <>
          <h2 className="home-heading">Archivos</h2>
          <ul className="files">
            {archivos.map((archivo) => (
              <li key={archivo.id}>
                <span className="file-kind">{archivo.formato}</span>
                <span>{archivo.nombre}</span>
                <span className="muted">{formatoArchivo(archivo.tamano)}</span>
              </li>
            ))}
          </ul>
        </>
      )}

      {accionError && <div className="alert">{accionError}</div>}

      <AnotacionPanel libroId={libro.id} lecturaId={lecturas[0]?.id ?? null} />
    </section>
  )
}
