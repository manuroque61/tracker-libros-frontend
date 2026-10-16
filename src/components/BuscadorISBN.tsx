import { useState, type FormEvent } from 'react'
import type { LibroExterno } from '../types'
import { ApiError, errorMessage } from '../services/apiClient'
import { buscarPorIsbn } from '../services/librosApi'

interface BuscadorISBNProps {
  onResultado: (externo: LibroExterno) => void
  onSinResultado?: () => void
}

export function BuscadorISBN({ onResultado, onSinResultado }: BuscadorISBNProps) {
  const [isbn, setIsbn] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const limpio = isbn.replace(/[^0-9Xx]/g, '')
  const valido = /^(?:\d{13}|\d{9}[\dXx])$/.test(limpio)
  const invalido = limpio.length > 0 && !valido

  async function onSubmit(event: FormEvent) {
    event.preventDefault()
    if (!valido || loading) return
    setLoading(true)
    setError(null)
    try {
      const externo = await buscarPorIsbn(limpio)
      onResultado(externo)
    } catch (err) {
      setError(errorMessage(err))
      if (err instanceof ApiError && err.status === 404) onSinResultado?.()
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <form className="search-form" onSubmit={onSubmit}>
        <input
          type="text"
          inputMode="numeric"
          value={isbn}
          onChange={(event) => setIsbn(event.target.value)}
          placeholder="ISBN-13 o ISBN-10, por ejemplo 9780747532699"
          aria-label="ISBN"
        />
        <button type="submit" disabled={!valido || loading}>
          {loading ? 'Buscando…' : 'Buscar ISBN'}
        </button>
      </form>
      <p className="hint search-hint">
        Consulta Open Library; no guarda nada automáticamente. Podés completar los campos vacíos antes de guardar.
      </p>
      {invalido && <p className="hint search-hint">El ISBN debe tener 13 dígitos o 10 (el último puede ser X).</p>}
      {loading && (
        <p className="muted placeholder">
          <span className="spinner" /> Consultando Open Library…
        </p>
      )}
      {error && <div className="alert">{error}</div>}
    </div>
  )
}
