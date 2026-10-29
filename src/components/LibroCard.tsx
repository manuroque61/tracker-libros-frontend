import { Link } from 'react-router-dom'
import type { Lectura, Libro } from '../types'
import { ESTADO_LABEL, FORMATO_LABEL } from '../types'
import { BookCover } from './BookCover'
import { Progreso } from './Progreso'

interface LibroCardProps {
  libro: Libro
  lecturas: Lectura[]
}

export function LibroCard({ libro, lecturas }: LibroCardProps) {
  const formatos = [...new Set(lecturas.map((lectura) => lectura.formato))]
  const progreso = lecturas.length > 0 ? Math.max(...lecturas.map((lectura) => lectura.porcentaje)) : 0
  const principal = lecturas.find((lectura) => lectura.estado === 'LEYENDO') ?? lecturas[0]

  return (
    <li className="card">
      <BookCover src={libro.portadaUrl ?? undefined} title={libro.titulo} />
      <div className="card-body">
        <h2>{libro.titulo}</h2>
        <p className="authors">{libro.autor}</p>
        <p className="meta">
          {libro.genero && <span>{libro.genero}</span>}
          {formatos.map((formato) => (
            <span key={formato} className={`badge-formato badge-${formato.toLowerCase()}`}>
              {FORMATO_LABEL[formato]}
            </span>
          ))}
          {principal && <span className={`badge-estado estado-${principal.estado.toLowerCase()}`}>{ESTADO_LABEL[principal.estado]}</span>}
        </p>
        {lecturas.length > 0 && <Progreso value={progreso} label={`${Math.round(progreso)}%`} />}
        <div className="card-actions">
          {formatos.some((formato) => formato !== 'FISICO') && (
            <Link className="button secondary" to={`/leer/${libro.id}`}>
              Leer en línea
            </Link>
          )}
          <Link className="button secondary" to={`/libro/${libro.id}`}>
            Ver detalle
          </Link>
        </div>
      </div>
    </li>
  )
}