import type { Libro, LibroExterno, LibroFormData, VersionGutenberg } from '../types'
import type { GutenbergLibro } from './gutenbergApi'
import type { LibroOpenLibrary } from './openLibraryApi'
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
    portadaUrl: libro.portadaUrl ?? '',
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

function normalizarClave(texto: string): string {
  return texto.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()
}

export function claveClubLibro(libro: Pick<Libro, 'claveClub' | 'isbn' | 'gutenbergId' | 'titulo' | 'autor'>): string {
  return libro.claveClub?.trim()
    || libro.isbn?.trim()
    || (libro.gutenbergId ? `gutenberg:${libro.gutenbergId}` : `${libro.titulo.trim().toLowerCase()}|${libro.autor.trim().toLowerCase()}`)
}

function versionDesdeGutenberg(externo: GutenbergLibro): VersionGutenberg {
  return {
    id: externo.id,
    titulo: externo.titulo,
    autor: externo.autores.map((autor) => autor.name).join(', '),
    idioma: externo.idioma,
    urlEpub: externo.urlEpub ?? null,
    urlHtml: externo.urlHtml ?? null,
    urlPdf: externo.urlPdf ?? null,
  }
}

function upsertVersionGutenberg(libro: Libro, version: VersionGutenberg): VersionGutenberg[] {
  const versiones = [...(libro.versionesGutenberg ?? [])]
  if (libro.gutenbergId && !versiones.some((actual) => actual.id === libro.gutenbergId)) {
    versiones.unshift({
      id: libro.gutenbergId,
      titulo: libro.titulo,
      autor: libro.autor,
      idioma: libro.idiomaGutenberg ?? 'es',
      urlEpub: libro.gutenbergUrlEpub,
      urlHtml: libro.gutenbergUrlHtml,
    })
  }
  const index = versiones.findIndex((actual) => actual.id === version.id)
  if (index === -1) versiones.push(version)
  else versiones[index] = { ...versiones[index], ...version }
  return versiones
}

function mismoLibro(libro: Libro, titulo: string, autor: string): boolean {
  const tituloBuscado = normalizarClave(titulo)
  const autorBuscado = normalizarClave(autor.split(',')[0] ?? '')
  const tituloExistente = normalizarClave(libro.titulo)
  const autorExistente = normalizarClave(libro.autor.split(',')[0] ?? '')
  return Boolean(tituloBuscado && autorBuscado && tituloBuscado === tituloExistente && autorBuscado === autorExistente)
}

function isbnsCoinciden(libro: Libro, candidatos: Array<string | undefined>): boolean {
  const isbnExistentes = new Set([libro.isbn, ...(libro.isbns ?? [])].map((isbn) => isbn?.replace(/[-\s]/g, '').toUpperCase()).filter(Boolean))
  return candidatos.some((isbn) => Boolean(isbn && isbnExistentes.has(isbn.replace(/[-\s]/g, '').toUpperCase())))
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
  libro.claveClub = claveClubLibro(libro)
  writeStore(KEY, [...libros, libro])
  return libro
}

export async function crearLibroGutenberg(externo: GutenbergLibro): Promise<{ libro: Libro; creado: boolean }> {
  ensureSeed()
  await delay()
  const libros = readStore<Libro[]>(KEY, [])
  const existente = libros.find((libro) => libro.gutenbergId === externo.id || libro.versionesGutenberg?.some((version) => version.id === externo.id))
    ?? libros.find((libro) => isbnsCoinciden(libro, [externo.isbn]))
    ?? libros.find((libro) => mismoLibro(libro, externo.titulo, externo.autores.map((autor) => autor.name).join(', ')))
  if (existente) {
    const version = versionDesdeGutenberg(externo)
    const actualizado: Libro = {
      ...existente,
      isbn: existente.isbn ?? externo.isbn ?? null,
      isbns: [...new Set([...(existente.isbns ?? []), externo.isbn].filter((isbn): isbn is string => Boolean(isbn)))],
      claveClub: existente.claveClub ?? claveClubLibro(existente),
      versionesGutenberg: upsertVersionGutenberg(existente, version),
      gutenbergId: existente.gutenbergId ?? externo.id,
      idiomaGutenberg: existente.idiomaGutenberg ?? externo.idioma,
      gutenbergUrlHtml: existente.gutenbergUrlHtml ?? externo.urlHtml ?? null,
      gutenbergUrlEpub: existente.gutenbergUrlEpub ?? externo.urlEpub ?? null,
    }
    writeStore(KEY, libros.map((libro) => libro.id === existente.id ? actualizado : libro))
    return { libro: actualizado, creado: false }
  }

  const nuevo: Libro = {
    id: uid(),
    creadoEn: nowIso(),
    ...formToLibro(gutenbergToForm(externo)),
    gutenbergId: externo.id,
    idiomaGutenberg: externo.idioma,
    gutenbergUrlHtml: externo.urlHtml ?? null,
    gutenbergUrlEpub: externo.urlEpub ?? null,
    versionesGutenberg: [versionDesdeGutenberg(externo)],
  }
  nuevo.claveClub = claveClubLibro(nuevo)
  writeStore(KEY, [...libros, nuevo])
  return { libro: nuevo, creado: true }
}

