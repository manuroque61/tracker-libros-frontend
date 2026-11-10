import { apiRequest } from './apiClient'

export interface GutenbergAutor {
  name: string
  birth_year?: string
  death_year?: string
}

export interface GutenbergLibro {
  id: string
  titulo: string
  autores: GutenbergAutor[]
  idioma: string
  temas?: string[]
  isbn?: string
  fechaPublicacion?: string
  descripcion?: string
  cantidadPaginas?: string
  portadaUrl?: string
  urlHtml?: string
  urlEpub?: string
  urlPdf?: string
}

interface LibroCatalogoBackend {
  id: string
  titulo: string
  autores?: string[]
  idioma?: string
  temas?: string[] | null
  isbn?: string | null
  fechaPublicacion?: string | null
  descripcion?: string | null
  cantidadPaginas?: string | null
  portadaUrl?: string | null
  urlEpub?: string | null
  urlPdf?: string | null
  coverUrl?: string | null
}

interface PaginaCatalogoBackend {
  libros: LibroCatalogoBackend[]
  haySiguiente: boolean
}

const paginasApi = new Map<string, Promise<PaginaCatalogoBackend>>()

export function portadaGutenbergPorId(id: string): string {
  return `https://www.gutenberg.org/cache/epub/${id}/pg${id}.cover.medium.jpg`
}

function mapear(libro: LibroCatalogoBackend): GutenbergLibro {
  const id = String(libro.id)
  return {
    id,
    titulo: libro.titulo,
    autores: (libro.autores ?? []).map((name) => ({ name })),
    idioma: libro.idioma ?? 'es',
    temas: libro.temas ?? undefined,
    isbn: libro.isbn ?? undefined,
    fechaPublicacion: libro.fechaPublicacion ?? undefined,
    descripcion: libro.descripcion ?? undefined,
    cantidadPaginas: libro.cantidadPaginas ?? undefined,
    portadaUrl: libro.portadaUrl ?? libro.coverUrl ?? portadaGutenbergPorId(id),
    urlHtml: `https://www.gutenberg.org/cache/epub/${id}/pg${id}-images.html`,
    urlEpub: libro.urlEpub ?? undefined,
    urlPdf: libro.urlPdf ?? undefined,
  }
}

async function obtenerCatalogo(idioma: string, busqueda: string, pagina: number): Promise<PaginaCatalogoBackend> {
  const params = new URLSearchParams({ idioma, busqueda: busqueda.trim(), pagina: String(pagina) })
  const url = `/api/gutenberg/buscar?${params}`
  let solicitud = paginasApi.get(url)
  if (!solicitud) {
    solicitud = apiRequest<PaginaCatalogoBackend>(url)
    paginasApi.set(url, solicitud)
  }
  try {
    return await solicitud
  } catch (error) {
    paginasApi.delete(url)
    throw error
  }
}

export async function buscarPaginaGutenberg(
  language = 'es',
  busqueda = '',
  pagina = 1,
): Promise<{ libros: GutenbergLibro[]; hayAnterior: boolean; haySiguiente: boolean }> {
  const resultado = await obtenerCatalogo(language, busqueda, pagina)
  const libros = resultado.libros.map(mapear)
  return {
    libros,
    hayAnterior: pagina > 1,
    haySiguiente: resultado.haySiguiente,
  }
}
