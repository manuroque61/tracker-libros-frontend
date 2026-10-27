import type { Lectura, Libro, Resena } from '../types'

export interface Recomendacion {
  libro: Libro
  motivo: string
}

const PESO_TERMINADO = 2
const PESO_LEYENDO = 1

export function recomendarLibros(
  libros: Libro[],
  lecturas: Lectura[],
  resenas: Resena[],
  limite = 3,
): Recomendacion[] {
  const resenasPorLibro = new Map(resenas.map((resena) => [resena.libroId, resena]))
  const pesosGenero = new Map<string, number>()
  const pesosAutor = new Map<string, number>()

  const sumar = (pesos: Map<string, number>, clave: string | null | undefined, peso: number) => {
    if (!clave) return
    pesos.set(clave, (pesos.get(clave) ?? 0) + peso)
  }

  for (const libro of libros) {
    const lecturasDelLibro = lecturas.filter((lectura) => lectura.libroId === libro.id)
    let peso = resenasPorLibro.get(libro.id)?.estrellas ?? 0
    if (lecturasDelLibro.some((lectura) => lectura.estado === 'TERMINADO')) peso += PESO_TERMINADO
    if (lecturasDelLibro.some((lectura) => lectura.estado === 'LEYENDO')) peso += PESO_LEYENDO
    if (peso === 0) continue
    sumar(pesosGenero, libro.genero, peso)
    sumar(pesosAutor, libro.autor, peso)
  }

  const excluidos = new Set([
    ...lecturas
      .filter((lectura) => lectura.estado === 'TERMINADO' || lectura.estado === 'LEYENDO')
      .map((lectura) => lectura.libroId),
    ...resenas.map((resena) => resena.libroId),
  ])

  return libros
    .filter((libro) => !excluidos.has(libro.id))
    .map((libro) => {
      const pesoGenero = libro.genero ? (pesosGenero.get(libro.genero) ?? 0) : 0
      const pesoAutor = pesosAutor.get(libro.autor) ?? 0
      const motivo =
        pesoAutor > 0
          ? `Más de ${libro.autor}`
          : pesoGenero > 0 && libro.genero
            ? `Porque te gusta ${libro.genero}`
            : 'Para variar tu lectura'
      return { libro, motivo, puntaje: pesoGenero + pesoAutor }
    })
    .sort((a, b) => b.puntaje - a.puntaje || a.libro.titulo.localeCompare(b.libro.titulo))
    .slice(0, limite)
    .map(({ libro, motivo }) => ({ libro, motivo }))
}
