import type { FormatoLectura, Lectura, Libro, LibroExterno, LibroFormData } from '../types'
import { ApiError, apiRequest } from './apiClient'
import { backendId, toLibro, type LibroDTO, type LecturaRespuestaDTO } from '../types/backend'
import { listarTodas } from './lecturasApi'
import { getToken } from './authToken'
import { delay, readStore, writeStore } from './storage'

const KEY = 'libros'

export function emptyForm(): LibroFormData {
  return {
    isbn: '',
    titulo: '',
    autor: '',
    genero: '',
    descripcion: '',
    cantidadPaginas: '',
    editorial: '',
    fechaPublicacion: '',
    portadaUrl: '',
  }
}

export function externoToForm(externo: LibroExterno): LibroFormData {
  return {
    isbn: externo.isbn ?? '',
    titulo: externo.titulo ?? '',
    autor: externo.autor ?? '',
    genero: externo.genero ?? '',
    descripcion: externo.descripcion ?? '',
    cantidadPaginas: externo.cantidadPaginas != null ? String(externo.cantidadPaginas) : '',
    editorial: externo.editorial ?? '',
    fechaPublicacion: externo.fechaPublicacion ?? '',
    portadaUrl: externo.portadaUrl ?? '',
  }
}

export function libroToForm(libro: Libro): LibroFormData {
  return {
    isbn: libro.isbn ?? '',
    titulo: libro.titulo,
    autor: libro.autor,
    genero: libro.genero ?? '',
    descripcion: libro.descripcion ?? '',
    cantidadPaginas: libro.cantidadPaginas != null ? String(libro.cantidadPaginas) : '',
    editorial: libro.editorial ?? '',
    fechaPublicacion: libro.fechaPublicacion ?? '',
    portadaUrl: libro.portadaUrl ?? '',
  }
}

function formToLibro(form: LibroFormData): Omit<Libro, 'id' | 'creadoEn'> {
  const paginas = Number.parseInt(form.cantidadPaginas, 10)
  return {
    isbn: form.isbn.trim() || null,
    titulo: form.titulo.trim(),
    autor: form.autor.trim(),
    genero: form.genero.trim() || null,
    descripcion: form.descripcion.trim() || null,
    cantidadPaginas: Number.isNaN(paginas) ? null : paginas,
    editorial: form.editorial.trim() || null,
    fechaPublicacion: form.fechaPublicacion.trim() || null,
    portadaUrl: form.portadaUrl.trim() || null,
  }
}

/** La búsqueda de ISBN no persiste el libro. */
export function buscarPorIsbn(isbn: string): Promise<LibroExterno> {
  return apiRequest<LibroExterno>(`/api/libros/buscar-isbn/${encodeURIComponent(isbn.trim())}`)
}

/** Sin caché persistente: cada carga vuelve a consultar la biblioteca personal. */
export async function listarLibros(lecturas?: Lectura[]): Promise<Libro[]> {
  const propias = lecturas ?? await listarTodas()
  const ids = [...new Set(propias.map((lectura) => lectura.libroId))]
  const libros = await Promise.all(ids.map(obtenerLibro))
  return libros.filter((libro): libro is Libro => libro !== null)
}

// Solo deduplicamos consultas simultáneas dentro de la misma sesión.
const pendientes = new Map<string, Promise<Libro | null>>()
export function obtenerLibro(id: string): Promise<Libro | null> {
  const numero = backendId(id)
  const key = `${getToken() ?? ''}:${numero}`
  const anterior = pendientes.get(key)
  if (anterior) return anterior
  const request = apiRequest<LibroDTO>(`/api/libros/${numero}`)
    .then(toLibro)
    .catch((error: unknown) => {
      if (error instanceof ApiError && error.status === 404) return null
      throw error
    })
    .finally(() => { pendientes.delete(key) })
  pendientes.set(key, request)
  return request
}

export async function crearLibro(form: LibroFormData, formato: FormatoLectura): Promise<Libro> {
  if (!['FISICO', 'PDF', 'EPUB'].includes(formato)) throw new Error('Seleccioná un formato válido.')
  if (form.cantidadPaginas.trim() && (!/^\d+$/.test(form.cantidadPaginas.trim()) || Number(form.cantidadPaginas) <= 0 || !Number.isSafeInteger(Number(form.cantidadPaginas)))) {
    throw new Error('La cantidad de páginas debe ser un entero positivo.')
  }
  try {
    const propias = await listarTodas()
    // El ISBN identifica el catálogo. Sin ISBN no deduplicamos por título/autor.
    const isbn = form.isbn.replace(/[\s-]/g, '')
    const libros = isbn ? await listarLibros(propias) : []
    const existente = libros.find((libro) => libro.isbn?.replace(/[\s-]/g, '') === isbn)
    if (existente && propias.some((lectura) => lectura.libroId === existente.id && lectura.formato === formato)) {
      throw new ApiError(409, 'Ya tenés este libro en ese formato en tu biblioteca.')
    }
    const lectura = existente
      ? await apiRequest<LecturaRespuestaDTO>('/api/lecturas', {
          method: 'POST', body: JSON.stringify({ libroId: backendId(existente.id), formato }),
        })
      : await apiRequest<LecturaRespuestaDTO>('/api/biblioteca/libros', {
          method: 'POST', body: JSON.stringify({ ...formToLibro(form), formato }),
        })
    const libro = await obtenerLibro(String(lectura.libroId))
    if (!libro) throw new Error('El alta se guardó, pero no se pudo recuperar el libro. Revisá tu biblioteca antes de reintentar.')
    return libro
  } catch (error) {
    if (error instanceof ApiError && error.status === 409) {
      throw new ApiError(409, 'Ya tenés este libro en ese formato en tu biblioteca.')
    }
    throw error
  }
}
export async function actualizarLibro(id: string, form: LibroFormData): Promise<Libro> {
  await delay()
  const libros = readStore<Libro[]>(KEY, [])
  const index = libros.findIndex((libro) => libro.id === id)
  if (index === -1) throw new Error('Libro no encontrado')
  const actualizado: Libro = { ...libros[index], ...formToLibro(form) }
  libros[index] = actualizado
  writeStore(KEY, libros)
  return actualizado
}

export async function eliminarLibro(id: string): Promise<void> {
  await delay()
  writeStore(KEY, readStore<Libro[]>(KEY, []).filter((libro) => libro.id !== id))
}
