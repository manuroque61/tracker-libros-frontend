import { useState } from 'react'
import { eliminarResena, guardarResena, obtenerResena } from '../services/resenasApi'

interface ResenaLibroProps {
  libroId: string
}

type Aviso = { tipo: 'ok' | 'error'; texto: string }

export function ResenaLibro({ libroId }: ResenaLibroProps) {
  const [resena, setResena] = useState(() => obtenerResena(libroId))
  const [estrellas, setEstrellas] = useState(resena?.estrellas ?? 0)
  const [texto, setTexto] = useState(resena?.texto ?? '')
  const [aviso, setAviso] = useState<Aviso | null>(null)

  function guardar() {
    if (estrellas === 0) {
      setAviso({ tipo: 'error', texto: 'Elegí al menos una estrella.' })
      return
    }
    const guardada = guardarResena(libroId, estrellas, texto)
    setResena(guardada)
    setTexto(guardada.texto)
    setAviso({ tipo: 'ok', texto: 'Reseña guardada.' })
  }

  function borrar() {
    eliminarResena(libroId)
    setResena(null)
    setEstrellas(0)
    setTexto('')
    setAviso({ tipo: 'ok', texto: 'Reseña eliminada.' })
  }

  return (
    <section className="resena">
      <h2 className="home-heading">Tu reseña</h2>
      <div className="estrellas" role="group" aria-label="Puntuación con estrellas">
        {[1, 2, 3, 4, 5].map((valor) => (
          <button
            key={valor}
            type="button"
            className={`estrella${valor <= estrellas ? ' estrella-activa' : ''}`}
            aria-label={`${valor} ${valor === 1 ? 'estrella' : 'estrellas'}`}
            aria-pressed={valor <= estrellas}
            onClick={() => {
              setEstrellas(valor)
              setAviso(null)
            }}
          >
            ★
          </button>
        ))}
        <span className="muted">{estrellas > 0 ? `${estrellas} de 5` : 'Sin puntuar'}</span>
      </div>

      <label className="resena-label" htmlFor="resena-texto">
        Comentario
      </label>
      <textarea
        id="resena-texto"
        className="resena-texto"
        value={texto}
        maxLength={1000}
        placeholder="¿Qué te pareció?"
        onChange={(event) => {
          setTexto(event.target.value)
          setAviso(null)
        }}
      />

      <div className="resena-actions">
        <button type="button" className="button secondary" onClick={guardar}>
          Guardar reseña
        </button>
        {resena && (
          <button type="button" className="link" onClick={borrar}>
            Eliminar reseña
          </button>
        )}
      </div>

      {aviso && (
        <p className={aviso.tipo === 'error' ? 'resena-msg resena-error' : 'resena-msg'} role="status">
          {aviso.texto}
        </p>
      )}
    </section>
  )
}
