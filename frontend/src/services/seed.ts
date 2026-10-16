import type { Anotacion, Lectura, Libro, Sesion } from '../types'
import { readStore, writeStore } from './storage'

function daysAgo(days: number): string {
  const date = new Date()
  date.setDate(date.getDate() - days)
  return date.toISOString()
}

function seedLibros(): Libro[] {
  return [
    {
      id: 'lib-1',
      isbn: '9780307474728',
      titulo: 'Cien años de soledad',
      autor: 'Gabriel García Márquez',
      genero: 'Novela',
      descripcion:
        'La saga de la familia Buendía en el mítico pueblo de Macondo, obra cumbre del realismo mágico latinoamericano.',
      cantidadPaginas: 471,
      editorial: 'Sudamericana',
      fechaPublicacion: '1967',
      portadaUrl: 'https://covers.openlibrary.org/b/isbn/9780307474728-L.jpg',
      creadoEn: daysAgo(40),
    },
    {
      id: 'lib-2',
      isbn: '9780451524935',
      titulo: '1984',
      autor: 'George Orwell',
      genero: 'Ciencia ficción',
      descripcion:
        'Una distopía sobre la vigilancia total y el control del pensamiento en el Estado de Oceanía.',
      cantidadPaginas: 328,
      editorial: 'Secker & Warburg',
      fechaPublicacion: '1949',
      portadaUrl: 'https://covers.openlibrary.org/b/isbn/9780451524935-L.jpg',
      creadoEn: daysAgo(32),
    },
    {
      id: 'lib-3',
      isbn: '9780156012195',
      titulo: 'El principito',
      autor: 'Antoine de Saint-Exupéry',
      genero: 'Fábula',
      descripcion:
        'Un piloto perdido en el desierto conoce a un pequeño príncipe venido de otro planeta.',
      cantidadPaginas: 96,
      editorial: 'Reynal & Hitchcock',
      fechaPublicacion: '1943',
      portadaUrl: 'https://covers.openlibrary.org/b/isbn/9780156012195-L.jpg',
      creadoEn: daysAgo(60),
    },
    {
      id: 'lib-4',
      isbn: '9780441013593',
      titulo: 'Dune',
      autor: 'Frank Herbert',
      genero: 'Ciencia ficción',
      descripcion:
        'La lucha por el control del planeta Arrakis, única fuente de la especia melange.',
      cantidadPaginas: 412,
      editorial: 'Chilton Books',
      fechaPublicacion: '1965',
      portadaUrl: 'https://covers.openlibrary.org/b/isbn/9780441013593-L.jpg',
      creadoEn: daysAgo(20),
    },
    {
      id: 'lib-5',
      isbn: '9780747532699',
      titulo: "Harry Potter and the Philosopher's Stone",
      autor: 'J. K. Rowling',
      genero: 'Fantasía',
      descripcion:
        'Un niño descubre que es mago y comienza su primer año en el colegio Hogwarts.',
      cantidadPaginas: 223,
      editorial: 'Bloomsbury Publishing',
      fechaPublicacion: '1997',
      portadaUrl: 'https://covers.openlibrary.org/b/isbn/9780747532699-L.jpg',
      creadoEn: daysAgo(12),
    },
  ]
}

