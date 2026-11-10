import { useCallback, useState, type FormEvent } from 'react'
import type { Anotacion, TipoAnotacion } from '../types'
import { TIPO_ANOTACION_LABEL } from '../types'
import { useAsync } from '../hooks/useAsync'
import { errorMessage } from '../services/apiClient'
import { crear, eliminar, listarPorLibro } from '../services/anotacionesApi'

interface AnotacionPanelProps {
  libroId: string
  lecturaId?: string | null
  ubicacionActual?: string | null
  porcentajeActual?: number | null
  requiereProgreso?: boolean
  onVerUbicacion?: (anotacion: Anotacion) => void
}

const TIPOS: TipoAnotacion[] = ['NOTA', 'RESALTADO', 'MARCADOR']

export function AnotacionPanel({
  libroId,
  lecturaId,
  ubicacionActual,
  porcentajeActual,
  requiereProgreso = false,
  onVerUbicacion,
}: AnotacionPanelProps) {
  const loader = useCallback(() => listarPorLibro(libroId), [libroId])
  const { data, loading, error, reload } = useAsync(loader)
  const [tipo, setTipo] = useState<TipoAnotacion>('NOTA')
  const [texto, setTexto] = useState('')
  const [guardando, setGuardando] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  const anotaciones = data ?? []

  async function onSubmit(event: FormEvent) {
    event.preventDefault()
    if (requiereProgreso && porcentajeActual == null) {
      setFormError('Esperá a que el lector marque tu progreso antes de guardar la anotación.')
      return
    }
    if (tipo !== 'MARCADOR' && !texto.trim()) {
      setFormError('Escribí el texto de la anotación.')
      return
    }
    setGuardando(true)
    setFormError(null)
    try {
      await crear({
        libroId,
        lecturaId: lecturaId ?? null,
        tipo,
        texto: texto.trim() || TIPO_ANOTACION_LABEL[tipo],
        cita: tipo === 'RESALTADO' ? texto.trim() || null : null,
        ubicacion: ubicacionActual?.trim() || null,
        porcentaje: porcentajeActual == null ? null : Math.min(100, Math.max(0, porcentajeActual)),
      })
      setTexto('')
      reload()
    } catch (err) {
      setFormError(errorMessage(err))
    } finally {
      setGuardando(false)
    }
  }

  async function onEliminar(id: string) {
    await eliminar(id)
    reload()
  }

  return (
    <section className="anotaciones">
      <h2 className="home-heading">Anotaciones</h2>
      <form className="form" onSubmit={onSubmit}>
        <label htmlFor="anotacion-tipo">Tipo</label>
        <select id="anotacion-tipo" value={tipo} onChange={(event) => setTipo(event.target.value as TipoAnotacion)}>
          {TIPOS.map((option) => (
            <option key={option} value={option}>
              {TIPO_ANOTACION_LABEL[option]}
            </option>
          ))}
        </select>
        <label htmlFor="anotacion-texto">Texto</label>
        <input
          id="anotacion-texto"
          value={texto}
          onChange={(event) => setTexto(event.target.value)}
          placeholder={tipo === 'MARCADOR' ? 'Etiqueta del marcador (opcional)' : 'Escribí una nota o cita…'}
        />
        {formError && <p className="hint">{formError}</p>}
        {requiereProgreso && porcentajeActual == null && (
          <p className="muted">La anotación guardará el punto del libro cuando el lector indique tu progreso.</p>
        )}
        <button type="submit" disabled={guardando || (requiereProgreso && porcentajeActual == null)} className="button secondary">
          {guardando ? 'Guardando…' : 'Agregar anotación'}
        </button>
      </form>

      {loading && <p className="muted">Cargando anotaciones…</p>}
      {error && <div className="alert">{error}</div>}
      {!loading && !error && anotaciones.length === 0 && (
        <p className="muted">Todavía no hay notas, resaltados ni marcadores para este libro.</p>
      )}

      {anotaciones.length > 0 && (
        <ul className="anotacion-list">
          {anotaciones.map((anotacion) => (
            <li key={anotacion.id} className="anotacion-item">
              <div className="anotacion-head">
                <span className={`badge-estado tipo-${anotacion.tipo.toLowerCase()}`}>
                  {TIPO_ANOTACION_LABEL[anotacion.tipo]}
                </span>
                {anotacion.porcentaje != null && <span className="muted">{Math.round(anotacion.porcentaje)}%</span>}
              </div>
              <p className="anotacion-texto">{anotacion.texto}</p>
              <div className="anotacion-actions">
                {onVerUbicacion && (anotacion.ubicacion || anotacion.porcentaje != null) && (
                  <button type="button" className="link" onClick={() => onVerUbicacion(anotacion)}>
                    {anotacion.porcentaje != null ? `Ir al punto guardado (${Math.round(anotacion.porcentaje)}%)` : 'Ir a ubicación'}
                  </button>
                )}
                <button type="button" className="link" onClick={() => void onEliminar(anotacion.id)}>
                  Eliminar
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
