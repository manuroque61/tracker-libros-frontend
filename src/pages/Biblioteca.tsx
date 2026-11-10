import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { LibroCard } from '../components/LibroCard'
import { Recomendaciones } from '../components/Recomendaciones'
import { Recordatorios } from '../components/Recordatorios'
import { ComentariosRecientes } from '../components/ComentariosRecientes'
import { useAsync } from '../hooks/useAsync'
import { useLocalStorage } from '../hooks/useLocalStorage'
import { claveClubLibro, listarLibros } from '../services/librosApi'
import { listarTodas } from '../services/lecturasApi'
import { recomendarLibros } from '../services/recomendaciones'
import { listarResenas } from '../services/resenasApi'
import { useAuth } from '../auth'
import { listarActividadAmigos, listarRecomendaciones, syncCalificaciones, type ActividadLectura, type Recomendacion } from '../services/comunidadApi'
import type { EstadoLectura, FormatoLectura, Lectura, Libro, Resena } from '../types'
import { ESTADOS, ESTADO_LABEL, FORMATOS, FORMATO_LABEL } from '../types'

type FiltroFormato = 'TODOS' | FormatoLectura
type FiltroEstado = 'TODOS' | EstadoLectura

interface BibliotecaData {
  libros: Libro[]
  lecturas: Lectura[]
  resenas: Resena[]
}
const LIBROS_VACIOS: Libro[] = []
const RESENAS_VACIAS: Resena[] = []

function StatCard({ valor, etiqueta }: { valor: number | string; etiqueta: string }) {
  return (
    <li className="stat-card">
      <span className="stat-valor">{valor}</span>
      <span className="stat-etiqueta">{etiqueta}</span>
    </li>
  )
}

