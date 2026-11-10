export interface LibroOpenLibrary {
  id: string
  titulo: string
  autores: string[]
  portadaUrl?: string
  isbn?: string
  isbns?: string[]
  ediciones?: string[]
  idiomas?: string[]
  editorial?: string
  anioPublicacion?: number
  cantidadPaginas?: number
  urlLectura?: string
  urlPrestamo?: string
  urlCatalogo: string
}

interface RespuestaBusqueda {
  num_found?: number
  numFound?: number
  docs: Array<{
    key: string
    title: string
    author_name?: string[]
    cover_i?: number
    isbn?: string[]
    edition_key?: string[]
    language?: string[]
    publisher?: string[]
    first_publish_year?: number
    number_of_pages_median?: number
    ia?: string[]
    availability?: {
      status?: string
      identifier?: string
      openlibrary_edition?: string
    }
  }>
}

const POR_PAGINA = 20
const cache = new Map<string, Promise<{ libros: LibroOpenLibrary[]; total: number }>>()

export function buscarOpenLibrary(consulta: string, pagina: number, soloPrestables = false) {
  const query = consulta.trim()
  const clave = `${query.toLocaleLowerCase()}|${pagina}|${soloPrestables}`
  let solicitud = cache.get(clave)
  if (!solicitud) {
    const params = new URLSearchParams({
      q: soloPrestables ? `${query} ebook_access:borrowable` : query,
      page: String(pagina),
      limit: String(POR_PAGINA),
      lang: 'es',
      fields: 'key,title,author_name,cover_i,isbn,edition_key,language,publisher,first_publish_year,number_of_pages_median,ia,availability,editions,editions.key,editions.title,editions.ebook_access,editions.language',
    })
    solicitud = fetch(`https://openlibrary.org/search.json?${params}`)
      .then(async (response) => {
        if (!response.ok) throw new Error(`Open Library respondiÃ³ ${response.status}`)
        const data = await response.json() as RespuestaBusqueda
        return {
          total: data.num_found ?? data.numFound ?? 0,
          libros: (data.docs ?? []).map((doc) => ({
            id: doc.key,
            titulo: doc.title,
            autores: doc.author_name ?? [],
            portadaUrl: doc.cover_i ? `https://covers.openlibrary.org/b/id/${doc.cover_i}-M.jpg` : undefined,
            isbn: doc.isbn?.[0],
            isbns: doc.isbn,
            ediciones: doc.edition_key,
            idiomas: doc.language,
            editorial: doc.publisher?.[0],
            anioPublicacion: doc.first_publish_year,
            cantidadPaginas: doc.number_of_pages_median,
            urlLectura: (doc.availability?.status === 'open' && (doc.availability.identifier ?? doc.ia?.[0]))
              ? `https://archive.org/stream/${encodeURIComponent(doc.availability.identifier ?? doc.ia?.[0] ?? '')}?ui=embed`
              : undefined,
            urlPrestamo: (doc.availability?.status === 'borrow_available' && doc.availability.identifier)
              ? `https://openlibrary.org/borrow/ia/${encodeURIComponent(doc.availability.identifier)}`
              : undefined,
            urlCatalogo: doc.availability?.openlibrary_edition
              ? `https://openlibrary.org/books/${encodeURIComponent(doc.availability.openlibrary_edition)}`
              : `https://openlibrary.org${doc.key}`,
          })).filter((libro) => !soloPrestables || Boolean(libro.urlPrestamo)),
        }
      })
    cache.set(clave, solicitud)
  }
  return solicitud.catch((error: unknown) => {
    cache.delete(clave)
    throw error
  })
}

export const OPEN_LIBRARY_POR_PAGINA = POR_PAGINA
