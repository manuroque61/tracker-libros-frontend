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
  urlEpub?: string;
  urlPdf?: string;
}

const LIBROS_EJEMPLO: GutenbergLibro[] = [
  {
    id: '1342',
    titulo: 'Orgullo y prejuicio',
    autores: [{ name: 'Jane Austen' }],
    idioma: 'es',
    temas: ['Amor', 'Clásicos'],
    isbn: undefined,
    fechaPublicacion: '1813',
    descripcion: 'Novela de Jane Austen publicada en 1813.',
    cantidadPaginas: undefined,
    portadaUrl: 'https://www.gutenberg.org/cache/epub/1342/pg1342.cover.medium.jpg',
    urlEpub: 'https://www.gutenberg.org/cache/epub/1342/pg1342.epub',
    urlPdf: undefined,
  },
  {
    id: '11',
    titulo: 'Alicia en el país de las maravillas',
    autores: [{ name: 'Lewis Carroll' }],
    idioma: 'es',
    temas: ['Fantasía', 'Infantil'],
    isbn: undefined,
    fechaPublicacion: '1865',
    descripcion: 'Obra clásica de Lewis Carroll.',
    cantidadPaginas: undefined,
    portadaUrl: 'https://www.gutenberg.org/cache/epub/11/pg11.cover.medium.jpg',
    urlEpub: 'https://www.gutenberg.org/cache/epub/11/pg11.epub',
    urlPdf: undefined,
  },
  {
    id: '84',
    titulo: 'Frankenstein',
    autores: [{ name: 'Mary Shelley' }],
    idioma: 'es',
    temas: ['Terror', 'Ciencia ficción'],
    isbn: undefined,
    fechaPublicacion: '1818',
    descripcion: 'Novela gótica de Mary Shelley.',
    cantidadPaginas: undefined,
    portadaUrl: 'https://www.gutenberg.org/cache/epub/84/pg84.cover.medium.jpg',
    urlEpub: 'https://www.gutenberg.org/cache/epub/84/pg84.epub',
    urlPdf: undefined,
  },
  {
    id: '2701',
    titulo: 'Moby Dick',
    autores: [{ name: 'Herman Melville' }],
    idioma: 'es',
    temas: ['Aventura', 'Mar'],
    isbn: undefined,
    fechaPublicacion: '1851',
    descripcion: 'Novela de Herman Melville sobre la caza de ballenas.',
    cantidadPaginas: undefined,
    portadaUrl: 'https://www.gutenberg.org/cache/epub/2701/pg2701.cover.medium.jpg',
    urlEpub: 'https://www.gutenberg.org/cache/epub/2701/pg2701.epub',
    urlPdf: undefined,
  },
];

function mapearGutenberg(doc: any): GutenbergLibro {
  const formats = doc.formats || {};
  const urlEpub = formats['application/epub+zip'] || undefined;
  const urlPdf = formats['application/pdf'] || undefined;
  const portadaUrl = doc.cover || undefined;

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
    urlEpub,
    urlPdf,
  };
}

export async function listarTodosLosLibrosGutenberg(language = 'es'): Promise<GutenbergLibro[]> {
  const resultados: GutenbergLibro[] = [];
  const LIMITE_POR_PAGINA = 200;
  let offset = 0;
  let masLibros = true;

  while (masLibros && offset < 10000) {
    const params = new URLSearchParams({ language, limit: String(LIMITE_POR_PAGINA), offset: String(offset) });
    const response = await fetch(`https://gutendex.com/books?${params}`, { mode: 'cors' });
    if (!response.ok) break;
    const json = await response.json();
    const librosPagina = (json.results || []).map(mapearGutenberg);
    resultados.push(...librosPagina);
    if (librosPagina.length < LIMITE_POR_PAGINA) break;
    offset += LIMITE_POR_PAGINA;
  }

  return resultados;
}

export async function listarLibrosGutenberg(
  language = 'es',
  busqueda = ''
): Promise<GutenbergLibro[]> {
  try {
    const resultados = await listarTodosLosLibrosGutenberg(language);
    const textoBusqueda = busqueda.toLowerCase();
    if (textoBusqueda) {
      return resultados.filter((libro) => {
        const texto = `${libro.titulo} ${libro.autores.map((a) => a.name).join(' ')} ${libro.temas?.join(' ') ?? ''}`.toLowerCase();
        return texto.includes(textoBusqueda);
      });
    }
    return resultados;
  } catch {
    const textoBusqueda = busqueda.toLowerCase();
    return LIBROS_EJEMPLO.filter((libro) => {
      if (!textoBusqueda) return true;
      const texto = `${libro.titulo} ${libro.autores.map((a) => a.name).join(' ')} ${libro.temas?.join(' ') ?? ''}`.toLowerCase();
      return texto.includes(textoBusqueda);
    });
  }
}

export function obtenerLibroPorId(id: string): Promise<GutenbergLibro | null> {
  return listarLibrosGutenberg().then((libros) =>
    libros.find((l) => l.id === id) || null
  );
}
