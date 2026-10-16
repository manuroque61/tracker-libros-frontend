import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { BookCover } from '../components/BookCover'
import { BuscadorISBN } from '../components/BuscadorISBN'
import { errorMessage } from '../services/apiClient'
import { crearLibro, emptyForm, externoToForm } from '../services/librosApi'
import type { LibroExterno, LibroFormData } from '../types'

type Pestana = 'isbn' | 'manual'

export default function AgregarLibro() {
  const navigate = useNavigate()
  const [tab, setTab] = useState<Pestana>('isbn')
  const [form, setForm] = useState<LibroFormData>(() => emptyForm())
  const [mostrarForm, setMostrarForm] = useState(false)
  const [sinResultado, setSinResultado] = useState(false)
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function actualizar<K extends keyof LibroFormData>(campo: K, valor: LibroFormData[K]) {
    setForm((previo) => ({ ...previo, [campo]: valor }))
  }

  function onResultado(externo: LibroExterno) {
    setForm(externoToForm(externo))
    setMostrarForm(true)
    setSinResultado(false)
    setError(null)
  }

  function irManual() {
    setTab('manual')
    setMostrarForm(true)
    setSinResultado(false)
    setError(null)
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault()
    if (!form.titulo.trim() || !form.autor.trim()) {
      setError('El título y el autor son obligatorios.')
      return
    }
    setGuardando(true)
    setError(null)
    try {
      const libro = await crearLibro(form)
      navigate(`/libro/${libro.id}`)
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setGuardando(false)
    }
  }

  const editable = tab === 'manual' || mostrarForm

  return (
    <section>
      <header className="page-header">
        <h1>Agregar libro</h1>
        <p className="muted">
          Buscá por ISBN en Open Library para prellenar los datos, o cargá el libro manualmente. La búsqueda no guarda
          nada: vos confirmás.
        </p>
      </header>

      <div className="tabs" role="tablist">
        <button
          type="button"
          role="tab"
          aria-selected={tab === 'isbn'}
          className={`tab${tab === 'isbn' ? ' tab-active' : ''}`}
          onClick={() => setTab('isbn')}
        >
          Buscar por ISBN
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === 'manual'}
          className={`tab${tab === 'manual' ? ' tab-active' : ''}`}
          onClick={irManual}
        >
          Carga manual
        </button>
      </div>

      {tab === 'isbn' && (
        <div className="tab-panel">
          <BuscadorISBN onResultado={onResultado} onSinResultado={() => setSinResultado(true)} />
          {sinResultado && (
            <div className="alert">
              No encontramos ese ISBN en Open Library. Podés completar los datos a mano.{' '}
              <button type="button" className="link" onClick={irManual}>
                Ir a carga manual
              </button>
            </div>
          )}
        </div>
      )}

      {editable && (
        <form className="form libro-form" onSubmit={onSubmit}>
          <div className="form-grid">
            <div className="form-fields">
              <label htmlFor="f-isbn">ISBN</label>
              <input id="f-isbn" value={form.isbn} onChange={(event) => actualizar('isbn', event.target.value)} />

              <label htmlFor="f-titulo">Título *</label>
              <input id="f-titulo" value={form.titulo} onChange={(event) => actualizar('titulo', event.target.value)} required />

              <label htmlFor="f-autor">Autor *</label>
              <input id="f-autor" value={form.autor} onChange={(event) => actualizar('autor', event.target.value)} required />

              <label htmlFor="f-genero">Género</label>
              <input id="f-genero" value={form.genero} onChange={(event) => actualizar('genero', event.target.value)} />

              <label htmlFor="f-paginas">Cantidad de páginas</label>
              <input
                id="f-paginas"
                inputMode="numeric"
                value={form.cantidadPaginas}
                onChange={(event) => actualizar('cantidadPaginas', event.target.value)}
              />

              <label htmlFor="f-editorial">Editorial</label>
              <input id="f-editorial" value={form.editorial} onChange={(event) => actualizar('editorial', event.target.value)} />

              <label htmlFor="f-fecha">Fecha de publicación</label>
              <input id="f-fecha" value={form.fechaPublicacion} onChange={(event) => actualizar('fechaPublicacion', event.target.value)} />

              <label htmlFor="f-portada">URL de portada</label>
              <input id="f-portada" value={form.portadaUrl} onChange={(event) => actualizar('portadaUrl', event.target.value)} />

              <label htmlFor="f-desc">Descripción</label>
              <textarea
                id="f-desc"
                rows={4}
                value={form.descripcion}
                onChange={(event) => actualizar('descripcion', event.target.value)}
              />
            </div>

            <aside className="form-preview">
              <BookCover src={form.portadaUrl || undefined} title={form.titulo || 'Vista previa'} />
              <p className="muted preview-title">{form.titulo || 'Sin título'}</p>
              <p className="authors">{form.autor || 'Autor desconocido'}</p>
            </aside>
          </div>

          <p className="hint">
            Los campos vacíos quedan sin completar; no se inventan datos. El título y el autor son obligatorios.
          </p>
          {error && <div className="alert">{error}</div>}

          <div className="form-actions">
            <button type="submit" disabled={guardando}>
              {guardando ? 'Guardando…' : 'Guardar libro'}
            </button>
          </div>
        </form>
      )}
    </section>
  )
}
