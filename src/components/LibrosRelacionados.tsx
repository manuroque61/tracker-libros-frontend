import { Link } from 'react-router-dom'
import type { Libro } from '../types'
import { BookCover } from './BookCover'

interface LibrosRelacionadosProps {
  libro: Libro
  todos: Libro[]
}

function seccion(titulo: string, items: Libro[]) {
  if (items.length === 0) return null
  return (
    <section className="home-section">
      <h2 className="home-heading">{titulo}</h2>
      <ul className="reco-list">
        {items.map((libro) => (
          <li key={libro.id} className="reco-item">
            <BookCover src={libro.portadaUrl ?? undefined} title={libro.titulo} />
            <div className="reco-body">
              <Link className="reco-title" to={`/libro/${libro.id}`}>
                {libro.titulo}
              </Link>
              <p className="authors">{libro.autor}</p>
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

export function LibrosRelacionados({ libro, todos }: LibrosRelacionadosProps) {
  const otros = todos.filter((l) => l.id !== libro.id)
  const mismoAutor = otros.filter((l) => l.autor === libro.autor)
  const mismoGenero = otros.filter((l) => l.genero && libro.genero && l.genero === libro.genero)

  return (
    <>
      {seccion('Secuelas / precuelas (mismo autor)', mismoAutor)}
      {seccion('Libros similares (mismo género)', mismoGenero)}
    </>
  )
}
