import type { Libro, LibroExterno, LibroFormData } from '../types'
import type { GutenbergLibro } from './gutenbergApi'
import { apiRequest } from './apiClient'
import { ensureSeed } from './seed'
import { delay, nowIso, readStore, uid, writeStore } from './storage'

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

export function gutenbergToForm(libro: GutenbergLibro): LibroFormData {
  return {
    isbn: libro.isbn ?? '',
    titulo: libro.titulo,
    autor: libro.autores.map((a) => a.name).join(', '),
    genero: (libro.temas ?? []).join(', '),
    descripcion: libro.descripcion ?? '',
    cantidadPaginas: '',
    editorial: '',
    fechaPublicacion: libro.fechaPublicacion ?? '',
    portadaUrl: '',
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

/** GET /api/libros/buscar-isbn/{isbn} — único endpoint real del backend oficial. */
export function buscarPorIsbn(isbn: string): Promise<LibroExterno> {
  return apiRequest<LibroExterno>(`/api/libros/buscar-isbn/${encodeURIComponent(isbn.trim())}`)
}

export async function listarLibros(): Promise<Libro[]> {
  ensureSeed()
  await delay()
  return readStore<Libro[]>(KEY, []).sort((a, b) => b.creadoEn.localeCompare(a.creadoEn))
}

export async function obtenerLibro(id: string): Promise<Libro | null> {
  ensureSeed()
  await delay(80)
  return readStore<Libro[]>(KEY, []).find((libro) => libro.id === id) ?? null
}

export async function crearLibro(form: LibroFormData): Promise<Libro> {
  ensureSeed()
  await delay()
  const libros = readStore<Libro[]>(KEY, [])
  const libro: Libro = { id: uid(), creadoEn: nowIso(), ...formToLibro(form) }
  writeStore(KEY, [...libros, libro])
  return libro
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
