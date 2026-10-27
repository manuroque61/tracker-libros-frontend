export interface Usuario {
  id: number
  nombre: string
  email: string
  fechaRegistro: string
}

export interface AuthResponse {
  accessToken: string
  tokenType: string
  expiresIn: number
  usuario: Usuario
}

export type FormatoLectura = 'FISICO' | 'PDF' | 'EPUB'

export type EstadoLectura = 'PENDIENTE' | 'LEYENDO' | 'PAUSADO' | 'TERMINADO' | 'ABANDONADO'

export const FORMATOS: FormatoLectura[] = ['FISICO', 'PDF', 'EPUB']

export const ESTADOS: EstadoLectura[] = [
  'PENDIENTE',
  'LEYENDO',
  'PAUSADO',
  'TERMINADO',
  'ABANDONADO',
]

export const FORMATO_LABEL: Record<FormatoLectura, string> = {
  FISICO: 'Físico',
  PDF: 'PDF',
  EPUB: 'EPUB',
}

export const ESTADO_LABEL: Record<EstadoLectura, string> = {
  PENDIENTE: 'Pendiente',
  LEYENDO: 'Leyendo',
  PAUSADO: 'Pausado',
  TERMINADO: 'Terminado',
  ABANDONADO: 'Abandonado',
}

export interface Libro {
  id: string
  isbn?: string | null
  titulo: string
  autor: string
  genero?: string | null
  descripcion?: string | null
  cantidadPaginas?: number | null
  editorial?: string | null
  fechaPublicacion?: string | null
  portadaUrl?: string | null
  creadoEn: string
}

export interface Lectura {
  id: string
  libroId: string
  formato: FormatoLectura
  estado: EstadoLectura
  porcentaje: number
  paginaActual?: number | null
  totalPaginas?: number | null
  ubicacionDigital?: string | null
  ultimaLectura?: string | null
  fechaInicio?: string | null
  fechaFin?: string | null
}

export interface Sesion {
  id: string
  lecturaId: string
  fecha: string
  minutos?: number | null
  paginasLeidas?: number | null
  paginaActual?: number | null
  nota?: string | null
}

export interface ArchivoDigital {
  id: string
  libroId: string
  nombre: string
  formato: 'PDF' | 'EPUB'
  tamano: number
  creadoEn: string
}

export type TipoAnotacion = 'NOTA' | 'RESALTADO' | 'MARCADOR'

export const TIPO_ANOTACION_LABEL: Record<TipoAnotacion, string> = {
  NOTA: 'Nota',
  RESALTADO: 'Resaltado',
  MARCADOR: 'Marcador',
}

export interface Anotacion {
  id: string
  libroId: string
  lecturaId?: string | null
  tipo: TipoAnotacion
  texto: string
  cita?: string | null
  ubicacion?: string | null
  porcentaje?: number | null
  creadoEn: string
}

export interface Resena {
  libroId: string
  estrellas: number
  texto: string
  actualizadoEn: string
}

/** Respuesta del endpoint real GET /api/libros/buscar-isbn/{isbn} (LibroExternoDTO). */
export interface LibroExterno {
  isbn: string
  titulo: string
  autor: string
  genero?: string | null
  descripcion?: string | null
  cantidadPaginas?: number | null
  editorial?: string | null
  fechaPublicacion?: string | null
  portadaUrl?: string | null
}

/** Datos editables del formulario de alta (ISBN o manual). */
export interface LibroFormData {
  isbn: string
  titulo: string
  autor: string
  genero: string
  descripcion: string
  cantidadPaginas: string
  editorial: string
  fechaPublicacion: string
  portadaUrl: string
}
