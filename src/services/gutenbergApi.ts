export interface GutenbergAutor {
  name: string;
  birth_year?: string;
  death_year?: string;
}

export interface GutenbergLibro {
  id: string;
  titulo: string;
  autores: GutenbergAutor[];
  idioma: string;
  temas?: string[];
  isbn?: string;
  fechaPublicacion?: string;
  descripcion?: string;
  cantidadPaginas?: string;
  portadaUrl?: string;
  urlHtml?: string;
  urlEpub?: string;
  urlPdf?: string;
}

function mapearGutenberg(doc: any): GutenbergLibro {
  const formats = doc.formats || {};
  const urlEpub = formats['application/epub+zip'] || undefined;
  const urlHtml = formats['text/html'] || undefined;
  const urlPdf = formats['application/pdf'] || undefined;
  const portadaUrl = formats['image/jpeg'] || doc.cover || undefined;

  const autores = (doc.authors || []).map((a: any) => ({
    name: a.name,
    birth_year: a.birth_year,
    death_year: a.death_year,
  }));

  return {
    id: String(doc.id),
    titulo: doc.title,
    autores,
    idioma: Array.isArray(doc.languages) && doc.languages[0] ? doc.languages[0] : 'es',
    temas: doc.subjects || undefined,
    isbn: Array.isArray(doc.isbn) && doc.isbn[0] ? doc.isbn[0] : undefined,
    fechaPublicacion: doc.publication_date || undefined,
    descripcion: undefined,
    cantidadPaginas: undefined,
    portadaUrl,
    urlHtml,
    urlEpub,
    urlPdf,
  };
}

const LIBROS_POR_PAGINA = 8;
const paginasApi = new Map<string, Promise<{ results: any[]; next: string | null }>>();

async function obtenerPaginaApi(url: string) {
  let solicitud = paginasApi.get(url);
  if (!solicitud) {
    solicitud = fetch(url, { mode: 'cors' }).then(async (response) => {
      if (!response.ok) throw new Error(`Gutendex respondió ${response.status}`);
      const json = await response.json();
      return { results: json.results ?? [], next: json.next ?? null };
    });
    paginasApi.set(url, solicitud);
  }
  try {
    return await solicitud;
  } catch (error) {
    paginasApi.delete(url);
    throw error;
  }
}

export async function buscarPaginaGutenberg(
  language = 'es',
  busqueda = '',
  pagina = 1
): Promise<{ libros: GutenbergLibro[]; hayAnterior: boolean; haySiguiente: boolean }> {
  const params = new URLSearchParams({ languages: language, page: String(Math.ceil(pagina / 4)) });
  const query = busqueda.trim();
  if (query) params.set('search', query);
  const respuesta = await obtenerPaginaApi(`https://gutendex.com/books/?${params}`);
  const indiceEnPaginaApi = ((pagina - 1) % 4) * LIBROS_POR_PAGINA;
  const resultados = respuesta.results.slice(indiceEnPaginaApi, indiceEnPaginaApi + LIBROS_POR_PAGINA);
  const haySiguiente = indiceEnPaginaApi + resultados.length < respuesta.results.length || Boolean(respuesta.next);
  return {
    libros: resultados.map(mapearGutenberg),
    hayAnterior: pagina > 1,
    haySiguiente,
  };
}
