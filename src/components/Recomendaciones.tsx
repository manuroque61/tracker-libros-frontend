import { Link } from 'react-router-dom'
import type { Recomendacion } from '../services/recomendaciones'
import { BookCover } from './BookCover'

interface RecomendacionesProps {
  items: Recomendacion[]
}

export function Recomendaciones({ items }: RecomendacionesProps) {
  if (items.length === 0) return null

  return (
    <section className="home-section">
      <h2 className="home-heading">Recomendados para vos</h2>
      <ul className="reco-list">
        {items.map(({ libro, motivo }) => (
          <li key={libro.id} className="reco-item">
            <BookCover src={libro.portadaUrl ?? undefined} title={libro.titulo} />
            <div className="reco-body">
              <Link className="reco-title" to={`/libro/${libro.id}`}>
                {libro.titulo}
              </Link>
              <p className="authors">{libro.autor}</p>
              <p className="muted">{motivo}</p>
              <Link className="button secondary" to={`/libro/${libro.id}`}>
                Ver libro
              </Link>
            </div>
          </li>
        ))}
      </ul>
    </section>
  )
}
