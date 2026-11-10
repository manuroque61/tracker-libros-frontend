import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { useAuth } from '../auth'
import * as api from '../services/comunidadApi'

interface Props { bookKey: string; titulo: string; porcentaje: number; ubicacion: string | null }

const COLORES = ['#8b5cf6', '#0ea5e9', '#e11d48', '#16a34a', '#d97706', '#db2777']

export function ComentariosClub({ bookKey, titulo, porcentaje, ubicacion }: Props) {
  const { user } = useAuth()
  const [clubs, setClubs] = useState<Array<api.Club & { id: number }>>([])
  const [clubId, setClubId] = useState<number | null>(null)
  const [items, setItems] = useState<api.ComentarioClub[]>([])
  const [temaActivoId, setTemaActivoId] = useState<number | null>(null)
  const [texto, setTexto] = useState('')
  const [error, setError] = useState('')

  const cargar = useCallback(async () => {
    if (!clubId) return
    try {
      setItems(await api.listarComentariosClub(clubId, bookKey, porcentaje))
      setError('')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudieron cargar las conversaciones.')
    }
  }, [bookKey, clubId, porcentaje])

  useEffect(() => {
    if (!user) return
    void api.listarClubes().then((list) => {
      const activos = list.filter((club): club is api.Club & { id: number } =>
        club.estado === 'ACTIVO'
        && typeof club.id === 'number'
        && Number.isSafeInteger(club.id)
        && club.id > 0
        && (!club.bookKey || club.bookKey === bookKey))
      setClubs(activos)
      setClubId((current) => activos.some((club) => club.id === current) ? current : activos[0]?.id ?? null)
    }).catch(() => setError('No se pudieron cargar tus clubes.'))
  }, [bookKey, user])

  useEffect(() => {
    void cargar()
    const timer = window.setInterval(() => void cargar(), 15000)
    return () => window.clearInterval(timer)
  }, [cargar])

  if (!user || clubs.length === 0) return null

  const temas = items.filter((item) => item.id === item.temaId)
  const temaActivo = temas.find((tema) => tema.id === temaActivoId) ?? null
  const respuestas = temaActivo ? items.filter((item) => item.temaId === temaActivo.id && item.id !== temaActivo.id) : []

  const publicar = async (event: FormEvent) => {
    event.preventDefault()
    if (!clubId || !texto.trim()) return
    try {
      const creado = await api.enviarComentarioClub(
        clubId, bookKey, titulo, texto.trim(), porcentaje,
        ubicacion ?? undefined, temaActivo?.id,
      )
      setTexto('')
      setTemaActivoId(creado.temaId)
      await cargar()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo publicar el mensaje.')
    }
  }

  return <section className="card community-panel reader-club-comments">
    <h2>Conversaciones del club en este libro</h2>
    <label>Club<select value={clubId ?? ''} onChange={(event) => { setClubId(Number(event.target.value)); setTemaActivoId(null) }}>
      {clubs.map((club) => <option key={club.id} value={club.id}>{club.nombre}{club.tituloLibro ? ` · ${club.tituloLibro}` : ''}</option>)}
    </select></label>
    <p className="muted">Los puntos marcan temas hasta tu posición actual ({Math.round(porcentaje)}%). Al abrir uno, ves el hilo completo.</p>
    {error && <p className="error-message" role="alert">{error}</p>}

    {temas.length > 0 ? <div className="club-topic-points" aria-label="Temas de conversación">
      {temas.map((tema, index) => <button
        type="button"
        key={tema.id}
        className={`club-topic-point ${temaActivoId === tema.id ? 'selected' : ''}`}
        onClick={() => setTemaActivoId(tema.id)}
        title={`${Math.round(tema.porcentaje)}% · ${tema.texto}`}
        aria-label={`Abrir tema de ${tema.autor} en el ${Math.round(tema.porcentaje)} por ciento`}
      ><span style={{ backgroundColor: COLORES[index % COLORES.length] }} />{Math.round(tema.porcentaje)}%</button>)}
    </div> : <p className="muted">Todavía no hay temas en esta parte. Podés iniciar el primero.</p>}

    {temaActivo && <section className="club-topic-thread" aria-label="Tema de conversación">
      <header><div><span className="muted">Tema · {Math.round(temaActivo.porcentaje)}% del libro</span><h3>{temaActivo.texto}</h3></div>
        <button type="button" className="text-button" onClick={() => setTemaActivoId(null)}>Nuevo tema</button>
      </header>
      <article className="club-topic-message"><strong>{temaActivo.autor}</strong><small>{new Date(temaActivo.creadoEn).toLocaleString()}</small></article>
      {respuestas.map((respuesta) => <article className="club-topic-message" key={respuesta.id}>
        <strong>{respuesta.autor}</strong><small>{new Date(respuesta.creadoEn).toLocaleString()}</small><p>{respuesta.texto}</p>
      </article>)}
      {respuestas.length === 0 && <p className="muted">Todavía no hay respuestas.</p>}
    </section>}

    <form className="community-form" onSubmit={(event) => void publicar(event)}>
      <label>{temaActivo ? `Responder a ${temaActivo.autor}` : `Iniciar un tema en el ${Math.round(porcentaje)}%`}
        <textarea value={texto} onChange={(event) => setTexto(event.target.value)} maxLength={2000} required rows={3} />
      </label>
      <button className="button" type="submit">{temaActivo ? 'Responder' : 'Iniciar tema'}</button>
    </form>
  </section>
}
