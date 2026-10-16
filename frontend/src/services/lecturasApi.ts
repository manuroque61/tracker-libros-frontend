import type { EstadoLectura, FormatoLectura, Lectura, Sesion } from '../types'
import { ensureSeed } from './seed'
import { delay, nowIso, readStore, uid, writeStore } from './storage'

const LECTURAS = 'lecturas'
const SESIONES = 'sesiones'

export function listarTodas(): Promise<Lectura[]> {
  ensureSeed()
  return Promise.resolve(readStore<Lectura[]>(LECTURAS, []))
}

export function listarPorLibro(libroId: string): Promise<Lectura[]> {
  ensureSeed()
  return Promise.resolve(readStore<Lectura[]>(LECTURAS, []).filter((lectura) => lectura.libroId === libroId))
}

export function obtenerLectura(id: string): Promise<Lectura | null> {
  ensureSeed()
  return Promise.resolve(readStore<Lectura[]>(LECTURAS, []).find((lectura) => lectura.id === id) ?? null)
}

export async function crearLectura(
  libroId: string,
  formato: FormatoLectura,
  totalPaginas: number | null,
): Promise<Lectura> {
  ensureSeed()
  await delay(80)
  const lecturas = readStore<Lectura[]>(LECTURAS, [])
  const nueva: Lectura = {
    id: uid(),
    libroId,
    formato,
    estado: 'PENDIENTE',
    porcentaje: 0,
    paginaActual: formato === 'FISICO' || formato === 'PDF' ? 0 : null,
    totalPaginas,
    ubicacionDigital: null,
    ultimaLectura: null,
    fechaInicio: null,
    fechaFin: null,
  }
  writeStore(LECTURAS, [...lecturas, nueva])
  return nueva
}

export interface ProgresoPatch {
  porcentaje?: number
  paginaActual?: number | null
  totalPaginas?: number | null
  estado?: EstadoLectura
  ubicacionDigital?: string | null
  fechaInicio?: string | null
  fechaFin?: string | null
}

function estadoSegunProgreso(porcentaje: number, actual: EstadoLectura): EstadoLectura {
  if (porcentaje >= 100) return 'TERMINADO'
  if (porcentaje > 0 && (actual === 'PENDIENTE' || actual === 'PAUSADO')) return 'LEYENDO'
  if (porcentaje > 0) return actual === 'TERMINADO' ? 'LEYENDO' : actual
  return actual
}

export async function actualizarProgreso(id: string, patch: ProgresoPatch): Promise<Lectura> {
  await delay(60)
  const lecturas = readStore<Lectura[]>(LECTURAS, [])
  const index = lecturas.findIndex((lectura) => lectura.id === id)
  if (index === -1) throw new Error('Lectura no encontrada')

  const actual = lecturas[index]
  const porcentaje = patch.porcentaje ?? actual.porcentaje
  const estado = patch.estado ?? estadoSegunProgreso(porcentaje, actual.estado)

  const fechaInicio =
    patch.fechaInicio !== undefined
      ? patch.fechaInicio
      : actual.fechaInicio ?? (porcentaje > 0 ? nowIso() : null)
  const fechaFin =
    patch.fechaFin !== undefined
      ? patch.fechaFin
      : estado === 'TERMINADO'
        ? actual.fechaFin ?? nowIso()
        : actual.fechaFin

  const actualizada: Lectura = {
    ...actual,
    ...patch,
    porcentaje,
    estado,
    ultimaLectura: nowIso(),
    fechaInicio,
    fechaFin,
  }
  lecturas[index] = actualizada
  writeStore(LECTURAS, lecturas)
  return actualizada
}

export async function eliminarLectura(id: string): Promise<void> {
  await delay(60)
  writeStore(LECTURAS, readStore<Lectura[]>(LECTURAS, []).filter((lectura) => lectura.id !== id))
  writeStore(SESIONES, readStore<Sesion[]>(SESIONES, []).filter((sesion) => sesion.lecturaId !== id))
}

export interface SesionInput {
  minutos?: number | null
  paginasLeidas?: number | null
  paginaActual?: number | null
  nota?: string | null
}

export async function registrarSesion(lecturaId: string, input: SesionInput): Promise<Sesion> {
  await delay(60)
  const sesiones = readStore<Sesion[]>(SESIONES, [])
  const sesion: Sesion = { id: uid(), lecturaId, fecha: nowIso(), ...input }
  writeStore(SESIONES, [sesion, ...sesiones])
  return sesion
}

export function listarSesiones(lecturaId: string): Promise<Sesion[]> {
  ensureSeed()
  return Promise.resolve(
    readStore<Sesion[]>(SESIONES, [])
      .filter((sesion) => sesion.lecturaId === lecturaId)
      .sort((a, b) => b.fecha.localeCompare(a.fecha)),
  )
}

export function listarTodasSesiones(): Promise<Sesion[]> {
  ensureSeed()
  return Promise.resolve(readStore<Sesion[]>(SESIONES, []))
}