export async function crearLibroOpenLibrary(externo: LibroOpenLibrary): Promise<{ libro: Libro; creado: boolean }> {
  ensureSeed()
  await delay()
  const libros = readStore<Libro[]>(KEY, [])
  const existente = libros.find((libro) => libro.openLibraryId === externo.id)
    ?? libros.find((libro) => isbnsCoinciden(libro, [externo.isbn, ...(externo.isbns ?? [])]))
    ?? libros.find((libro) => mismoLibro(libro, externo.titulo, externo.autores.join(', ')))

  const form = emptyForm()
  form.titulo = externo.titulo
  form.autor = externo.autores.join(', ')
  form.isbn = externo.isbn ?? ''
  form.editorial = externo.editorial ?? ''
  form.fechaPublicacion = externo.anioPublicacion ? String(externo.anioPublicacion) : ''
  form.cantidadPaginas = externo.cantidadPaginas ? String(externo.cantidadPaginas) : ''
  form.portadaUrl = externo.portadaUrl ?? ''
  if (existente) {
    const actualizado: Libro = {
      ...existente,
      isbn: existente.isbn ?? externo.isbn ?? null,
      isbns: [...new Set([...(existente.isbns ?? []), ...(externo.isbns ?? []), externo.isbn].filter((isbn): isbn is string => Boolean(isbn)))],
      editorial: existente.editorial ?? externo.editorial ?? null,
      fechaPublicacion: existente.fechaPublicacion ?? (externo.anioPublicacion ? String(externo.anioPublicacion) : null),
      cantidadPaginas: existente.cantidadPaginas ?? externo.cantidadPaginas ?? null,
      portadaUrl: existente.portadaUrl ?? externo.portadaUrl ?? null,
      claveClub: existente.claveClub ?? claveClubLibro(existente),
      openLibraryId: existente.openLibraryId ?? externo.id,
      openLibraryEdiciones: [...new Set([...(existente.openLibraryEdiciones ?? []), ...(externo.ediciones ?? [])])],
      openLibraryIdiomas: [...new Set([...(existente.openLibraryIdiomas ?? []), ...(externo.idiomas ?? [])])],
      openLibraryReadUrl: existente.openLibraryReadUrl ?? externo.urlLectura ?? null,
      openLibraryBorrowUrl: existente.openLibraryBorrowUrl ?? externo.urlPrestamo ?? null,
    }
    writeStore(KEY, libros.map((libro) => libro.id === existente.id ? actualizado : libro))
    return { libro: actualizado, creado: false }
  }

  const nuevo: Libro = {
    id: uid(),
    creadoEn: nowIso(),
    ...formToLibro(form),
    isbns: externo.isbns ?? (externo.isbn ? [externo.isbn] : []),
    openLibraryId: externo.id,
    openLibraryEdiciones: externo.ediciones ?? [],
    openLibraryIdiomas: externo.idiomas ?? [],
    openLibraryReadUrl: externo.urlLectura ?? null,
    openLibraryBorrowUrl: externo.urlPrestamo ?? null,
  }
  nuevo.claveClub = claveClubLibro(nuevo)
  writeStore(KEY, [...libros, nuevo])
  return { libro: nuevo, creado: true }
}

export async function vincularVersionGutenberg(libroId: string, externo: GutenbergLibro): Promise<Libro> {
  await delay()
  const libros = readStore<Libro[]>(KEY, [])
  const index = libros.findIndex((libro) => libro.id === libroId)
  if (index === -1) throw new Error('Libro no encontrado')
  const libro = libros[index]
  const version = versionDesdeGutenberg(externo)
  const actualizado: Libro = {
    ...libro,
    claveClub: libro.claveClub ?? claveClubLibro(libro),
    versionesGutenberg: upsertVersionGutenberg(libro, version),
    gutenbergId: libro.gutenbergId ?? externo.id,
    idiomaGutenberg: libro.idiomaGutenberg ?? externo.idioma,
    gutenbergUrlHtml: libro.gutenbergUrlHtml ?? externo.urlHtml ?? null,
    gutenbergUrlEpub: libro.gutenbergUrlEpub ?? externo.urlEpub ?? null,
  }
  libros[index] = actualizado
  writeStore(KEY, libros)
  return actualizado
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
