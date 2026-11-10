import { useEffect, useState } from 'react'
import { useAuth } from '../auth'
import * as api from '../services/comunidadApi'

export function ResenasAmigosLibro({ bookKey }: { bookKey: string }) {
  const { user } = useAuth()
  const [resenas, setResenas] = useState<api.Recomendacion[]>([])
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [pagina, setPagina] = useState(0)
  const [hayMas, setHayMas] = useState(false)

  useEffect(() => {
    if (!user) return
    let active = true
    void api.listarComentariosLibro(bookKey)
      .then((result) => { if (active) { setResenas(result.comentarios); setHayMas(result.hayMas); setLoading(false) } })
      .catch((err: unknown) => { if (active) { setError(err instanceof Error ? err.message : 'No se pudieron cargar las opiniones.'); setLoading(false) } })
    return () => { active = false }
  }, [bookKey, user])

  async function cargarMas() {
    const siguiente = pagina + 1
    setLoading(true)
    setError('')
    try {
      const result = await api.listarComentariosLibro(bookKey, siguiente)
      setResenas((actuales) => {
        const ids = new Set(actuales.map((item) => item.id))
        return [...actuales, ...result.comentarios.filter((item) => !ids.has(item.id))]
      })
      setPagina(siguiente)
      setHayMas(result.hayMas)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudieron cargar más comentarios.')
    } finally {
      setLoading(false)
    }
  }

  if (!user) return null
  return <section className="card community-panel friend-recommendations">
    <h2>Opiniones de lectores</h2>
    {error && <p className="error-message" role="alert">{error}</p>}
    {loading && <p className="muted">Cargando reseñas…</p>}
    {!loading && !error && resenas.length === 0 && <p className="muted">Todavía no hay comentarios para este libro.</p>}
    {resenas.length > 0 && <div className="friend-books">{resenas.map((resena) => <article key={resena.id}>
      <strong>{resena.amigo}</strong>
      <span aria-label={`${resena.estrellas} de 5 estrellas`}>{'★'.repeat(resena.estrellas)}{'☆'.repeat(5 - resena.estrellas)}</span>
      {resena.comentario && <p>{resena.comentario}</p>}
    </article>)}</div>}
    {hayMas && <button type="button" className="button secondary" onClick={() => void cargarMas()} disabled={loading}>{loading ? 'Cargando…' : 'Cargar más comentarios'}</button>}
  </section>
}