export default function Biblioteca() {
  const { user } = useAuth()
  const [recomendacionesAmigos, setRecomendacionesAmigos] = useState<Recomendacion[]>([])
  const [actividadAmigos, setActividadAmigos] = useState<ActividadLectura[]>([])
  const [busqueda, setBusqueda] = useState('')
  const loader = useCallback(async (): Promise<BibliotecaData> => {
    const [libros, lecturas] = await Promise.all([listarLibros(), listarTodas()])
    return { libros, lecturas, resenas: listarResenas() }
  }, [])
  const { data, loading, error, reload } = useAsync(loader)

  const [formato, setFormato] = useLocalStorage<FiltroFormato>('biblioteca.formato', 'TODOS')
  const [estado, setEstado] = useLocalStorage<FiltroEstado>('biblioteca.estado', 'TODOS')

  const libros = data?.libros ?? LIBROS_VACIOS
  const lecturas = data?.lecturas ?? []
  const resenas = data?.resenas ?? RESENAS_VACIAS
  useEffect(() => {
    if (!user || !data) return
    let active = true
    const sincronizadas = resenas.flatMap((review) => {
      const book = libros.find((item) => item.id === review.libroId)
      return book ? [{ bookKey: claveClubLibro(book), titulo: book.titulo, autor: book.autor, portadaUrl: book.portadaUrl ?? undefined, estrellas: review.estrellas, comentario: review.texto }] : []
    })
    void syncCalificaciones(sincronizadas)
      .then(() => Promise.all([listarRecomendaciones(), listarActividadAmigos()]))
      .then(([recomendaciones, actividad]) => {
        if (!active) return
        setRecomendacionesAmigos(recomendaciones)
        setActividadAmigos(actividad)
      })
      .catch(() => { /* La biblioteca personal sigue disponible sin la comunidad. */ })
    return () => { active = false }
  }, [data, libros, resenas, user])
  const lecturasAgrupadas = new Map<string, Lectura[]>()
  for (const lectura of lecturas) {
    const delLibro = lecturasAgrupadas.get(lectura.libroId) ?? []
    delLibro.push(lectura)
    lecturasAgrupadas.set(lectura.libroId, delLibro)
  }
  const lecturasDe = (libroId: string) => lecturasAgrupadas.get(libroId) ?? []
  const lecturaPrincipalPorLibro = new Map(lecturas.map((lectura) => [lectura.libroId, lectura]))

  const totalLibros = libros.length
  const pendientes = libros.filter((libro) => {
    const lectura = lecturaPrincipalPorLibro.get(libro.id)
    return !lectura || lectura.estado === 'PENDIENTE'
  }).length
  const leyendo = lecturas.filter((lectura) => lectura.estado === 'LEYENDO').length
  const terminados = lecturas.filter((lectura) => lectura.estado === 'TERMINADO').length

  const terminoBusqueda = busqueda.trim().toLocaleLowerCase()
  const filtrados = libros.filter((libro) => {
    if (terminoBusqueda && !`${libro.titulo} ${libro.autor}`.toLocaleLowerCase().includes(terminoBusqueda)) return false
    const suyas = lecturasDe(libro.id)
    if (formato !== 'TODOS' && !suyas.some((lectura) => lectura.formato === formato)) return false
    if (estado !== 'TODOS' && !suyas.some((lectura) => lectura.estado === estado)) return false
    return true
  })

  return (
    <section>
      <header className="page-header">
        <h1>Biblioteca</h1>
        <p className="muted">
          Una sola biblioteca para libros físicos y digitales. Filtrá por formato, estado o buscá por título y autor.
        </p>
      </header>

      {!loading && !error && (
        <>
          <ul className="stat-grid">
            <StatCard valor={totalLibros} etiqueta="Libros" />
            <StatCard valor={pendientes} etiqueta="Pendientes a leer" />
            <StatCard valor={leyendo} etiqueta="Leyendo" />
            <StatCard valor={terminados} etiqueta="Terminados" />
          </ul>
          <Recordatorios libros={libros} lecturas={lecturas} />
          <Recomendaciones items={recomendarLibros(libros, lecturas, resenas)} />
          {user && actividadAmigos.length > 0 && <section className="card community-panel friend-recommendations"><h2>Lo que están leyendo tus amigos</h2><div className="friend-books">{actividadAmigos.map((item) => <article key={`${item.amigoId}-${item.libroId}`}><strong>{item.titulo}</strong><span>{item.autor}</span><span>{item.amigo} · {Math.round(item.porcentaje)}% leído</span><div className="reading-progress"><div className="reading-progress-track"><span style={{ width: `${Math.max(0, Math.min(100, item.porcentaje))}%` }} /></div></div></article>)}</div></section>}
          <ComentariosRecientes />
          {user && recomendacionesAmigos.length > 0 && <section className="card community-panel friend-recommendations"><h2>Bien valorados por tus amigos</h2><div className="friend-books">{recomendacionesAmigos.map((item) => <article key={`${item.amigoId}-${item.bookKey}`}><strong>{item.titulo}</strong><span>{item.autor}</span><span>{'★'.repeat(item.estrellas)} · {item.amigo}</span>{item.comentario && <p>{item.comentario}</p>}</article>)}</div></section>}
        </>
      )}

      <div className="biblioteca-toolbar">
        <Link className="button" to="/agregar">
          + Agregar libro
        </Link>
        <Link className="button" to="/gutenberg" style={{marginLeft: 16}}>
          Gutenberg
        </Link>
      </div>

      <label className="search-form">
        <span aria-hidden="true">⌕</span>
        <input
          type="search"
          aria-label="Buscar libros por título o autor"
          placeholder="Buscar por título o autor…"
          value={busqueda}
          onChange={(event) => setBusqueda(event.target.value)}
        />
      </label>

      <div className="chips-row">
        <span className="chips-label">Formato:</span>
        <div className="genre-chips" role="group" aria-label="Filtrar por formato">
          <button
            type="button"
            className={`chip${formato === 'TODOS' ? ' chip-active' : ''}`}
            onClick={() => setFormato('TODOS')}
          >
            Todos
          </button>
          {FORMATOS.map((option) => (
            <button
              key={option}
              type="button"
              className={`chip${formato === option ? ' chip-active' : ''}`}
              onClick={() => setFormato(option)}
            >
              {FORMATO_LABEL[option]}
            </button>
          ))}
        </div>
      </div>

      <div className="chips-row">
        <span className="chips-label">Estado:</span>
        <div className="genre-chips" role="group" aria-label="Filtrar por estado">
          <button
            type="button"
            className={`chip${estado === 'TODOS' ? ' chip-active' : ''}`}
            onClick={() => setEstado('TODOS')}
          >
            Todos
          </button>
          {ESTADOS.map((option) => (
            <button
              key={option}
              type="button"
              className={`chip${estado === option ? ' chip-active' : ''}`}
              onClick={() => setEstado(option)}
            >
              {ESTADO_LABEL[option]}
            </button>
          ))}
        </div>
      </div>

      {loading && (
        <p className="muted placeholder">
          <span className="spinner" /> Cargando tu biblioteca…
        </p>
      )}
      {error && (
        <div className="alert">
          {error} <button type="button" className="link" onClick={reload}>Reintentar</button>
        </div>
      )}

      {!loading && !error && libros.length === 0 && (
        <div className="empty">
          <p>Tu biblioteca está vacía.</p>
          <Link className="button" to="/agregar">
            Agregar el primer libro
          </Link>
        </div>
      )}

      {!loading && !error && libros.length > 0 && filtrados.length === 0 && (
        <p className="muted placeholder">No hay libros que coincidan con la búsqueda o los filtros.</p>
      )}

      {filtrados.length > 0 && (
        <ul className="grid">
          {filtrados.map((libro) => (
            <LibroCard key={libro.id} libro={libro} lecturas={lecturasDe(libro.id)} />
          ))}
        </ul>
      )}

    </section>
  )
}
