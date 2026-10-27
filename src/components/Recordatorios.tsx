import { Link } from 'react-router-dom'
import type { Lectura, Libro } from '../types'
import { BookCover } from './BookCover'

const DIAS_INACTIVIDAD = 3
const MS_POR_DIA = 86_400_000
const MAX_AVISOS = 3

interface RecordatoriosProps {
  libros: Libro[]
  lecturas: Lectura[]
}

interface Aviso {
  lectura: Lectura
  libro: Libro
  dias: number
}

function armarAvisos(libros: Libro[], lecturas: Lectura[]): Aviso[] {
  const librosPorId = new Map(libros.map((libro) => [libro.id, libro]))
  const hoy = Date.now()

  return lecturas
    .map((lectura) => {
      if (!lectura.ultimaLectura) return null
      if (lectura.estado !== 'LEYENDO' && lectura.estado !== 'PAUSADO') return null
      const libro = librosPorId.get(lectura.libroId)
      if (!libro) return null
      const dias = Math.floor((hoy - new Date(lectura.ultimaLectura).getTime()) / MS_POR_DIA)
      return { lectura, libro, dias }
    })
    .filter((aviso): aviso is Aviso => aviso !== null && aviso.dias >= DIAS_INACTIVIDAD)
    .sort((a, b) => b.dias - a.dias)
    .slice(0, MAX_AVISOS)
}

export function Recordatorios({ libros, lecturas }: RecordatoriosProps) {
  const avisos = armarAvisos(libros, lecturas)
  if (avisos.length === 0) return null

  return (
    <section className="home-section">
      <h2 className="home-heading">Retomá tu lectura</h2>
      <ul className="reco-list">
        {avisos.map(({ lectura, libro, dias }) => {
          const destino =
            lectura.formato === 'FISICO'
              ? `/libro/${libro.id}/seguimiento?lectura=${lectura.id}`
              : `/leer/${libro.id}?lectura=${lectura.id}`

          return (
            <li key={lectura.id} className="reco-item">
              <BookCover src={libro.portadaUrl ?? undefined} title={libro.titulo} />
              <div className="reco-body">
                <Link className="reco-title" to={`/libro/${libro.id}`}>
                  {libro.titulo}
                </Link>
                <p className="authors">{libro.autor}</p>
                <p className="muted">Hace {dias} días que no lo continuás.</p>
                <Link className="button secondary" to={destino}>
                  Seguir leyendo
                </Link>
              </div>
            </li>
          )
        })}
      </ul>
    </section>
  )
}
