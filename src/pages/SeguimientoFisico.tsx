import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import { Progreso } from '../components/Progreso'
import { useAsync } from '../hooks/useAsync'
import { errorMessage } from '../services/apiClient'
import { obtenerLibro } from '../services/librosApi'
import {
  actualizarProgreso,
  crearLectura,
  listarPorLibro,
  listarSesiones,
  registrarSesion,
} from '../services/lecturasApi'
import type { EstadoLectura, Lectura, Libro } from '../types'
import { ESTADOS, ESTADO_LABEL } from '../types'

interface Seguimiento {
  libro: Libro | null
  lectura: Lectura | null
}

function toInputDate(iso?: string | null): string {
  return iso ? iso.slice(0, 10) : ''
}

function fromInputDate(value: string): string | null {
  return value ? new Date(`${value}T12:00:00`).toISOString() : null
}

export default function SeguimientoFisico() {
  const { id } = useParams()
  const [searchParams] = useSearchParams()

  const loader = useCallback(async (): Promise<Seguimiento> => {
    if (!id) return { libro: null, lectura: null }
    const libro = await obtenerLibro(id)
    const lecturas = await listarPorLibro(id)
    const preferida = searchParams.get('lectura')
    let lectura =
      (preferida ? lecturas.find((item) => item.id === preferida) : undefined) ??
      lecturas.find((item) => item.formato === 'FISICO') ??
      null
    if (!lectura) {
      lectura = await crearLectura(id, 'FISICO', libro?.cantidadPaginas ?? null)
    }
    return { libro, lectura }
  }, [id, searchParams])
  const { data, loading, error, reload } = useAsync(loader)

  const lecturaId = data?.lectura?.id
  const sesionesLoader = useCallback(
    () => (lecturaId ? listarSesiones(lecturaId) : Promise.resolve([])),
    [lecturaId],
  )
  const { data: sesiones, reload: reloadSesiones } = useAsync(sesionesLoader)

  const [estado, setEstado] = useState<EstadoLectura>('PENDIENTE')
  const [pagina, setPagina] = useState('')
  const [total, setTotal] = useState('')
  const [fechaInicio, setFechaInicio] = useState('')
  const [fechaFin, setFechaFin] = useState('')
  const [minutos, setMinutos] = useState('')
  const [paginasLeidas, setPaginasLeidas] = useState('')
  const [nota, setNota] = useState('')
  const [ocupado, setOcupado] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [ok, setOk] = useState<string | null>(null)

  const lectura = data?.lectura ?? null

  useEffect(() => {
    if (!lectura) return
    setEstado(lectura.estado)
    setPagina(lectura.paginaActual != null ? String(lectura.paginaActual) : '')
    setTotal(lectura.totalPaginas != null ? String(lectura.totalPaginas) : '')
    setFechaInicio(toInputDate(lectura.fechaInicio))
    setFechaFin(toInputDate(lectura.fechaFin))
  }, [lectura?.id, lectura?.ultimaLectura])

  async function onSubmit(event: FormEvent) {
    event.preventDefault()
    if (!lectura) return
    setOcupado(true)
    setFormError(null)
    setOk(null)
    try {
      const totalNum = Number.parseInt(total, 10)
      const pagNum = Number.parseInt(pagina, 10)
      const totalPag = Number.isNaN(totalNum) ? lectura.totalPaginas ?? null : totalNum
      const paginaActual = Number.isNaN(pagNum) ? lectura.paginaActual ?? 0 : pagNum
      const porcentaje = totalPag && totalPag > 0 ? Math.round((paginaActual / totalPag) * 100) : lectura.porcentaje

      await actualizarProgreso(lectura.id, {
        porcentaje,
        paginaActual,
        totalPaginas: totalPag,
        estado,
        fechaInicio: fechaInicio ? fromInputDate(fechaInicio) : null,
        fechaFin: fechaFin ? fromInputDate(fechaFin) : null,
      })

      const min = minutos.trim()
      const pags = paginasLeidas.trim()
      if (min || pags || nota.trim()) {
        await registrarSesion(lectura.id, {
          minutos: min ? Number.parseInt(min, 10) : null,
          paginasLeidas: pags ? Number.parseInt(pags, 10) : null,
          paginaActual,
          nota: nota.trim() || null,
        })
        setMinutos('')
        setPaginasLeidas('')
        setNota('')
      }

      reload()
      reloadSesiones()
      setOk('Progreso guardado.')
    } catch (err) {
      setFormError(errorMessage(err))
    } finally {
      setOcupado(false)
    }
  }

  if (loading) {
    return (
      <p className="muted placeholder">
        <span className="spinner" /> Cargando seguimiento…
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
  if (!libro || !lectura) {
    return (
      <div className="empty">
        <p>No encontramos este libro.</p>
        <Link className="button" to="/biblioteca">
          Volver a la biblioteca
        </Link>
      </div>
    )
  }

  return (
    <section>
      <p>
        <Link to={`/libro/${libro.id}`} className="back-link">
          ← {libro.titulo}
        </Link>
      </p>

      <header className="page-header">
        <h1>Seguimiento físico</h1>
        <p className="muted">Registrá tu estado, la página actual y las sesiones de lectura de este ejemplar.</p>
      </header>

      <div className="seguimiento-resumen">
        <span className={`badge-estado estado-${lectura.estado.toLowerCase()}`}>{ESTADO_LABEL[lectura.estado]}</span>
        <Progreso value={lectura.porcentaje} />
      </div>

      <form className="form seguimiento-form" onSubmit={onSubmit}>
        <div className="form-grid">
          <div className="form-fields">
            <label htmlFor="s-estado">Estado</label>
            <select id="s-estado" value={estado} onChange={(event) => setEstado(event.target.value as EstadoLectura)}>
              {ESTADOS.map((option) => (
                <option key={option} value={option}>
                  {ESTADO_LABEL[option]}
                </option>
              ))}
            </select>

            <label htmlFor="s-pagina">Página actual</label>
            <input id="s-pagina" inputMode="numeric" value={pagina} onChange={(event) => setPagina(event.target.value)} />

            <label htmlFor="s-total">Páginas totales</label>
            <input id="s-total" inputMode="numeric" value={total} onChange={(event) => setTotal(event.target.value)} />

            <label htmlFor="s-inicio">Fecha de inicio</label>
            <input id="s-inicio" type="date" value={fechaInicio} onChange={(event) => setFechaInicio(event.target.value)} />

            <label htmlFor="s-fin">Fecha de finalización</label>
            <input id="s-fin" type="date" value={fechaFin} onChange={(event) => setFechaFin(event.target.value)} />
          </div>

          <div className="form-fields sesion-box">
            <h3>Nueva sesión (opcional)</h3>
            <label htmlFor="s-minutos">Minutos</label>
            <input id="s-minutos" inputMode="numeric" value={minutos} onChange={(event) => setMinutos(event.target.value)} />

            <label htmlFor="s-leidas">Páginas leídas</label>
            <input
              id="s-leidas"
              inputMode="numeric"
              value={paginasLeidas}
              onChange={(event) => setPaginasLeidas(event.target.value)}
            />

            <label htmlFor="s-nota">Nota</label>
            <input id="s-nota" value={nota} onChange={(event) => setNota(event.target.value)} />
          </div>
        </div>

        {formError && <div className="alert">{formError}</div>}
        {ok && <div className="alert success">{ok}</div>}

        <div className="form-actions">
          <button type="submit" disabled={ocupado}>
            {ocupado ? 'Guardando…' : 'Guardar progreso'}
          </button>
        </div>
      </form>

      <h2 className="home-heading">Historial de sesiones</h2>
      {(!sesiones || sesiones.length === 0) && <p className="muted">Todavía no hay sesiones registradas.</p>}
      {sesiones && sesiones.length > 0 && (
        <ul className="sesion-list">
          {sesiones.map((sesion) => (
            <li key={sesion.id}>
              <span className="sesion-fecha">{new Date(sesion.fecha).toLocaleDateString('es', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
              {sesion.minutos != null && <span>{sesion.minutos} min</span>}
              {sesion.paginasLeidas != null && <span>{sesion.paginasLeidas} págs.</span>}
              {sesion.paginaActual != null && <span className="muted">pág. {sesion.paginaActual}</span>}
              {sesion.nota && <span className="muted">· {sesion.nota}</span>}
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