function seedLecturas(): Lectura[] {
  return [
    {
      id: 'lec-1',
      libroId: 'lib-1',
      formato: 'FISICO',
      estado: 'LEYENDO',
      porcentaje: 42,
      paginaActual: 198,
      totalPaginas: 471,
      ubicacionDigital: null,
      ultimaLectura: daysAgo(1),
      fechaInicio: daysAgo(40),
      fechaFin: null,
    },
    {
      id: 'lec-2',
      libroId: 'lib-2',
      formato: 'EPUB',
      estado: 'LEYENDO',
      porcentaje: 68,
      paginaActual: 223,
      totalPaginas: 328,
      ubicacionDigital: 'epubcfi(/6/14!/4/2/2/1:0)',
      ultimaLectura: daysAgo(2),
      fechaInicio: daysAgo(30),
      fechaFin: null,
    },
    {
      id: 'lec-3',
      libroId: 'lib-2',
      formato: 'FISICO',
      estado: 'PENDIENTE',
      porcentaje: 0,
      paginaActual: 0,
      totalPaginas: 328,
      ubicacionDigital: null,
      ultimaLectura: null,
      fechaInicio: null,
      fechaFin: null,
    },
    {
      id: 'lec-4',
      libroId: 'lib-3',
      formato: 'FISICO',
      estado: 'TERMINADO',
      porcentaje: 100,
      paginaActual: 96,
      totalPaginas: 96,
      ubicacionDigital: null,
      ultimaLectura: daysAgo(15),
      fechaInicio: daysAgo(58),
      fechaFin: daysAgo(15),
    },
    {
      id: 'lec-5',
      libroId: 'lib-4',
      formato: 'PDF',
      estado: 'PENDIENTE',
      porcentaje: 0,
      paginaActual: 1,
      totalPaginas: 412,
      ubicacionDigital: null,
      ultimaLectura: null,
      fechaInicio: null,
      fechaFin: null,
    },
    {
      id: 'lec-6',
      libroId: 'lib-5',
      formato: 'FISICO',
      estado: 'PAUSADO',
      porcentaje: 30,
      paginaActual: 67,
      totalPaginas: 223,
      ubicacionDigital: null,
      ultimaLectura: daysAgo(6),
      fechaInicio: daysAgo(12),
      fechaFin: null,
    },
  ]
}

function seedSesiones(): Sesion[] {
  return [
    { id: 'ses-1', lecturaId: 'lec-1', fecha: daysAgo(3), minutos: 45, paginasLeidas: 32, paginaActual: 166, nota: 'Sesión de tarde' },
    { id: 'ses-2', lecturaId: 'lec-1', fecha: daysAgo(1), minutos: 30, paginasLeidas: 32, paginaActual: 198, nota: null },
    { id: 'ses-3', lecturaId: 'lec-2', fecha: daysAgo(5), minutos: 60, paginasLeidas: 41, paginaActual: 180, nota: null },
    { id: 'ses-4', lecturaId: 'lec-2', fecha: daysAgo(2), minutos: 50, paginasLeidas: 43, paginaActual: 223, nota: 'Muy tenso el final de la primera parte' },
    { id: 'ses-5', lecturaId: 'lec-4', fecha: daysAgo(15), minutos: 40, paginasLeidas: 96, paginaActual: 96, nota: 'Terminado' },
    { id: 'ses-6', lecturaId: 'lec-6', fecha: daysAgo(6), minutos: 25, paginasLeidas: 20, paginaActual: 67, nota: null },
  ]
}

function seedAnotaciones(): Anotacion[] {
  return [
    {
      id: 'ano-1',
      libroId: 'lib-2',
      lecturaId: 'lec-2',
      tipo: 'RESALTADO',
      texto: 'La libertad es poder decir que dos más dos son cuatro.',
      cita: 'La libertad es poder decir que dos más dos son cuatro.',
      ubicacion: 'epubcfi(/6/10!/4/2/2/1:12)',
      porcentaje: 41,
      creadoEn: daysAgo(9),
    },
    {
      id: 'ano-2',
      libroId: 'lib-1',
      lecturaId: 'lec-1',
      tipo: 'NOTA',
      texto: 'Comparar el inicio con la estructura circular de la novela.',
      cita: null,
      ubicacion: null,
      porcentaje: 12,
      creadoEn: daysAgo(20),
    },
    {
      id: 'ano-3',
      libroId: 'lib-3',
      lecturaId: 'lec-4',
      tipo: 'MARCADOR',
      texto: 'Capítulo del zorro',
      cita: null,
      ubicacion: null,
      porcentaje: 55,
      creadoEn: daysAgo(30),
    },
  ]
}

const KEYS = ['libros', 'lecturas', 'sesiones', 'anotaciones', 'archivos'] as const

/** Carga datos de ejemplo la primera vez que se abre la app. */
export function ensureSeed(): void {
  if (readStore<Libro[] | null>('libros', null)) return
  writeStore('libros', seedLibros())
  writeStore('lecturas', seedLecturas())
  writeStore('sesiones', seedSesiones())
  writeStore('anotaciones', seedAnotaciones())
  writeStore('archivos', [])
}

export function resetSeed(): void {
  for (const key of KEYS) {
    window.localStorage.removeItem(`libros-tracker.${key}`)
  }
  ensureSeed()
}
