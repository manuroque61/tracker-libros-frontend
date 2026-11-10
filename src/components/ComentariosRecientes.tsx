import { useEffect, useState } from 'react'
import { useAuth } from '../auth'
import * as api from '../services/comunidadApi'

export function ComentariosRecientes() {
  const { user } = useAuth()
  const [comentarios, setComentarios] = useState<api.Recomendacion[]>([])
  const [pagina, setPagina] = useState(0)
  const [hayMas, setHayMas] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!user) return
    let active = true
    void api.listarComentariosRecientes()
      .then((result) => {
        if (!active) return
        setComentarios(result.comentarios)
        setHayMas(result.hayMas)
      })
      .catch((err: unknown) => { if (active) setError(err instanceof Error ? err.message : 'No se pudieron cargar los comentarios.') })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [user])

  async function cargarMas() {
    const siguiente = pagina + 1
    setLoading(true)
    setError('')
    try {
      const result = await api.listarComentariosRecientes(siguiente)
      setComentarios((actuales) => {
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
    <h2>Comentarios recientes</h2>
    {error && <p className="error-message" role="alert">{error}</p>}
    {loading && comentarios.length === 0 && <p className="muted">Cargando comentarios…</p>}
    {!loading && !error && comentarios.length === 0 && <p className="muted">Todavía no hay comentarios compartidos.</p>}
    {comentarios.length > 0 && <div className="friend-books">{comentarios.map((item) => <article key={item.id}>
      <strong>{item.titulo}</strong>
      <span>{item.amigo} · {'★'.repeat(item.estrellas)}</span>
      {item.comentario && <p>{item.comentario}</p>}
    </article>)}</div>}
    {hayMas && <button type="button" className="button secondary" onClick={() => void cargarMas()} disabled={loading}>{loading ? 'Cargando…' : 'Cargar más comentarios'}</button>}
  </section>
}
