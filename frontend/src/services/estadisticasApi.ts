import type { FormatoLectura, Lectura, Sesion } from '../types'
import { FORMATOS } from '../types'
import { ensureSeed } from './seed'
import { readStore } from './storage'

export interface FormatoConteo {
  formato: FormatoLectura
  total: number
}

export interface MesConteo {
  clave: string
  etiqueta: string
  minutos: number
  paginas: number
  sesiones: number
}

export interface Estadisticas {
  totalLibros: number
  terminados: number
  leyendo: number
  pendientes: number
  minutosTotales: number
  paginasLeidas: number
  sesionesTotal: number
  porFormato: FormatoConteo[]
  porMes: MesConteo[]
}

export type FiltroFormato = 'TODOS' | FormatoLectura

function etiquetaMes(date: Date): string {
  return date.toLocaleDateString('es', { month: 'short', year: '2-digit' })
}

function claveMes(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
}

export function obtener(filtro: FiltroFormato = 'TODOS'): Promise<Estadisticas> {
  ensureSeed()
  const todas = readStore<Lectura[]>('lecturas', [])
  const lecturas = filtro === 'TODOS' ? todas : todas.filter((lectura) => lectura.formato === filtro)
  const ids = new Set(lecturas.map((lectura) => lectura.id))
  const sesiones = readStore<Sesion[]>('sesiones', []).filter((sesion) => ids.has(sesion.lecturaId))

  const porFormato = FORMATOS.map((formato) => ({
    formato,
    total: todas.filter((lectura) => lectura.formato === formato).length,
  }))

  const meses = new Map<string, MesConteo>()
  const ahora = new Date()
  for (let i = 5; i >= 0; i -= 1) {
    const date = new Date(ahora.getFullYear(), ahora.getMonth() - i, 1)
    meses.set(claveMes(date), { clave: claveMes(date), etiqueta: etiquetaMes(date), minutos: 0, paginas: 0, sesiones: 0 })
  }
  for (const sesion of sesiones) {
    const key = claveMes(new Date(sesion.fecha))
    const bucket = meses.get(key)
    if (!bucket) continue
    bucket.minutos += sesion.minutos ?? 0
    bucket.paginas += sesion.paginasLeidas ?? 0
    bucket.sesiones += 1
  }

  return Promise.resolve({
    totalLibros: readStore<unknown[]>('libros', []).length,
    terminados: lecturas.filter((lectura) => lectura.estado === 'TERMINADO').length,
    leyendo: lecturas.filter((lectura) => lectura.estado === 'LEYENDO').length,
    pendientes: lecturas.filter((lectura) => lectura.estado === 'PENDIENTE').length,
    minutosTotales: sesiones.reduce((acc, sesion) => acc + (sesion.minutos ?? 0), 0),
    paginasLeidas: sesiones.reduce((acc, sesion) => acc + (sesion.paginasLeidas ?? 0), 0),
    sesionesTotal: sesiones.length,
    porFormato,
    porMes: [...meses.values()],
  })
}
