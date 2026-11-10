import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react'
import { useAuth } from '../auth'
import * as api from '../services/comunidadApi'
import { claveClubLibro, listarLibros } from '../services/librosApi'
import type { Libro } from '../types'

function clubTieneId(club: api.Club): club is api.Club & { id: number } {
  return typeof club.id === 'number' && Number.isSafeInteger(club.id) && club.id > 0
}

export default function Comunidad() {
  const { user } = useAuth()
  const [amigos, setAmigos] = useState<api.Amigo[]>([])
  const [solicitudes, setSolicitudes] = useState<api.Solicitud[]>([])
  const [clubes, setClubes] = useState<api.Club[]>([])
  const [clubesPublicos, setClubesPublicos] = useState<api.Club[]>([])
  const [libros, setLibros] = useState<Libro[]>([])
  const [selected, setSelected] = useState<{ type: 'club' | 'friend'; id: number; name: string } | null>(null)
  const [mensajes, setMensajes] = useState<api.Mensaje[]>([])
  const [email, setEmail] = useState('')
  const [nombreClub, setNombreClub] = useState('')
  const [descripcionClub, setDescripcionClub] = useState('')
  const [clubPublico, setClubPublico] = useState(false)
  const [clubBookKey, setClubBookKey] = useState('')
  const [texto, setTexto] = useState('')
  const [error, setError] = useState('')
  const [info, setInfo] = useState('')
  const [inviteEmail, setInviteEmail] = useState('')
  const lastMessageId = useRef(0)

  const seleccionarConversacion = (conversacion: { type: 'club' | 'friend'; id: number; name: string }) => {
    lastMessageId.current = 0
    setMensajes([])
    setSelected(conversacion)
  }

  const cargar = useCallback(async () => {
    try {
      const [a, s, c, cp, b] = await Promise.all([api.listarAmigos(), api.listarSolicitudes(), api.listarClubes(), api.listarClubesPublicos(), listarLibros().catch(() => [])])
      setAmigos(a); setSolicitudes(s); setClubes(c); setClubesPublicos(cp); setLibros(b); setError('')
    } catch (e) { setError(e instanceof Error ? e.message : 'No se pudo cargar la comunidad.') }
  }, [])
  useEffect(() => { void cargar() }, [cargar])
  useEffect(() => {
    if (!selected) return
    let active = true
    let polling = false
    lastMessageId.current = 0
    const poll = async () => {
      if (polling) return
      polling = true
      try {
        const items = selected.type === 'club'
          ? await api.listarMensajesClub(selected.id, lastMessageId.current)
          : await api.listarMensajesAmigo(selected.id, lastMessageId.current)
        if (active && items.length) {
          lastMessageId.current = Math.max(lastMessageId.current, ...items.map((item) => item.id))
          setMensajes((old) => {
            const existentes = new Set(old.map((item) => item.id))
            return [...old, ...items.filter((item) => !existentes.has(item.id))]
          })
        }
      } catch { /* mantiene los mensajes visibles si una consulta falla */ }
      finally { polling = false }
    }
    void poll()
    const timer = window.setInterval(() => void poll(), 5000)
    return () => { active = false; window.clearInterval(timer) }
  }, [selected])

  const submit = async (event: FormEvent, action: () => Promise<unknown>, success: string) => {
    event.preventDefault(); setError(''); setInfo('')
    try { await action(); setInfo(success); await cargar() } catch (e) { setError(e instanceof Error ? e.message : 'No se pudo completar la acción.') }
  }
  const mandar = async (event: FormEvent) => {
    event.preventDefault()
    if (!selected || !texto.trim()) return
    try {
      const message = selected.type === 'club' ? await api.enviarMensajeClub(selected.id, texto.trim()) : await api.enviarMensajeAmigo(selected.id, texto.trim())
      setMensajes((old) => old.some((item) => item.id === message.id) ? old : [...old, message]); setTexto('')
    } catch (e) { setError(e instanceof Error ? e.message : 'No se pudo enviar el mensaje.') }
  }

  if (!user) return <section className="page"><h1>Comunidad</h1><p>Inicia sesión para conectar con amigos y clubes de lectura.</p></section>
  return <section className="page community-page">
    <header className="page-heading"><div><h1>Comunidad</h1><p>Amigos, clubes y conversaciones de lectura.</p></div></header>
    {error && <p className="error-message" role="alert">{error}</p>}{info && <p className="success-message" role="status">{info}</p>}
    <div className="community-grid">
      <div className="community-column">
        <section className="card community-panel"><h2>Amigos</h2>
          <form onSubmit={(e) => void submit(e, () => api.solicitarAmistad(email), 'Solicitud enviada.')} className="community-form"><label>Email de la persona<input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required /></label><button className="button" type="submit">Enviar solicitud</button></form>
          {solicitudes.filter((s) => s.recibida).map((s) => <div className="community-row" key={s.id}><span>{s.nombre} <small>{s.email}</small></span><span><button className="button" onClick={() => void submit({ preventDefault() {} } as FormEvent, () => api.responderSolicitud(s.id, true), 'Solicitud aceptada.')}>Aceptar</button> <button className="button secondary" onClick={() => void submit({ preventDefault() {} } as FormEvent, () => api.responderSolicitud(s.id, false), 'Solicitud rechazada.')}>Rechazar</button></span></div>)}
          {solicitudes.filter((s) => !s.recibida).map((s) => <div className="community-row" key={s.id}><span>Solicitud enviada a {s.nombre} <small>{s.email} · pendiente</small></span></div>)}
          <ul className="community-list">{amigos.map((friend) => <li key={friend.usuarioId}><button className="text-button" onClick={() => seleccionarConversacion({ type: 'friend', id: friend.usuarioId, name: friend.nombre })}>{friend.nombre}<small>{friend.email}</small></button><button className="button secondary" onClick={() => void submit({ preventDefault() {} } as FormEvent, () => api.quitarAmigo(friend.usuarioId), 'Amigo eliminado.')}>Quitar</button></li>)}</ul>
        </section>
        <section className="card community-panel"><h2>Clubes</h2>
          <form className="community-form club-create-form" onSubmit={(event) => {
            const elegido = libros.find((libro) => claveClubLibro(libro) === clubBookKey)
            void submit(event, () => api.crearClub({
              nombre: nombreClub,
              descripcion: descripcionClub,
              publico: clubPublico,
              bookKey: elegido ? claveClubLibro(elegido) : undefined,
              tituloLibro: elegido?.titulo,
            }), 'Club creado.')
          }}>
            <label>Nombre del club<input value={nombreClub} onChange={(event) => setNombreClub(event.target.value)} required maxLength={100} /></label>
            <label>Descripción<input value={descripcionClub} onChange={(event) => setDescripcionClub(event.target.value)} maxLength={500} /></label>
            <label>Libro compartido<select value={clubBookKey} onChange={(event) => setClubBookKey(event.target.value)}><option value="">Elegir más adelante</option>{libros.map((libro) => <option key={libro.id} value={claveClubLibro(libro)}>{libro.titulo} · {libro.autor}</option>)}</select></label>
            <label className="club-visibility"><input type="checkbox" checked={clubPublico} onChange={(event) => setClubPublico(event.target.checked)} /> Club público; cualquiera puede encontrarlo y unirse</label>
            <button className="button" type="submit">Crear club</button>
          </form>
          {clubes.map((club, index) => {
            const idValido = clubTieneId(club)
            return <div className="community-row" key={idValido ? club.id : `sin-id-${club.nombre}-${index}`}>
              <div>
                <button className="text-button" disabled={!idValido || club.estado !== 'ACTIVO'} onClick={() => idValido && seleccionarConversacion({ type: 'club', id: club.id, name: club.nombre })}>
                  <strong>{club.nombre}</strong><small>{club.publico ? 'Público' : 'Privado'} · {club.estado} · {club.rol}</small>
                </button>
                {club.descripcion && <p className="muted">{club.descripcion}</p>}
                {club.tituloLibro && <small>Lectura: {club.tituloLibro}</small>}
              </div>
              {club.estado === 'INVITADO' && idValido && <button className="button" onClick={() => void submit({ preventDefault() {} } as FormEvent, () => api.responderInvitacion(club.id, true), 'Te uniste al club.')}>Aceptar invitación</button>}
              {club.estado === 'ACTIVO' && club.rol === 'ADMIN' && idValido && <form className="community-form invite-form" onSubmit={(event) => void submit(event, () => api.invitarAlClub(club.id, inviteEmail), 'Invitación enviada.')}>
                <select aria-label={`Amigo para invitar a ${club.nombre}`} value={inviteEmail} onChange={(event) => setInviteEmail(event.target.value)} required>
                  <option value="">Elegí un amigo</option>{amigos.map((amigo) => <option key={amigo.usuarioId} value={amigo.email}>{amigo.nombre} · {amigo.email}</option>)}
                </select>
                <button className="button secondary" disabled={!amigos.length}>Invitar</button>
              </form>}
              {club.estado === 'ACTIVO' && idValido && <button className="button secondary" onClick={() => seleccionarConversacion({ type: 'club', id: club.id, name: club.nombre })}>Chat</button>}
              {club.estado === 'ACTIVO' && club.rol === 'ADMIN' && idValido && (
                <button
                  className="link"
                  onClick={() => {
                    if (!window.confirm(`¿Eliminar el club «${club.nombre}»? Se borrarán sus mensajes, invitaciones y comentarios. Esta acción no se puede deshacer.`)) return
                    void submit({ preventDefault() {} } as FormEvent, async () => {
                      await api.eliminarClub(club.id)
                      if (selected?.type === 'club' && selected.id === club.id) {
                        setSelected(null)
                        setMensajes([])
                        lastMessageId.current = 0
                      }
                    }, 'Club eliminado.')
                  }}
                >
                  Eliminar club
                </button>
              )}
            </div>
          })}
          <h3>Descubrir clubes públicos</h3>
          {clubesPublicos.filter((club) => club.estado === 'DISPONIBLE').map((club, index) => {
            const idValido = clubTieneId(club)
            return <div className="community-row" key={idValido ? club.id : `sin-id-${club.nombre}-${index}`}>
              <div><strong>{club.nombre}</strong><small>Creado por {club.nombreCreador}</small>{club.tituloLibro && <small>Lectura: {club.tituloLibro}</small>}{club.descripcion && <p className="muted">{club.descripcion}</p>}</div>
              {idValido && <button className="button secondary" onClick={() => void submit({ preventDefault() {} } as FormEvent, () => api.unirseAClub(club.id), `Te uniste a ${club.nombre}.`)}>Unirme</button>}
            </div>
          })}
          {clubesPublicos.every((club) => club.estado !== 'DISPONIBLE') && <p className="muted">Todavía no hay clubes públicos disponibles.</p>}
        </section>
      </div>
      <section className="card community-panel chat-panel"><h2>{selected ? `Chat: ${selected.name}` : 'Conversaciones'}</h2>{!selected ? <p className="muted">Seleccioná un amigo o club para abrir el chat.</p> : <><div className="chat-messages" aria-live="polite">{mensajes.map((m) => <article key={m.id} className={`chat-message ${m.autorId === user.id ? 'own' : ''}`}><strong>{m.autor}</strong><p>{m.texto}</p><small>{new Date(m.enviadoEn).toLocaleString()}</small></article>)}</div><form className="chat-compose" onSubmit={(e) => void mandar(e)}><input aria-label="Mensaje" value={texto} onChange={(e) => setTexto(e.target.value)} placeholder="Escribí un mensaje…" maxLength={2000} required /><button className="button">Enviar</button></form></>}</section>
    </div>
  </section>
}
