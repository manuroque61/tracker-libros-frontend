import type { EstadoLectura, FormatoLectura, Lectura, Libro } from '../types'

export interface LibroDTO {
  id: number
  titulo: string
  autor: string
  isbn?: string | null
  genero?: string | null
  descripcion?: string | null
  cantidadPaginas?: number | null
  editorial?: string | null
  fechaPublicacion?: string | null
  portadaUrl?: string | null
  creadoEn?: string | null
}

export interface LecturaRespuestaDTO {
  id: number
  libroId: number
  titulo: string
  autor: string
  portadaUrl: string | null
  formato: FormatoLectura
  estado: EstadoLectura
  paginaActual: number | null
  porcentajeProgreso: number
  ubicacionDigital: string | null
  fechaInicio: string | null
  fechaFinalizacion: string | null
  fechaAgregado: string
}

export function backendId(id: string): number {
  const numero = Number(id)
  if (!/^[1-9]\d*$/.test(id) || !Number.isSafeInteger(numero)) {
    throw new Error('El identificador no corresponde a un recurso del servidor.')
  }
  return numero
}

export function toLibro(dto: LibroDTO): Libro {
  return { ...dto, id: String(dto.id), creadoEn: dto.creadoEn ?? null }
}

export function toLectura(dto: LecturaRespuestaDTO): Lectura {
  return {
    id: String(dto.id), libroId: String(dto.libroId), formato: dto.formato,
    estado: dto.estado, paginaActual: dto.paginaActual,
    porcentaje: dto.porcentajeProgreso, ubicacionDigital: dto.ubicacionDigital,
    fechaInicio: dto.fechaInicio, fechaFin: dto.fechaFinalizacion,
    fechaAgregado: dto.fechaAgregado,
  }
}
